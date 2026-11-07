<?php

namespace App\Services;

use App\Http\Controllers\Cabinet\MediaController;
use App\Models\Clinic;
use App\Models\ClinicDocument;
use App\Models\ClinicPhoto;
use App\Models\ClinicPropertyType;
use App\Models\ClinicService;
use App\Models\Doctor;
use App\Models\ParsedOrganization;
use App\Models\Service;
use App\Services\Parser\ParsedOrganizationNormalizer;
use App\Services\Parser\YandexPriceListMapper;
use App\Support\Schedule;
use Illuminate\Support\Facades\Storage;

/**
 * Всё о клинике для модератора в одном месте: профиль, график, услуги, врачи, фото, документы,
 * готовность профиля и откуда взялись данные (кабинет владельца или парсер Яндекс Карт).
 */
class ClinicModerationDossier
{
    public const STATUS_LABELS = ['pending' => 'на проверке', 'approved' => 'одобрено', 'rejected' => 'отклонено', 'published' => 'опубликован', 'draft' => 'черновик', 'hidden' => 'скрыт'];

    public function __construct(
        private readonly ProfileMetrics $metrics,
        private readonly YandexPriceListMapper $prices,
    ) {}

    /** @return array<string, mixed> */
    public function build(Clinic $clinic): array
    {
        $clinic->load([
            'city:id,name', 'district:id,name', 'organization.owner:id,name,email,phone',
            'specialties:id,name', 'clinicServices.service:id,name',
            'photos' => fn ($q) => $q->orderBy('sort')->orderBy('id'),
            'documents' => fn ($q) => $q->latest('id'),
            'doctors' => fn ($q) => $q->with('specialties:id,name')->orderBy('name'),
        ]);
        $readiness = $this->metrics->moderationReadiness($clinic);

        return [
            'id' => $clinic->id,
            'name' => $clinic->name,
            'slug' => $clinic->slug,
            'status' => $clinic->status,
            'status_label' => Clinic::STATUS_LABELS[$clinic->status] ?? $clinic->status,
            'previous_note' => $clinic->moderation_note,
            'created_at' => $clinic->created_at?->format('d.m.Y H:i'),
            'updated_at' => $clinic->updated_at?->format('d.m.Y H:i'),
            'has_owner' => $clinic->organization?->owner_id !== null,
            'organization' => $this->organization($clinic),
            'profile' => $this->facts([
                'Слоган' => $clinic->tagline,
                'Город' => $clinic->city?->name,
                'Район' => $clinic->district?->name,
                'Адрес' => $clinic->address,
                'Метро' => $clinic->metro,
                'Телефон' => $clinic->phone,
                'E-mail' => $clinic->email,
                'Сайт' => $clinic->website,
                'Год основания' => $clinic->founded_year ? (string) $clinic->founded_year : null,
                'Лицензия' => trim(implode(', ', array_filter([
                    $clinic->license_number,
                    $clinic->license_issuer,
                    $clinic->license_date?->format('d.m.Y'),
                ]))) ?: null,
            ]),
            'map_url' => $clinic->lat && $clinic->lng ? "https://yandex.ru/maps/?pt={$clinic->lng},{$clinic->lat}&z=17&l=map" : null,
            'texts' => array_values(array_filter([
                ['label' => 'Описание', 'value' => $clinic->description],
                ['label' => 'Как добраться', 'value' => $clinic->directions_note],
                ['label' => 'Парковка', 'value' => $clinic->parking],
                ['label' => 'Гарантия', 'value' => $clinic->warranty],
                ['label' => 'Ограничения', 'value' => $clinic->restrictions],
            ], fn (array $t) => filled($t['value']))),
            'schedule' => $this->schedule($clinic),
            'features' => $this->features($clinic),
            'payment_methods' => array_values($clinic->payment_methods ?? []),
            'specialties' => $clinic->specialties->pluck('name')->values(),
            'services' => $clinic->clinicServices->sortBy(fn (ClinicService $s) => $s->service?->name)->values()->map(fn (ClinicService $s) => [
                'name' => $s->service?->name ?? 'Услуга удалена',
                'price' => $this->price($s->price_from, $s->price_to),
                'duration' => $s->duration_min ? $s->duration_min.' мин' : null,
                'promo' => (bool) $s->is_promo,
                'note' => $s->note,
            ]),
            'doctors' => $clinic->doctors->map(fn (Doctor $d) => [
                'id' => $d->id,
                'name' => $d->name,
                'position' => $d->position,
                'specialties' => $d->specialties->pluck('name')->implode(', '),
                'experience' => $d->experience_years ? $d->experience_years.' лет стажа' : null,
                'status' => $d->status,
                'status_label' => self::STATUS_LABELS[$d->status] ?? $d->status,
                'photo_url' => $d->photo_path ? Storage::disk('public')->url($d->photo_path) : null,
                'art_seed' => $d->art_seed,
            ])->values(),
            'photos' => $clinic->photos->map(fn (ClinicPhoto $p) => [
                'id' => $p->id,
                'url' => $p->path ? Storage::disk('public')->url($p->path) : null,
                'art_seed' => $p->art_seed,
                'kind' => $p->kind,
                'kind_label' => MediaController::PHOTO_KINDS[$p->kind] ?? 'Другое',
                'caption' => $p->caption,
                'status' => $p->status,
                'status_label' => self::STATUS_LABELS[$p->status] ?? $p->status,
            ])->values(),
            'documents' => $clinic->documents->map(fn (ClinicDocument $d) => [
                'id' => $d->id,
                'title' => $d->title,
                'type' => MediaController::DOC_TYPES[$d->type] ?? 'Другое',
                'number' => $d->number,
                'issued_at' => $d->issued_at?->format('d.m.Y'),
                'expires_at' => $d->expires_at?->format('d.m.Y'),
                'status' => $d->status,
                'status_label' => self::STATUS_LABELS[$d->status] ?? $d->status,
                'view_url' => $d->path ? '/admin/moderation/documents/'.$d->id.'/view' : null,
            ])->values(),
            'readiness' => [
                'percent' => $readiness['percent'],
                'min' => ProfileMetrics::MODERATION_MIN_PERCENT,
                'items' => collect($this->metrics->completeness($clinic)['items'])->map(fn (array $i) => [
                    'label' => $i['label'],
                    'done' => $i['done'],
                    'pending' => $i['pending'],
                    'progress' => $i['progress'],
                    'weight' => $i['weight'],
                ])->values(),
            ],
            'pending_counts' => [
                'photo' => $clinic->photos->where('status', 'pending')->count(),
                'document' => $clinic->documents->where('status', 'pending')->count(),
                'doctor' => $clinic->doctors->where('status', 'pending')->count(),
            ],
            'source' => $this->source($clinic),
            'yandex_prices' => $this->yandexPrices($clinic),
        ];
    }

    /**
     * Прайс из карточки Яндекса целиком: что перенесено в услуги, а что нет (модератор видит исходник).
     *
     * @return list<array{name: string, price: string, service: string|null}>
     */
    private function yandexPrices(Clinic $clinic): array
    {
        $parsed = ParsedOrganization::query()->where('clinic_id', $clinic->id)->first(['id', 'raw']);
        $products = (array) (ParsedOrganizationNormalizer::card($parsed?->raw ?? [])['products'] ?? []);
        if ($products === []) {
            return [];
        }
        $names = Service::query()->pluck('name', 'slug');

        return collect($products)->filter(fn ($p) => is_array($p) && filled($p['name'] ?? null))->map(function (array $p) use ($names): array {
            $slug = $this->prices->match((string) $p['name']);

            return ['name' => (string) $p['name'], 'price' => trim((string) ($p['price'] ?? '')), 'service' => $slug ? ($names[$slug] ?? null) : null];
        })->values()->all();
    }

    /** @return array<string, mixed>|null */
    private function organization(Clinic $clinic): ?array
    {
        $org = $clinic->organization;
        if ($org === null) {
            return null;
        }

        return [
            'name' => $org->name,
            'facts' => $this->facts([
                'Юр. лицо' => $org->legal_name,
                'ИНН' => $org->inn,
                'ОГРН' => $org->ogrn,
                'Юр. адрес' => $org->legal_address,
                'Владелец' => $org->owner ? trim($org->owner->name.' · '.$org->owner->email.($org->owner->phone ? ' · '.$org->owner->phone : '')) : 'нет — клиника добавлена из парсера, публикует администратор',
                'Филиалов' => (string) $org->clinics()->count(),
            ]),
        ];
    }

    /** @return list<array{day: string, hours: string}> */
    private function schedule(Clinic $clinic): array
    {
        if ($clinic->is_24_7) {
            return [['day' => 'Ежедневно', 'hours' => 'круглосуточно']];
        }
        $schedule = $clinic->schedule ?? [];
        $rows = [];
        foreach (Schedule::DAYS as $key => $label) {
            $day = $schedule[$key] ?? null;
            $rows[] = ['day' => $label, 'hours' => $day ? ($day['open'] ?? '?').'–'.($day['close'] ?? '?') : 'выходной'];
        }

        return $schedule === [] ? [] : $rows;
    }

    /** @return list<string> */
    private function features(Clinic $clinic): array
    {
        $features = ClinicPropertyType::cached()
            ->filter(fn (ClinicPropertyType $t) => $t->db_column && $t->db_column !== 'is_verified' && (bool) $clinic->getAttribute($t->db_column))
            ->pluck('name')
            ->values()
            ->all();
        if ($clinic->accepts_children) {
            $features[] = 'Принимает детей'.($clinic->children_age_from ? " с {$clinic->children_age_from} лет" : '');
        }
        if ($clinic->has_installment && $clinic->installment_months) {
            $features[] = "Рассрочка до {$clinic->installment_months} мес.";
        }

        return array_values(array_unique($features));
    }

    /** @return array<string, mixed>|null */
    private function source(Clinic $clinic): ?array
    {
        $parsed = ParsedOrganization::query()->where('clinic_id', $clinic->id)->first();
        if ($parsed === null && $clinic->yandex_org_id === null) {
            return ['kind' => 'owner', 'label' => 'Данные внесла клиника в личном кабинете'];
        }

        return [
            'kind' => 'parser',
            'label' => 'Карточка создана из Яндекс Карт парсером'.($parsed?->last_synced_at ? ', данные от '.$parsed->last_synced_at->format('d.m.Y') : ''),
            'parsed_id' => $parsed?->id,
            'yandex_url' => $clinic->yandex_source_url ?: ($parsed?->raw['sourceUrl'] ?? null),
            'yandex_rating' => $parsed?->rating ? number_format((float) $parsed->rating, 1, ',', '').' · '.$parsed->reviews_count.' отзывов' : null,
        ];
    }

    private function price(?int $from, ?int $to): string
    {
        $fmt = fn (int $v) => number_format($v, 0, ',', ' ').' ₽';

        return match (true) {
            $from && $to && $to !== $from => $fmt($from).' – '.$fmt($to),
            (bool) $from => 'от '.$fmt($from),
            (bool) $to => 'до '.$fmt($to),
            default => 'цена не указана',
        };
    }

    /**
     * @param  array<string, string|null>  $facts
     * @return list<array{label: string, value: string}>
     */
    private function facts(array $facts): array
    {
        $rows = [];
        foreach ($facts as $label => $value) {
            if ($value !== null && $value !== '') {
                $rows[] = ['label' => $label, 'value' => $value];
            }
        }

        return $rows;
    }
}
