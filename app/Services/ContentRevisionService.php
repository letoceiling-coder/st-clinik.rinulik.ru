<?php

namespace App\Services;

use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicPhoto;
use App\Models\ClinicPost;
use App\Models\ClinicService;
use App\Models\ContentRevision;
use App\Models\District;
use App\Models\Doctor;
use App\Models\Organization;
use App\Models\Specialty;
use App\Models\User;
use App\Services\Clinics\AddressGeocoder;
use App\Services\Organization\ClinicStaffNotifier;
use App\Support\ClinicNotificationEvents;
use App\Support\Schedule;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Модерация правок из кабинета клиники.
 *
 * Пре-модерация (профиль, реквизиты, врачи, публикации, фото): у уже одобренных данных правка сохраняется как
 * предложение, на сайте остаётся прежняя версия до решения модератора.
 * Пост-модерация (цены, график): правка применяется сразу, модератор проверяет её постфактум.
 */
class ContentRevisionService
{
    /** Статусы клиники, в которых её данные считаются проверенными и показываются (или готовы к показу) на сайте. */
    public const MODERATED_CLINIC_STATUSES = ['approved', 'published', 'hidden'];

    /** Атрибуты-файлы на диске public: при одобрении удаляется старый файл, при отклонении — новый. */
    private const FILE_ATTRIBUTES = ['photo_path', 'image_path', 'path'];

    private const SPECIALTIES_KEY = '_specialty_ids';

    private const FIELD_LABELS = [
        'name' => 'Название', 'tagline' => 'Слоган', 'description' => 'Описание', 'address' => 'Адрес', 'metro' => 'Метро',
        'directions_note' => 'Как добраться', 'parking' => 'Парковка', 'warranty' => 'Гарантия', 'lat' => 'Широта', 'lng' => 'Долгота',
        'phone' => 'Телефон', 'email' => 'E-mail', 'website' => 'Сайт', 'founded_year' => 'Год основания', 'city_id' => 'Город',
        'district_id' => 'Район', 'license_number' => 'Номер лицензии', 'license_issuer' => 'Кем выдана лицензия',
        'license_date' => 'Дата лицензии', 'restrictions' => 'Ограничения', 'payment_methods' => 'Способы оплаты',
        'achievements' => 'Достижения', 'accepts_children' => 'Принимает детей', 'children_age_from' => 'Дети с возраста',
        'installment_months' => 'Рассрочка, мес.', 'legal_name' => 'Юридическое название', 'inn' => 'ИНН', 'ogrn' => 'ОГРН',
        'kpp' => 'КПП', 'legal_address' => 'Юридический адрес', 'position' => 'Должность', 'experience_years' => 'Стаж, лет',
        'bio' => 'О враче', 'education' => 'Образование', 'schedule_days' => 'Дни приёма', 'consult_price' => 'Консультация, ₽',
        'photo_path' => 'Фото', 'type' => 'Тип', 'title' => 'Заголовок', 'excerpt' => 'Анонс', 'body' => 'Текст',
        'starts_at' => 'Начало', 'ends_at' => 'Окончание', 'is_pinned' => 'Закреплено', 'image_path' => 'Обложка',
        'kind' => 'Раздел галереи', 'caption' => 'Подпись', 'path' => 'Файл фото', self::SPECIALTIES_KEY => 'Направления',
        'items' => 'Позиции', 'schedule' => 'Часы работы', 'is_24_7' => 'Круглосуточно', 'same_day' => 'Приём в день обращения',
    ];

    public function __construct(private readonly ProfileMetrics $metrics) {}

    /** Нужно ли пропускать правку этого объекта через модерацию (иначе — сохранять сразу, как раньше). */
    public function requiresModeration(Model $subject): bool
    {
        return match (true) {
            $subject instanceof Clinic => in_array($subject->status, self::MODERATED_CLINIC_STATUSES, true),
            $subject instanceof Organization => $subject->clinics()->whereIn('status', self::MODERATED_CLINIC_STATUSES)->exists(),
            $subject instanceof Doctor => $subject->status === 'published',
            $subject instanceof ClinicPost => $subject->status === 'published',
            $subject instanceof ClinicPhoto => $subject->status === 'approved',
            default => false,
        };
    }

    /**
     * Сохраняет предложенную правку. Повторная отправка обновляет то же предложение; если значения
     * совпали с текущими на сайте — предложение снимается. Возвращает null, если отличий нет.
     *
     * @param  array<string, mixed>  $attributes
     * @param  list<int>|null  $specialtyIds
     */
    public function propose(Model $subject, string $section, array $attributes, ?User $user, ?array $specialtyIds = null): ?ContentRevision
    {
        return DB::transaction(function () use ($subject, $section, $attributes, $user, $specialtyIds): ?ContentRevision {
            $existing = $this->pendingFor($subject, lock: true);
            // Загруженный ранее файл остаётся в предложении, если в этой отправке файла нет.
            $carriedFiles = array_intersect_key($existing?->payload ?? [], array_flip(self::FILE_ATTRIBUTES));
            $proposed = array_merge($carriedFiles, $attributes);
            unset($proposed[self::SPECIALTIES_KEY]);

            $probe = clone $subject;
            $probe->forceFill($proposed);
            $changed = array_keys($probe->getDirty());

            $payload = array_intersect_key($proposed, array_flip($changed));
            $original = [];
            foreach ($changed as $key) {
                $original[$key] = $this->plain($subject->getAttribute($key));
            }

            $specialtyIds ??= $existing?->payload[self::SPECIALTIES_KEY] ?? null;
            if ($specialtyIds !== null && method_exists($subject, 'specialties')) {
                $current = $subject->specialties()->pluck('specialties.id')->map(fn ($id) => (int) $id)->sort()->values()->all();
                $next = collect($specialtyIds)->map(fn ($id) => (int) $id)->sort()->values()->all();
                if ($current !== $next) {
                    $payload[self::SPECIALTIES_KEY] = $next;
                    $original[self::SPECIALTIES_KEY] = $current;
                }
            }

            $this->discardFiles($existing, keep: $payload);

            if ($payload === []) {
                $existing?->update(['status' => ContentRevision::STATUS_WITHDRAWN]);

                return null;
            }

            $revision = $existing ?? new ContentRevision([
                'mode' => ContentRevision::MODE_PRE,
                'section' => $section,
                'status' => ContentRevision::STATUS_PENDING,
            ]);
            $revision->subject()->associate($subject);
            $revision->fill([
                'clinic_id' => $this->clinicIdOf($subject),
                'organization_id' => $this->organizationIdOf($subject),
                'payload' => $payload,
                'original' => $original,
                'submitted_by' => $user?->id,
            ])->save();

            return $revision;
        });
    }

    /**
     * Пост-модерация: фиксирует, как раздел выглядел до первой непроверенной правки. Вызывать ДО изменения.
     */
    public function trackPostModeration(Clinic $clinic, string $section, ?User $user): void
    {
        if (! in_array($clinic->status, self::MODERATED_CLINIC_STATUSES, true)) {
            return;
        }

        DB::transaction(function () use ($clinic, $section, $user): void {
            $exists = ContentRevision::query()->pending()->lockForUpdate()
                ->where('clinic_id', $clinic->id)->where('mode', ContentRevision::MODE_POST)->where('section', $section)
                ->exists();
            if ($exists) {
                return;
            }

            $revision = new ContentRevision([
                'mode' => ContentRevision::MODE_POST,
                'section' => $section,
                'status' => ContentRevision::STATUS_PENDING,
                'clinic_id' => $clinic->id,
                'organization_id' => $clinic->organization_id,
                'original' => $this->snapshot($clinic, $section),
                'submitted_by' => $user?->id,
            ]);
            $revision->subject()->associate($clinic);
            $revision->save();
        });
    }

    public function pendingFor(Model $subject, bool $lock = false): ?ContentRevision
    {
        return ContentRevision::query()->pending()
            ->where('mode', ContentRevision::MODE_PRE)
            ->where('subject_type', $subject->getMorphClass())
            ->where('subject_id', $subject->getKey())
            ->when($lock, fn ($q) => $q->lockForUpdate())
            ->first();
    }

    /**
     * Значения для формы кабинета: текущие данные с наложенным предложением, чтобы клиника видела то, что отправила.
     *
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    public function overlay(Model $subject, array $values): array
    {
        $revision = $this->pendingFor($subject);
        if ($revision === null) {
            return $values;
        }

        foreach ($revision->payload as $key => $value) {
            if ($key === self::SPECIALTIES_KEY) {
                $values['specialty_ids'] = $value;
            } elseif (! in_array($key, self::FILE_ATTRIBUTES, true) && array_key_exists($key, $values)) {
                $values[$key] = $value;
            }
        }

        return $values;
    }

    /** @return array{id: int, submitted_at: string|null, fields: list<string>}|null */
    public function pendingSummary(Model $subject): ?array
    {
        $revision = $this->pendingFor($subject);

        return $revision ? [
            'id' => $revision->id,
            'submitted_at' => $revision->updated_at?->format('d.m.Y H:i'),
            'fields' => array_map(fn (string $key) => self::FIELD_LABELS[$key] ?? $key, array_keys($revision->payload)),
        ] : null;
    }

    public function approve(ContentRevision $revision, ?User $moderator): void
    {
        DB::transaction(function () use ($revision, $moderator): void {
            $revision = ContentRevision::query()->lockForUpdate()->findOrFail($revision->id);
            abort_unless($revision->status === ContentRevision::STATUS_PENDING, 422, 'Изменение уже проверено.');

            if ($revision->isPreModeration()) {
                $this->apply($revision);
            }

            $revision->update([
                'status' => ContentRevision::STATUS_APPROVED,
                'reviewed_by' => $moderator?->id,
                'reviewed_at' => now(),
                'moderation_note' => null,
            ]);
        });

        $label = $this->label($revision);
        $this->notify($revision, 'Изменения одобрены', $revision->isPreModeration()
            ? "{$label}: изменения прошли модерацию и опубликованы на сайте."
            : "{$label}: изменения проверены модератором.");
    }

    public function reject(ContentRevision $revision, ?User $moderator, string $note): void
    {
        DB::transaction(function () use ($revision, $moderator, $note): void {
            $revision = ContentRevision::query()->lockForUpdate()->findOrFail($revision->id);
            abort_unless($revision->status === ContentRevision::STATUS_PENDING, 422, 'Изменение уже проверено.');

            if ($revision->isPreModeration()) {
                $this->discardFiles($revision, keep: []);
            }

            $revision->update([
                'status' => ContentRevision::STATUS_REJECTED,
                'reviewed_by' => $moderator?->id,
                'reviewed_at' => now(),
                'moderation_note' => $note,
            ]);
        });

        $label = $this->label($revision);
        $this->notify($revision, 'Изменения отклонены', $revision->isPreModeration()
            ? "{$label}: изменения не прошли модерацию, на сайте осталась прежняя версия. {$note}"
            : "{$label}: модератор просит исправить данные. {$note}");
    }

    /** Клиника отзывает своё предложение. */
    public function withdraw(ContentRevision $revision): void
    {
        abort_unless($revision->status === ContentRevision::STATUS_PENDING && $revision->isPreModeration(), 422);
        $this->discardFiles($revision, keep: []);
        $revision->update(['status' => ContentRevision::STATUS_WITHDRAWN]);
    }

    /**
     * Что изменилось — для карточки модератора.
     *
     * @return list<array{label: string, before: string, after: string}>
     */
    public function diff(ContentRevision $revision): array
    {
        if ($revision->isPreModeration()) {
            $rows = [];
            foreach ($revision->payload ?? [] as $key => $after) {
                $rows[] = [
                    'label' => self::FIELD_LABELS[$key] ?? $key,
                    'before' => $this->display($key, $revision->original[$key] ?? null),
                    'after' => $this->display($key, $after),
                ];
            }

            return $rows;
        }

        $clinic = $revision->clinic;
        if ($clinic === null) {
            return [];
        }
        $before = $revision->original ?? [];
        $after = $this->snapshot($clinic, $revision->section);
        $rows = [];
        foreach (array_unique([...array_keys($before), ...array_keys($after)]) as $key) {
            if (($before[$key] ?? null) === ($after[$key] ?? null)) {
                continue;
            }
            $rows[] = [
                'label' => (string) $key,
                'before' => $before[$key] ?? '—',
                'after' => $after[$key] ?? 'удалено',
            ];
        }

        return $rows;
    }

    public function label(ContentRevision $revision): string
    {
        $section = ContentRevision::SECTION_LABELS[$revision->section] ?? 'Изменения';
        $subject = $revision->subject;
        $name = match (true) {
            $subject instanceof Doctor, $subject instanceof Clinic, $subject instanceof Organization => $subject->name,
            $subject instanceof ClinicPost => $subject->title,
            default => null,
        };

        return $name ? "{$section} «{$name}»" : $section;
    }

    private function apply(ContentRevision $revision): void
    {
        $subject = $revision->subject;
        abort_if($subject === null, 422, 'Объект изменения удалён.');

        $payload = $revision->payload ?? [];
        $specialtyIds = $payload[self::SPECIALTIES_KEY] ?? null;
        unset($payload[self::SPECIALTIES_KEY]);

        $replacedFiles = [];
        foreach (self::FILE_ATTRIBUTES as $key) {
            if (array_key_exists($key, $payload) && $subject->getAttribute($key)) {
                $replacedFiles[] = $subject->getAttribute($key);
            }
        }

        $subject->forceFill($payload);
        if ($subject instanceof Clinic && ! array_key_exists('lat', $payload)) {
            app(AddressGeocoder::class)->fillCoordinates($subject);
        }
        $subject->save();

        if ($specialtyIds !== null && method_exists($subject, 'specialties')) {
            $subject->specialties()->sync($specialtyIds);
        }
        if ($replacedFiles !== []) {
            Storage::disk('public')->delete($replacedFiles);
        }

        if ($revision->clinic) {
            $this->metrics->recalcClinic($revision->clinic);
        }
        Audit::log('moderation.revision.applied', $subject, ['revision_id' => $revision->id, 'fields' => array_keys($revision->payload ?? [])]);
    }

    /**
     * Удаляет файлы, загруженные для предложения, если они больше не нужны.
     *
     * @param  array<string, mixed>  $keep
     */
    private function discardFiles(?ContentRevision $revision, array $keep): void
    {
        if ($revision === null) {
            return;
        }
        foreach (self::FILE_ATTRIBUTES as $key) {
            $path = $revision->payload[$key] ?? null;
            if (is_string($path) && $path !== '' && ($keep[$key] ?? null) !== $path) {
                Storage::disk('public')->delete($path);
            }
        }
    }

    /** @return array<string, string> Строки «позиция → значение» для сравнения раздела до и после. */
    private function snapshot(Clinic $clinic, string $section): array
    {
        if ($section === 'prices') {
            return ClinicService::query()->where('clinic_id', $clinic->id)->with('service:id,name')->get()
                ->mapWithKeys(fn (ClinicService $p) => [
                    (string) ($p->service?->name ?? 'Услуга #'.$p->service_id) => trim(
                        number_format((int) $p->price_from, 0, ',', ' ')
                        .($p->price_to ? '–'.number_format((int) $p->price_to, 0, ',', ' ') : '').' ₽'
                        .($p->is_promo ? ' · акция' : '')
                        .($p->note ? ' · '.$p->note : '')
                    ),
                ])->sortKeys()->all();
        }

        if ($section === 'schedule') {
            $clinic->refresh();
            $days = [];
            foreach (Schedule::DAYS as $key => $label) {
                $day = ($clinic->schedule ?? [])[$key] ?? null;
                $days[$label] = $day ? $day['open'].'–'.$day['close'] : 'выходной';
            }

            return $days + [
                'Круглосуточно' => $clinic->is_24_7 ? 'да' : 'нет',
                'Приём в день обращения' => $clinic->same_day ? 'да' : 'нет',
            ];
        }

        return [];
    }

    private function display(string $key, mixed $value): string
    {
        if ($value === null || $value === '' || $value === []) {
            return '—';
        }
        if (in_array($key, self::FILE_ATTRIBUTES, true)) {
            return 'новый файл';
        }

        return match ($key) {
            'city_id' => (string) (City::query()->whereKey($value)->value('name') ?? $value),
            'district_id' => (string) (District::query()->whereKey($value)->value('name') ?? $value),
            self::SPECIALTIES_KEY => Specialty::query()->whereIn('id', (array) $value)->orderBy('name')->pluck('name')->implode(', '),
            default => match (true) {
                is_bool($value) => $value ? 'да' : 'нет',
                is_array($value) => implode(', ', array_map(fn ($v) => is_scalar($v) ? (string) $v : json_encode($v, JSON_UNESCAPED_UNICODE), $value)),
                default => (string) $value,
            },
        };
    }

    private function plain(mixed $value): mixed
    {
        return $value instanceof CarbonInterface ? $value->toDateString() : $value;
    }

    private function clinicIdOf(Model $subject): ?int
    {
        return match (true) {
            $subject instanceof Clinic => $subject->id,
            $subject instanceof Doctor, $subject instanceof ClinicPost, $subject instanceof ClinicPhoto => $subject->clinic_id,
            default => null,
        };
    }

    private function organizationIdOf(Model $subject): ?int
    {
        return match (true) {
            $subject instanceof Organization => $subject->id,
            $subject instanceof Clinic => $subject->organization_id,
            default => Clinic::query()->whereKey($this->clinicIdOf($subject))->value('organization_id'),
        };
    }

    private function notify(ContentRevision $revision, string $title, string $body): void
    {
        $organization = $revision->organization ?? $revision->clinic?->organization;
        if ($organization === null) {
            return;
        }

        app(ClinicStaffNotifier::class)->notify(
            $organization,
            ClinicNotificationEvents::MODERATION,
            'moderation',
            $title,
            $body,
            '/clinic-cabinet'.($revision->clinic_id ? '?branch='.$revision->clinic_id : ''),
        );
    }
}
