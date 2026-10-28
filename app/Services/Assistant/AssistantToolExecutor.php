<?php

namespace App\Services\Assistant;

use App\Models\AssistantConversation;
use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicService;
use App\Models\Concern;
use App\Models\District;
use App\Models\Doctor;
use App\Models\Service;
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

    /** @var list<array{slug: string, name: string}> Клиники, показанные пользователю в этом ответе (память диалога). */
    private array $shownClinics = [];

    private bool $leadCreated = false;

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

    /** @return list<array{slug: string, name: string}> */
    public function consumeShownClinics(): array
    {
        $clinics = $this->shownClinics;
        $this->shownClinics = [];

        return $clinics;
    }

    public function consumeLeadCreated(): bool
    {
        $created = $this->leadCreated;
        $this->leadCreated = false;

        return $created;
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

            $result = $this->assistantLeads->create($conversation, $payload, $conversation->user);
            $this->leadCreated = true;

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

    /**
     * Подбор клиник: запрос сопоставляется с услугой или симптомом каталога, затем применяются фильтры.
     * Если по услуге ничего нет — ищем по названию/метро/району, а затем показываем лучшие клиники города.
     *
     * @param  array<string, mixed>  $arguments
     */
    private function searchClinics(City $city, array $arguments): string
    {
        $query = trim((string) ($arguments['query'] ?? ''));
        $limit = max(1, min(6, (int) ($arguments['limit'] ?? 4)));

        $service = $query !== '' ? $this->matchService($query) : null;
        $specialtySlug = $service === null && $query !== '' ? $this->matchSpecialty($query) : null;
        $district = $this->matchDistrict($city, (string) ($arguments['district'] ?? ''));

        $base = array_filter([
            'district' => $district?->slug,
            'price_max' => isset($arguments['max_price']) && is_numeric($arguments['max_price']) ? (int) $arguments['max_price'] : null,
            'rating_min' => isset($arguments['rating_min']) && is_numeric($arguments['rating_min']) ? (float) $arguments['rating_min'] : null,
            'children' => filter_var($arguments['children'] ?? false, FILTER_VALIDATE_BOOLEAN) ? '1' : null,
            'sort' => in_array($arguments['sort'] ?? null, ['rating', 'reviews', 'price_asc'], true) ? $arguments['sort'] : null,
        ], fn ($v) => $v !== null);

        $attempts = [];
        if ($service !== null) {
            $attempts[] = ['match' => 'service', 'filters' => $base + ['service' => $service->slug]];
        } elseif ($specialtySlug !== null) {
            $attempts[] = ['match' => 'specialty', 'filters' => $base + ['specialty' => $specialtySlug]];
        } elseif ($query !== '') {
            $attempts[] = ['match' => 'text', 'filters' => $base + ['q' => $query]];
        }
        $attempts[] = ['match' => 'city_best', 'filters' => $base + ['sort' => $base['sort'] ?? 'rating']];
        if ($base !== []) {
            $attempts[] = ['match' => 'city_best_without_filters', 'filters' => ['sort' => 'rating']];
        }

        $matched = 'none';
        $page = null;
        foreach ($attempts as $attempt) {
            $page = $this->clinics->paginate(ClinicFilters::fromArray($attempt['filters'], $city->id), $limit);
            if ($page->total() > 0) {
                $matched = $attempt['match'];
                break;
            }
        }

        $collection = $page?->getCollection() ?? collect();
        $prices = $service !== null && $collection->isNotEmpty()
            ? ClinicService::query()
                ->whereIn('clinic_id', $collection->pluck('id'))
                ->where('service_id', $service->id)
                ->get()
                ->keyBy('clinic_id')
            : collect();

        $items = [];
        foreach ($collection as $clinic) {
            /** @var Clinic $clinic */
            $url = route('clinics.show', $clinic->slug);
            $this->rememberClinic($clinic, $url);
            $price = $prices->get($clinic->id);
            $items[] = array_filter([
                'slug' => $clinic->slug,
                'name' => $clinic->name,
                'rating' => round((float) $clinic->rating, 1),
                'reviews_count' => (int) $clinic->reviews_count,
                'address' => $clinic->address,
                'metro' => $clinic->metro,
                'district' => $clinic->district?->name,
                'service_price' => $price !== null && $price->price_from ? $this->priceLabel((int) $price->price_from, $price->price_to ? (int) $price->price_to : null) : null,
                'min_price' => $clinic->min_price ? 'от '.Text::money((int) $clinic->min_price) : null,
                'features' => $this->features($clinic),
                'url' => $url,
                'booking_url' => route('booking.create', $clinic->slug).($service !== null ? '?service='.$service->id : ''),
            ], fn ($v) => $v !== null && $v !== '' && $v !== []);
        }

        return json_encode([
            'city' => $city->name,
            'query' => $query,
            'matched_by' => $matched,
            'service' => $service ? ['id' => $service->id, 'name' => $service->name] : null,
            'district' => $district?->name,
            'total_found' => $page?->total() ?? 0,
            'clinics' => $items,
            'catalog_url' => route('city.clinics', $city->slug).($service !== null ? '?service='.$service->slug : ''),
            'note' => match ($matched) {
                'city_best', 'city_best_without_filters' => 'Точных совпадений нет — это лучшие клиники города по рейтингу. Скажи об этом пользователю честно.',
                default => null,
            },
        ], JSON_UNESCAPED_UNICODE);
    }

    /** Услуга каталога по словам пользователя: сначала прямое совпадение названия, затем «что беспокоит». */
    private function matchService(string $query): ?Service
    {
        $tokens = (new ClinicFilters(q: $query))->tokens();
        if ($tokens === []) {
            return null;
        }

        $direct = Service::query()->where('is_active', true);
        foreach ($tokens as $token) {
            $direct->whereLike('search_text', '%'.$token.'%');
        }
        $service = $direct->orderBy('id')->first();
        if ($service !== null) {
            return $service;
        }

        $concern = Concern::query()->where('is_active', true);
        foreach ($tokens as $token) {
            $concern->whereLike('search_text', '%'.$token.'%');
        }

        return $concern->first()?->services()->where('is_active', true)->orderBy('services.id')->first();
    }

    private function matchSpecialty(string $query): ?string
    {
        $tokens = (new ClinicFilters(q: $query))->tokens();
        if ($tokens === []) {
            return null;
        }

        $concern = Concern::query()->where('is_active', true);
        foreach ($tokens as $token) {
            $concern->whereLike('search_text', '%'.$token.'%');
        }

        return $concern->with('specialty:id,slug')->first()?->specialty?->slug;
    }

    private function matchDistrict(City $city, string $name): ?District
    {
        $name = trim($name);
        if (mb_strlen($name) < 3) {
            return null;
        }

        return District::query()
            ->where('city_id', $city->id)
            ->where(fn ($q) => $q->whereLike('name', '%'.$name.'%')->orWhere('slug', $name))
            ->first();
    }

    private function rememberClinic(Clinic $clinic, string $url): void
    {
        $this->links[] = ['label' => $clinic->name, 'url' => $url];
        foreach ($this->shownClinics as $shown) {
            if ($shown['slug'] === $clinic->slug) {
                return;
            }
        }
        $this->shownClinics[] = ['slug' => $clinic->slug, 'name' => $clinic->name];
    }

    private function priceLabel(int $from, ?int $to): string
    {
        return $to && $to > $from ? Text::money($from).'–'.Text::money($to) : 'от '.Text::money($from);
    }

    /** @return list<string> */
    private function features(Clinic $clinic): array
    {
        return array_values(array_filter([
            $clinic->is_verified ? 'проверена сервисом' : null,
            $clinic->same_day ? 'запись в день обращения' : null,
            $clinic->is_24_7 ? 'круглосуточно' : null,
            $clinic->accepts_children ? 'принимает детей' : null,
            $clinic->has_installment ? 'рассрочка' : null,
            $clinic->accepts_dms ? 'ДМС' : null,
            $clinic->has_sedation ? 'седация' : null,
            $clinic->has_microscope ? 'микроскоп' : null,
            $clinic->has_ct ? 'КТ в клинике' : null,
        ]));
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
        $this->rememberClinic($clinic, $url);

        $focus = trim((string) ($arguments['service'] ?? ''));
        $focusService = $focus !== '' ? $this->matchService($focus) : null;

        $services = $clinic->clinicServices()
            ->with('service:id,name')
            ->where('price_from', '>', 0)
            ->when($focusService !== null, fn ($q) => $q->orderByRaw('service_id = ? desc', [$focusService->id]))
            ->orderBy('price_from')
            ->limit(12)
            ->get();

        $doctors = $clinic->doctors()
            ->published()
            ->orderByDesc('rating')
            ->limit(6)
            ->get(['id', 'name', 'position', 'experience_years', 'rating']);

        return json_encode(array_filter([
            'slug' => $clinic->slug,
            'name' => $clinic->name,
            'tagline' => $clinic->tagline,
            'rating' => round((float) $clinic->rating, 1),
            'reviews_count' => (int) $clinic->reviews_count,
            'address' => $clinic->address,
            'metro' => $clinic->metro,
            'district' => $clinic->district?->name,
            'features' => $this->features($clinic),
            'payment_methods' => $clinic->payment_methods,
            'url' => $url,
            'booking_url' => route('booking.create', $clinic->slug),
            'services' => $services->map(fn ($row) => [
                'service_id' => $row->service_id,
                'name' => $row->service?->name,
                'price' => $this->priceLabel((int) $row->price_from, $row->price_to ? (int) $row->price_to : null),
            ])->values()->all(),
            'doctors' => $doctors->map(fn (Doctor $d) => array_filter([
                'id' => $d->id,
                'name' => $d->name,
                'position' => $d->position,
                'experience_years' => $d->experience_years ?: null,
                'rating' => $d->rating ? round((float) $d->rating, 1) : null,
            ]))->values()->all(),
        ], fn ($v) => $v !== null && $v !== '' && $v !== []), JSON_UNESCAPED_UNICODE);
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
