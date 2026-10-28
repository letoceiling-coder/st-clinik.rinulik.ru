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
use App\Models\Specialty;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Filters\ClinicFilters;
use App\Services\SlotAvailabilityService;
use App\Support\Text;
use Carbon\Carbon;
use Illuminate\Support\Collection;
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

        ['service' => $service, 'specialty' => $specialty] = $this->matchCatalog($query);
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
        } elseif ($specialty !== null) {
            $attempts[] = ['match' => 'specialty', 'filters' => $base + ['specialty' => $specialty->slug]];
            $offering = $this->clinicIdsOfferingSpecialty($city, $specialty);
            if ($offering !== []) {
                $attempts[] = ['match' => 'specialty', 'filters' => ['ids' => implode(',', $offering)]];
            }
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
        $prices = $this->pricesFor($collection->pluck('id')->all(), $matched, $service, $specialty);

        $items = [];
        foreach ($collection as $clinic) {
            /** @var Clinic $clinic */
            $url = route('clinics.show', $clinic->slug);
            $this->rememberClinic($clinic, $url);
            $price = $prices[$clinic->id] ?? null;
            $items[] = array_filter([
                'slug' => $clinic->slug,
                'name' => $clinic->name,
                'rating' => round((float) $clinic->rating, 1),
                'reviews_count' => (int) $clinic->reviews_count,
                'address' => $clinic->address,
                'metro' => $clinic->metro,
                'district' => $clinic->district?->name,
                'service_price' => $price,
                'cheapest_any_service' => $price === null && $clinic->min_price ? 'от '.Text::money((int) $clinic->min_price) : null,
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
            'direction' => $specialty?->name,
            'district' => $district?->name,
            'total_found' => $page?->total() ?? 0,
            'clinics' => $items,
            'catalog_url' => route('city.clinics', $city->slug).($service !== null ? '?service='.$service->slug : ''),
            'note' => match ($matched) {
                'city_best', 'city_best_without_filters' => 'Клиник именно с этой услугой не нашлось — это лучшие клиники города по рейтингу. Скажи об этом честно и не выдавай cheapest_any_service за цену нужной услуги.',
                default => 'service_price — цена именно по запрошенной услуге или направлению. cheapest_any_service — самая дешёвая услуга клиники вообще, её не выдавай за цену запрошенной услуги.',
            },
        ], JSON_UNESCAPED_UNICODE);
    }

    /** Слова, которые есть почти в любом запросе и не помогают понять услугу. */
    private const STOP_WORDS = ['зуб', 'зуба', 'зубы', 'зубов', 'зубам', 'зубах', 'нужна', 'нужно', 'нужен', 'хочу', 'надо', 'недорого', 'дешево', 'дёшево', 'клиника', 'клиники', 'клинику', 'стоматология', 'стоматологию', 'стоматолог', 'посоветуйте', 'подскажите', 'хорошая', 'хороший', 'лучшая', 'рядом', 'сегодня', 'срочно'];

    /**
     * Сопоставляет слова пользователя с каталогом по основам слов («имплантация» ↔ «импланта»).
     * Направление выигрывает при равенстве: «имплантация» охватывает все услуги имплантации, а не одну.
     *
     * @return array{service: ?Service, specialty: ?Specialty}
     */
    private function matchCatalog(string $query): array
    {
        $stems = $this->stems($query);
        if ($stems === []) {
            return ['service' => null, 'specialty' => null];
        }

        [$service, $serviceScore] = $this->bestMatch(Service::query()->where('is_active', true)->get(['id', 'name', 'slug', 'search_text', 'specialty_id']), $stems);
        [$specialty, $specialtyScore] = $this->bestMatch(Specialty::query()->where('is_active', true)->get(['id', 'name', 'slug', 'search_text']), $stems);

        if ($service !== null && $serviceScore > $specialtyScore) {
            return ['service' => $service, 'specialty' => null];
        }
        if ($specialty !== null) {
            return ['service' => null, 'specialty' => $specialty];
        }

        // «Что беспокоит»: «болит зуб», «кровоточат дёсны» → направление симптома.
        [$concern] = $this->bestMatch(Concern::query()->where('is_active', true)->with('specialty:id,name,slug')->get(), $stems);

        return ['service' => null, 'specialty' => $concern?->specialty];
    }

    /** @return list<string> */
    private function stems(string $query): array
    {
        $stems = [];
        foreach ((new ClinicFilters(q: $query))->tokens() as $token) {
            $token = mb_strtolower($token);
            $length = mb_strlen($token);
            if ($length < 4 || in_array($token, self::STOP_WORDS, true)) {
                continue;
            }
            $stems[] = mb_substr($token, 0, max(4, min($length - 3, 7)));
        }

        return array_values(array_unique($stems));
    }

    /**
     * @template T of \Illuminate\Database\Eloquent\Model
     *
     * @param  Collection<int, T>  $items
     * @param  list<string>  $stems
     * @return array{0: ?T, 1: int}
     */
    private function bestMatch($items, array $stems): array
    {
        $best = null;
        $bestScore = 0;
        foreach ($items as $item) {
            $haystack = mb_strtolower($item->name.' '.$item->search_text);
            $score = 0;
            foreach ($stems as $stem) {
                if (str_contains($haystack, $stem)) {
                    $score++;
                }
            }
            if ($score > $bestScore) {
                $best = $item;
                $bestScore = $score;
            }
        }

        return [$best, $bestScore];
    }

    /** @return list<int> Клиники города, у которых есть хотя бы одна услуга направления. */
    private function clinicIdsOfferingSpecialty(City $city, Specialty $specialty): array
    {
        return ClinicService::query()
            ->join('services', 'services.id', '=', 'clinic_services.service_id')
            ->join('clinics', 'clinics.id', '=', 'clinic_services.clinic_id')
            ->where('services.specialty_id', $specialty->id)
            ->where('clinics.city_id', $city->id)
            ->where('clinics.status', 'published')
            ->where('clinic_services.price_from', '>', 0)
            ->orderByDesc('clinics.rating')
            ->pluck('clinic_services.clinic_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->take(24)
            ->values()
            ->all();
    }

    /**
     * Цена именно по запрошенной услуге или минимальная по услугам направления.
     *
     * @param  list<int>  $clinicIds
     * @return array<int, string>
     */
    private function pricesFor(array $clinicIds, string $matched, ?Service $service, ?Specialty $specialty): array
    {
        if ($clinicIds === [] || ! in_array($matched, ['service', 'specialty'], true)) {
            return [];
        }

        $rows = ClinicService::query()
            ->whereIn('clinic_id', $clinicIds)
            ->where('price_from', '>', 0)
            ->when($service !== null, fn ($q) => $q->where('service_id', $service->id))
            ->when($service === null && $specialty !== null, fn ($q) => $q->whereIn('service_id', Service::query()->where('specialty_id', $specialty->id)->select('id')))
            ->get(['clinic_id', 'price_from', 'price_to']);

        $prices = [];
        foreach ($rows->groupBy('clinic_id') as $clinicId => $group) {
            $cheapest = $group->sortBy('price_from')->first();
            $prices[(int) $clinicId] = $service !== null
                ? $this->priceLabel((int) $cheapest->price_from, $cheapest->price_to ? (int) $cheapest->price_to : null)
                : 'от '.Text::money((int) $cheapest->price_from);
        }

        return $prices;
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
        $focusService = $focus !== '' ? $this->matchCatalog($focus)['service'] : null;

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
