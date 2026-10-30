<?php

namespace App\Services;

use App\Http\Controllers\Cabinet\MediaController;
use App\Models\Clinic;
use App\Models\ClinicDocument;
use App\Models\ClinicPhoto;
use App\Models\Doctor;
use App\Models\Review;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Очередь модерации: по каждому объекту — всё, что нужно модератору для решения,
 * уже на русском: факты, текст, фото или файл, ссылки и подсказка, что проверить.
 */
class ModerationQueue
{
    private const LIMIT = 30;

    public const TYPE_LABELS = [
        'clinic' => 'Клиника',
        'doctor' => 'Врач',
        'document' => 'Документ',
        'photo' => 'Фото',
        'review' => 'Отзыв',
        'review_reply' => 'Ответ на отзыв',
    ];

    /** Что проверить модератору по каждому типу. */
    public const HINTS = [
        'clinic' => 'Проверьте название, адрес и контакты: они должны совпадать с данными клиники. После одобрения карточка появится в каталоге.',
        'doctor' => 'Проверьте ФИО, должность и описание: без рекламных обещаний и чужих контактов. После одобрения врач появится на странице клиники.',
        'document' => 'Откройте файл и сверьте с ним тип, номер и даты. Номер лицензии можно проверить в реестре Росздравнадзора. На сайте публикуются только номер и отметка о проверке, сам файл пациенты не видят.',
        'photo' => 'Фото должно относиться к клинике: без чужих логотипов, водяных знаков, людей без согласия и медицинских снимков пациентов. После одобрения фото появится в галерее клиники.',
        'review' => 'Проверьте, что отзыв о реальном визите: без оскорблений, чужих персональных данных и рекламы. После одобрения отзыв опубликуется, при отклонении автор увидит причину.',
        'review_reply' => 'Ответ клиники должен быть вежливым, без персональных данных пациента и рекламы. После одобрения ответ появится под отзывом.',
    ];

    public const LICENSE_REGISTRY_URL = 'https://roszdravnadzor.gov.ru/services/licenses';

    /**
     * @return list<array<string, mixed>>
     */
    public function items(): array
    {
        $items = [
            ...$this->clinics(),
            ...$this->doctors(),
            ...$this->documents(),
            ...$this->photos(),
            ...$this->reviews(),
            ...$this->replies(),
        ];
        usort($items, fn (array $a, array $b) => $b['sort'] <=> $a['sort']);

        return array_map(function (array $item): array {
            unset($item['sort']);

            return $item;
        }, $items);
    }

    /** @return list<array<string, mixed>> */
    private function clinics(): array
    {
        return Clinic::where('status', 'pending')->with(['city:id,name', 'district:id,name', 'organization:id,name'])
            ->latest('updated_at')->limit(self::LIMIT)->get()
            ->map(fn (Clinic $c) => $this->item('clinic', $c->id, $c->name, $c, $c->updated_at, [
                'facts' => $this->facts([
                    'Организация' => $c->organization?->name,
                    'Город' => $c->city?->name,
                    'Район' => $c->district?->name,
                    'Адрес' => $c->address,
                    'Телефон' => $c->phone,
                    'E-mail' => $c->email,
                    'Сайт' => $c->website,
                    'Лицензия' => $c->license_number,
                ]),
                'body' => $c->description,
                'body_label' => 'Описание',
                'links' => [
                    ['label' => 'Карточка в админке', 'url' => '/admin/clinics/'.$c->id],
                    ['label' => 'Как увидят пациенты', 'url' => '/clinics/'.$c->slug, 'external' => true],
                ],
            ]))->all();
    }

    /** @return list<array<string, mixed>> */
    private function doctors(): array
    {
        return Doctor::where('status', 'pending')->with(['clinic:id,name,slug', 'specialties:id,name'])
            ->latest('updated_at')->limit(self::LIMIT)->get()
            ->map(fn (Doctor $d) => $this->item('doctor', $d->id, $d->name, $d->clinic, $d->updated_at, [
                'facts' => $this->facts([
                    'Должность' => $d->position,
                    'Направления' => $d->specialties->pluck('name')->implode(', '),
                    'Стаж' => $d->experience_years ? $d->experience_years.' '.$this->years($d->experience_years) : null,
                    'Консультация' => $d->consult_price ? number_format($d->consult_price, 0, ',', ' ').' ₽' : null,
                    'Принимает детей' => $d->accepts_children ? ($d->children_age_from ? 'да, с '.$d->children_age_from.' лет' : 'да') : 'нет',
                ]),
                'body' => $d->bio,
                'body_label' => 'О враче',
                'media' => $d->photo_path
                    ? ['kind' => 'image', 'url' => Storage::disk('public')->url($d->photo_path), 'caption' => 'Фото врача']
                    : ['kind' => 'doctor_art', 'seed' => $d->art_seed, 'caption' => 'Фото не загружено — на сайте будет иллюстрация'],
            ]))->all();
    }

    /** @return list<array<string, mixed>> */
    private function documents(): array
    {
        return ClinicDocument::where('status', 'pending')->with('clinic:id,name,slug')
            ->latest()->limit(self::LIMIT)->get()
            ->map(function (ClinicDocument $d) {
                $hasFile = $d->path && Storage::disk('local')->exists($d->path);
                $extension = strtolower(pathinfo((string) $d->path, PATHINFO_EXTENSION));

                return $this->item('document', $d->id, $d->title, $d->clinic, $d->created_at, [
                    'facts' => $this->facts([
                        'Тип' => MediaController::DOC_TYPES[$d->type] ?? 'Другое',
                        'Номер' => $d->number ?: 'не указан',
                        'Дата выдачи' => $d->issued_at ? Carbon::parse($d->issued_at)->format('d.m.Y') : null,
                        'Действует до' => $d->expires_at ? Carbon::parse($d->expires_at)->format('d.m.Y') : 'бессрочно',
                    ]),
                    'media' => $hasFile
                        ? [
                            'kind' => $extension === 'pdf' ? 'pdf' : 'image',
                            'url' => '/admin/moderation/documents/'.$d->id.'/view',
                            'download_url' => '/admin/moderation/documents/'.$d->id,
                            'caption' => $extension === 'pdf' ? 'PDF-документ' : 'Скан документа',
                        ]
                        : ['kind' => 'missing', 'caption' => 'Файл не приложен. Попросите клинику загрузить скан или отклоните документ с этой причиной.'],
                    'links' => $d->type === 'license'
                        ? [['label' => 'Проверить в реестре лицензий', 'url' => self::LICENSE_REGISTRY_URL, 'external' => true]]
                        : [],
                ]);
            })->all();
    }

    /** @return list<array<string, mixed>> */
    private function photos(): array
    {
        return ClinicPhoto::where('status', 'pending')->with('clinic:id,name,slug')
            ->latest()->limit(self::LIMIT)->get()
            ->map(function (ClinicPhoto $p) {
                $kind = MediaController::PHOTO_KINDS[$p->kind] ?? 'Другое';

                return $this->item('photo', $p->id, $p->caption ?: 'Фото: '.mb_strtolower($kind), $p->clinic, $p->created_at, [
                    'facts' => $this->facts(['Раздел галереи' => $kind, 'Подпись' => $p->caption ?: 'без подписи']),
                    'media' => $p->path
                        ? ['kind' => 'image', 'url' => Storage::disk('public')->url($p->path), 'caption' => $kind]
                        : ['kind' => 'photo_art', 'seed' => $p->art_seed, 'photo_kind' => $p->kind, 'caption' => 'Файл не загружен — это демо-иллюстрация, на сайте покажется она'],
                ]);
            })->all();
    }

    /** @return list<array<string, mixed>> */
    private function reviews(): array
    {
        return Review::where('status', 'pending')->with(['clinic:id,name,slug', 'doctor:id,name', 'service:id,name'])
            ->latest()->limit(self::LIMIT)->get()
            ->map(fn (Review $r) => $this->item('review', $r->id, $r->title ?: 'Отзыв от '.$r->author_name, $r->clinic, $r->created_at, [
                'facts' => $this->facts([
                    'Автор' => $r->author_name,
                    'Оценка' => $r->rating.' из 5',
                    'Врач' => $r->doctor?->name,
                    'Услуга' => $r->service?->name,
                    'Дата визита' => $r->visit_date ? Carbon::parse($r->visit_date)->format('d.m.Y') : null,
                    'Визит' => $r->is_verified_visit ? 'подтверждён записью через сайт' : 'не подтверждён',
                ]),
                'rating' => $r->rating,
                'body' => $r->body,
                'body_label' => 'Текст отзыва',
                'flags' => array_map(SensitiveTextGuard::flagLabel(...), $r->flags ?? []),
            ]))->all();
    }

    /** @return list<array<string, mixed>> */
    private function replies(): array
    {
        return Review::where('reply_status', 'pending')->with('clinic:id,name,slug')
            ->latest('updated_at')->limit(self::LIMIT)->get()
            ->map(fn (Review $r) => $this->item('review_reply', $r->id, 'Ответ клиники на отзыв', $r->clinic, $r->updated_at, [
                'facts' => $this->facts(['Отзыв от' => $r->author_name, 'Оценка' => $r->rating.' из 5']),
                'rating' => $r->rating,
                'context' => $r->body,
                'context_label' => 'Отзыв пациента',
                'body' => $r->reply_text,
                'body_label' => 'Ответ клиники',
            ]))->all();
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function item(string $type, int $id, string $title, ?Clinic $clinic, ?\DateTimeInterface $at, array $extra): array
    {
        return [
            'type' => $type,
            'type_label' => self::TYPE_LABELS[$type],
            'id' => $id,
            'title' => $title,
            'clinic' => $clinic && $type !== 'clinic' ? ['id' => $clinic->id, 'name' => $clinic->name] : null,
            'at' => $at?->format('d.m.Y H:i'),
            'sort' => $at?->getTimestamp() ?? 0,
            'hint' => self::HINTS[$type],
            'facts' => [],
            'body' => null,
            'body_label' => null,
            'context' => null,
            'context_label' => null,
            'media' => null,
            'links' => [],
            'flags' => [],
            'rating' => null,
            'note_required' => $type !== 'photo',
            ...$extra,
        ];
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

    private function years(int $n): string
    {
        $mod10 = $n % 10;
        $mod100 = $n % 100;

        return match (true) {
            $mod10 === 1 && $mod100 !== 11 => 'год',
            $mod10 >= 2 && $mod10 <= 4 && ($mod100 < 12 || $mod100 > 14) => 'года',
            default => 'лет',
        };
    }
}
