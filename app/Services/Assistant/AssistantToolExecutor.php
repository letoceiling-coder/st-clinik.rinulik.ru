<?php

namespace App\Services\Assistant;

use App\Models\AssistantConversation;
use App\Models\City;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Filters\ClinicFilters;
use App\Services\SlotAvailabilityService;
use App\Support\Text;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Выполнение инструментов ассистента. Только опубликованные клиники и врачи.
 *
 * @phpstan-type Link array{label: string, url: string}
 */
class AssistantToolExecutor
{
    /** @var list<Link> */
    private array $links = [];

    public function __construct(
        private readonly ClinicRepository $clinics,
        private readonly SlotAvailabilityService $slots,
        private readonly AssistantKbSearchService $kbSearch,
        private readonly AssistantLeadService $assistantLeads,
    ) {}

    /** @return list<Link> */
    public function consumeLinks(): array
    {
        $links = $this->links;
        $this->links = [];

        return $links;
    }

    /**
     * @param  array<string, mixed>  $arguments
     */
    public function run(string $name, array $arguments, City $city, ?AssistantConversation $conversation = null): string
    {
        return match ($name) {
            'search_clinics' => $this->searchClinics($city, $arguments),
            'get_clinic' => $this->getClinic($city, $arguments),
            'search_doctors' => $this->searchDoctors($city, $arguments),
            'get_available_days' => $this->getAvailableDays($city, $arguments),
            'get_slots' => $this->getSlots($city, $arguments),
            'search_knowledge' => $this->searchKnowledge($city, $arguments),
            'create_lead' => $this->createLead($conversation, $arguments),
            default => json_encode(['error' => 'unknown_tool'], JSON_UNESCAPED_UNICODE),
        };
    }

    /** @param  array<string, mixed>  $arguments */
    private function createLead(?AssistantConversation $conversation, array $arguments): string
    {
        if ($conversation === null) {
            return json_encode(['error' => 'no_conversation'], JSON_UNESCAPED_UNICODE);
        }

        if (! filter_var($arguments['consent'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            return json_encode([
                'error' => 'consent_required',
                'message' => 'Нужно явное согласие на обработку персональных данных (кнопка в чате или подтверждение пользователя).',
            ], JSON_UNESCAPED_UNICODE);
        }

        try {
            $payload = [
                'name' => (string) ($arguments['name'] ?? ''),
                'phone' => (string) ($arguments['phone'] ?? ''),
                'comment' => $arguments['comment'] ?? null,
                'broadcast' => filter_var($arguments['broadcast'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'consent' => true,
            ];
            if (! empty($arguments['clinic'])) {
                $payload['clinic'] = (string) $arguments['clinic'];
            }

            $result = $this->assistantLeads->create($conversation, $payload, null);

            return json_encode([
                'ok' => true,
                'lead_id' => $result['lead']->id,
                'message' => $result['message'],
            ], JSON_UNESCAPED_UNICODE);
        } catch (ValidationException $e) {
            return json_encode([
                'error' => 'validation_failed',
                'messages' => $e->errors(),
            ], JSON_UNESCAPED_UNICODE);
        }
    }

    /** @param  array<string, mixed>  $arguments */
    private function searchClinics(City $city, array $arguments): string
    {
        $query = trim((string) ($arguments['query'] ?? ''));
        if ($query === '') {
            return json_encode(['clinics' => [], 'message' => 'empty_query'], JSON_UNESCAPED_UNICODE);
        }

        $limit = max(1, min(8, (int) ($arguments['limit'] ?? 5)));
        $filters = ClinicFilters::fromArray(['q' => $query], $city->id);
        $page = $this->clinics->paginate($filters, $limit);

        $items = [];
        foreach ($page->getCollection() as $clinic) {
            /** @var Clinic $clinic */
            $url = route('clinics.show', $clinic->slug);
            $this->links[] = ['label' => $clinic->name, 'url' => $url];
            $items[] = [
                'slug' => $clinic->slug,
                'name' => $clinic->name,
                'rating' => (float) $clinic->rating,
                'reviews_count' => (int) $clinic->reviews_count,
                'address' => $clinic->address,
                'url' => $url,
            ];
        }

        return json_encode(['city' => $city->name, 'query' => $query, 'clinics' => $items], JSON_UNESCAPED_UNICODE);
    }

    /** @param  array<string, mixed>  $arguments */
    private function getClinic(City $city, array $arguments): string
    {
        $slug = trim((string) ($arguments['slug'] ?? ''));
        if ($slug === '') {
            return json_encode(['error' => 'missing_slug'], JSON_UNESCAPED_UNICODE);
        }

        $clinic = $this->publishedClinic($city, $slug);
        if ($clinic === null) {
            return json_encode(['error' => 'not_found', 'slug' => $slug], JSON_UNESCAPED_UNICODE);
        }

        $url = route('clinics.show', $clinic->slug);
        $this->links[] = ['label' => $clinic->name, 'url' => $url];

        $services = $clinic->clinicServices()
            ->with('service:id,name')
            ->where('price_from', '>', 0)
            ->orderBy('price_from')
            ->limit(8)
            ->get();

        return json_encode([
            'slug' => $clinic->slug,
            'name' => $clinic->name,
            'rating' => (float) $clinic->rating,
            'address' => $clinic->address,
            'url' => $url,
            'booking_url' => route('booking.create', $clinic->slug),
            'services_sample' => $services->map(fn ($row) => [
                'service_id' => $row->service_id,
                'name' => $row->service?->name,
                'price_from' => $row->price_from !== null ? Text::money((int) $row->price_from) : null,
                'price_to' => $row->price_to !== null ? Text::money((int) $row->price_to) : null,
            ])->values()->all(),
        ], JSON_UNESCAPED_UNICODE);
    }

    /** @param  array<string, mixed>  $arguments */
    private function searchDoctors(City $city, array $arguments): string
    {
        $query = trim((string) ($arguments['query'] ?? ''));
        if ($query === '' || mb_strlen($query) < 2) {
            return json_encode(['doctors' => []], JSON_UNESCAPED_UNICODE);
        }

        $limit = max(1, min(8, (int) ($arguments['limit'] ?? 5)));
        $tokens = (new ClinicFilters(q: $query))->tokens();
        $doctorQuery = Doctor::published()
            ->with('clinic:id,name,slug,city_id')
            ->whereHas('clinic', fn ($c) => $c->published()->where('city_id', $city->id));

        foreach ($tokens as $token) {
            $doctorQuery->whereLike('doctors.search_text', '%'.$token.'%');
        }

        $doctors = $doctorQuery->orderByDesc('rating')->limit($limit)->get();
        $items = [];
        foreach ($doctors as $doctor) {
            $url = route('doctors.show', $doctor->slug);
            $this->links[] = ['label' => $doctor->name, 'url' => $url];
            $items[] = [
                'id' => $doctor->id,
                'name' => $doctor->name,
                'position' => $doctor->position,
                'clinic' => $doctor->clinic?->name,
                'clinic_slug' => $doctor->clinic?->slug,
                'rating' => (float) $doctor->rating,
                'url' => $url,
            ];
        }

        return json_encode(['city' => $city->name, 'doctors' => $items], JSON_UNESCAPED_UNICODE);
    }

    /** @param  array<string, mixed>  $arguments */
    private function getAvailableDays(City $city, array $arguments): string
    {
        $clinic = $this->publishedClinic($city, (string) ($arguments['slug'] ?? ''));
        if ($clinic === null) {
            return json_encode(['error' => 'not_found'], JSON_UNESCAPED_UNICODE);
        }

        $doctorId = isset($arguments['doctor_id']) ? (int) $arguments['doctor_id'] : null;
        $serviceId = isset($arguments['service_id']) ? (int) $arguments['service_id'] : null;
        $days = max(1, min(21, (int) ($arguments['days'] ?? 14)));

        if ($doctorId && ! $this->slots->doctorWorksAt($clinic, $doctorId)) {
            return json_encode(['error' => 'doctor_not_in_clinic'], JSON_UNESCAPED_UNICODE);
        }

        $payload = $this->slots->availableDays($clinic, $doctorId, $serviceId, today(), $days);

        return json_encode([
            'clinic' => $clinic->slug,
            'days' => $payload,
            'booking_url' => route('booking.create', $clinic->slug),
        ], JSON_UNESCAPED_UNICODE);
    }

    /** @param  array<string, mixed>  $arguments */
    private function getSlots(City $city, array $arguments): string
    {
        $clinic = $this->publishedClinic($city, (string) ($arguments['slug'] ?? ''));
        if ($clinic === null) {
            return json_encode(['error' => 'not_found'], JSON_UNESCAPED_UNICODE);
        }

        $dateStr = trim((string) ($arguments['date'] ?? ''));
        try {
            $date = Carbon::createFromFormat('Y-m-d', $dateStr);
        } catch (\Throwable) {
            return json_encode(['error' => 'invalid_date'], JSON_UNESCAPED_UNICODE);
        }

        $doctorId = isset($arguments['doctor_id']) ? (int) $arguments['doctor_id'] : null;
        $serviceId = isset($arguments['service_id']) ? (int) $arguments['service_id'] : null;

        if ($doctorId && ! $this->slots->doctorWorksAt($clinic, $doctorId)) {
            return json_encode(['error' => 'doctor_not_in_clinic'], JSON_UNESCAPED_UNICODE);
        }

        $daySlots = $this->slots->slotsForDay($clinic, $doctorId, $serviceId, $date);

        return json_encode([
            'clinic' => $clinic->slug,
            'date' => $date->toDateString(),
            'duration_min' => $this->slots->durationFor($clinic, $serviceId),
            'slots' => array_slice($daySlots, 0, 24),
            'booking_url' => route('booking.create', $clinic->slug).'?date='.$date->toDateString(),
        ], JSON_UNESCAPED_UNICODE);
    }

    /** @param  array<string, mixed>  $arguments */
    private function searchKnowledge(City $city, array $arguments): string
    {
        $query = trim((string) ($arguments['query'] ?? ''));
        if ($query === '' || mb_strlen($query) < 2) {
            return json_encode(['entries' => []], JSON_UNESCAPED_UNICODE);
        }

        $limit = max(1, min(5, (int) ($arguments['limit'] ?? 3)));
        $entries = $this->kbSearch->search($city, $query, $limit);

        return json_encode(['entries' => $entries], JSON_UNESCAPED_UNICODE);
    }

    private function publishedClinic(City $city, string $slug): ?Clinic
    {
        $slug = trim($slug);
        if ($slug === '') {
            return null;
        }

        return Clinic::query()->published()->where('slug', $slug)->where('city_id', $city->id)->first();
    }
}
