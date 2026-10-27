<?php

namespace App\Services\Offers;

use App\Jobs\SendCampaignBatch;
use App\Mail\OfferMail;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Clinic;
use App\Models\OrganizationContact;
use App\Models\ParsedOrganization;
use App\Models\StopListEntry;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use RuntimeException;

/**
 * Кампании КП: подбор черновиков, получатели с учётом стоп-листа и частоты, отправка email/SMS, ручные каналы.
 * Рабочие часы считаются по московскому времени: часового пояса у городов пока нет.
 */
class CampaignService
{
    /** Какие типы контактов подходят каналу (в порядке приоритета). */
    public const CONTACT_TYPES = [
        'email' => ['email'],
        'sms' => ['phone'],
        'phone' => ['phone'],
        'vk' => ['vk'],
        'max' => ['max'],
        'telegram' => ['telegram'],
        'whatsapp' => ['whatsapp', 'phone'],
    ];

    public const TIMEZONE = 'Europe/Moscow';

    public function __construct(
        private readonly OfferService $offers,
        private readonly OfferSettings $settings,
        private readonly SmsSender $sms,
    ) {}

    /**
     * Черновики клиник под фильтры кампании.
     *
     * @param  array{city_id?: int|null, rating_min?: float|null, has?: list<string>, not_offered?: bool, ids?: list<int>}  $filters
     * @return Builder<Clinic>
     */
    public function candidates(array $filters): Builder
    {
        $contactsOf = fn (string $type) => OrganizationContact::query()->select('clinic_id')
            ->whereNotNull('clinic_id')->where('type', $type)->where('do_not_contact', false);

        return Clinic::query()->where('status', 'draft')
            ->when($filters['ids'] ?? [], fn (Builder $q, array $ids) => $q->whereIn('id', $ids))
            ->when($filters['city_id'] ?? null, fn (Builder $q, int $id) => $q->where('city_id', $id))
            ->when($filters['rating_min'] ?? null, fn (Builder $q, float $min) => $q->whereIn(
                'id', ParsedOrganization::query()->select('clinic_id')->whereNotNull('clinic_id')->where('rating', '>=', $min),
            ))
            ->when($filters['has'] ?? [], function (Builder $q, array $types) use ($contactsOf): void {
                foreach ($types as $type) {
                    $q->whereIn('id', $contactsOf($type));
                }
            })
            ->when($filters['not_offered'] ?? false, fn (Builder $q) => $q->whereNotIn(
                'id', CampaignRecipient::query()->select('clinic_id')->whereNotNull('sent_at'),
            ));
    }

    /**
     * Формирует КП и получателей. Повторный вызов добавляет только новых.
     *
     * @return array{recipients: int, skipped: int, errors: list<string>}
     */
    public function build(Campaign $campaign, ?User $by): array
    {
        $rules = $this->settings->rules();
        $seen = CampaignRecipient::query()->where('campaign_id', $campaign->id)->whereNotIn('status', ['skipped'])
            ->get(['channel', 'contact'])->mapWithKeys(fn (CampaignRecipient $r) => ["{$r->channel}|{$r->contact}" => true])->all();
        $result = ['recipients' => 0, 'skipped' => 0, 'errors' => []];

        $this->candidates((array) $campaign->filters)->with('city:id,name')->orderBy('id')
            ->chunkById(100, function ($clinics) use ($campaign, $by, $rules, &$seen, &$result): void {
                foreach ($clinics as $clinic) {
                    try {
                        $offer = $this->offers->createFor($clinic, $campaign->template, $by);
                    } catch (RuntimeException $e) {
                        $result['errors'][] = $e->getMessage();

                        continue;
                    }

                    foreach ((array) $campaign->channels as $channel) {
                        $contact = $this->contactFor($clinic, $channel);
                        $skip = match (true) {
                            $contact === null => 'Нет контакта для канала',
                            StopListEntry::blocks($channel, $contact) => 'Контакт в стоп-листе',
                            isset($seen["{$channel}|{$contact}"]) => 'Контакт уже есть в кампании (филиал той же сети)',
                            $this->recentlyContacted($channel, $contact, $rules['min_days_between']) => "Уже получал КП за последние {$rules['min_days_between']} дн.",
                            default => null,
                        };
                        $recipient = CampaignRecipient::query()->firstOrNew([
                            'campaign_id' => $campaign->id, 'clinic_id' => $clinic->id, 'channel' => $channel,
                        ]);
                        if ($recipient->exists && $recipient->status !== 'skipped') {
                            continue;
                        }
                        $recipient->fill([
                            'offer_id' => $offer->id,
                            'contact' => $contact ?? '',
                            'status' => $skip === null ? 'queued' : 'skipped',
                            'error' => $skip,
                        ])->save();

                        if ($skip === null) {
                            $seen["{$channel}|{$contact}"] = true;
                            $result['recipients']++;
                        } else {
                            $result['skipped']++;
                        }
                    }
                }
            });

        Audit::log('campaigns.built', $campaign, ['by' => $by?->id] + $result);

        return $result;
    }

    public function start(Campaign $campaign, ?User $by): void
    {
        $campaign->update(['status' => 'running', 'started_at' => $campaign->started_at ?? now()]);
        SendCampaignBatch::dispatch($campaign->id);
        Audit::log('campaigns.started', $campaign, ['by' => $by?->id]);
    }

    public function pause(Campaign $campaign, ?User $by): void
    {
        $campaign->update(['status' => 'paused']);
        Audit::log('campaigns.paused', $campaign, ['by' => $by?->id]);
    }

    /**
     * Отправляет порцию автоматических сообщений с учётом рабочих часов и дневных лимитов.
     *
     * @return Carbon|null когда продолжить (null — продолжать не нужно)
     */
    public function sendBatch(Campaign $campaign, int $size = 25): ?Carbon
    {
        if ($campaign->status !== 'running') {
            return null;
        }

        $rules = $this->settings->rules();
        $now = now(self::TIMEZONE);
        if ($now->hour < $rules['send_from_hour'] || $now->hour >= $rules['send_to_hour']) {
            return $this->nextWindow($now, $rules['send_from_hour']);
        }

        $limitHit = false;
        $pending = false;
        foreach (array_intersect(Campaign::AUTO_CHANNELS, (array) $campaign->channels) as $channel) {
            $left = max(0, $rules["daily_{$channel}"] - $this->sentToday($channel));
            $queue = $campaign->recipients()->where('channel', $channel)->where('status', 'queued')->orderBy('id')->limit(min($size, $left))->get();
            foreach ($queue as $recipient) {
                $this->deliver($recipient);
            }
            $remaining = $campaign->recipients()->where('channel', $channel)->where('status', 'queued')->exists();
            $pending = $pending || $remaining;
            $limitHit = $limitHit || ($remaining && $left <= $queue->count());
        }

        if (! $pending) {
            if (! $campaign->recipients()->where('status', 'queued')->exists()) {
                $campaign->update(['status' => 'completed', 'completed_at' => now()]);
            }

            return null;
        }

        return $limitHit ? $this->nextWindow($now->copy()->addDay()->startOfDay(), $rules['send_from_hour']) : now()->addMinute();
    }

    /** Отправка одного автоматического сообщения; ошибки сохраняются в получателе. */
    public function deliver(CampaignRecipient $recipient): void
    {
        $recipient->loadMissing('offer.clinic', 'campaign');
        $offer = $recipient->offer;
        if (StopListEntry::blocks($recipient->channel, $recipient->contact)) {
            $recipient->update(['status' => 'skipped', 'error' => 'Контакт в стоп-листе']);

            return;
        }
        if ($offer === null || ! $offer->isAvailable()) {
            $recipient->update(['status' => 'skipped', 'error' => 'КП отозвано или истекло']);

            return;
        }

        try {
            $providerId = match ($recipient->channel) {
                'email' => $this->sendEmail($recipient),
                'sms' => $this->sms->send($recipient->contact, (string) ($offer->snapshot['sms'] ?? '')),
                default => throw new RuntimeException('Канал отправляется вручную.'),
            };
            $recipient->forceFill(['provider_id' => $providerId, 'error' => null, 'attempts' => $recipient->attempts + 1]);
            $recipient->advance('sent');
            if ($offer->status === 'ready') {
                $offer->update(['status' => 'sent']);
            }
        } catch (\Throwable $e) {
            $attempts = $recipient->attempts + 1;
            $recipient->update([
                'attempts' => $attempts,
                'error' => mb_substr($e->getMessage(), 0, 250),
                'status' => $attempts >= 3 ? 'failed' : 'queued',
            ]);
        }
    }

    /** Менеджер отправил сообщение вручную (звонок, VK, MAX, Telegram, WhatsApp). */
    public function markManual(CampaignRecipient $recipient, string $status, ?User $by): void
    {
        if ($status === 'unsubscribed') {
            StopListEntry::add($recipient->channel, $recipient->contact, 'unsubscribed', $by?->id, 'Отказ при ручном контакте');
        }
        $recipient->forceFill(['sent_by' => $by?->id]);
        $recipient->advance($status);
        if ($status === 'sent' && $recipient->offer?->status === 'ready') {
            $recipient->offer->update(['status' => 'sent']);
        }
        if ($status === 'connected' && $recipient->offer) {
            $this->offers->markConnected($recipient->offer, $by);
        }
    }

    /** Готовый текст для ручного канала с подставленными ссылками. */
    public function manualText(CampaignRecipient $recipient): string
    {
        $snapshot = (array) $recipient->offer?->snapshot;

        return $recipient->channel === 'phone'
            ? (string) ($snapshot['call_script'] ?? $snapshot['messenger'] ?? '')
            : (string) ($snapshot['messenger'] ?? '');
    }

    public function unsubscribeUrl(CampaignRecipient $recipient): string
    {
        return url(URL::signedRoute('offers.unsubscribe', ['recipient' => $recipient->id], absolute: false));
    }

    public function pixelUrl(CampaignRecipient $recipient): string
    {
        return url(URL::signedRoute('offers.pixel', ['recipient' => $recipient->id], absolute: false));
    }

    /** Письмо получателю: ссылка отписки персональная, пиксель — только в рассылке. */
    public function emailFor(CampaignRecipient $recipient, bool $withPixel = true): OfferMail
    {
        $snapshot = (array) $recipient->offer?->snapshot;
        $url = $this->unsubscribeUrl($recipient);
        $link = '<a href="'.e($url).'">'.e($url).'</a>';

        return new OfferMail(
            subjectLine: (string) ($snapshot['email_subject'] ?? ''),
            bodyHtml: str_replace('{unsubscribe_link}', $link, (string) ($snapshot['email_html'] ?? '')),
            bodyText: str_replace('{unsubscribe_link}', $url, (string) ($snapshot['email_text'] ?? '')),
            unsubscribeUrl: $url,
            pixelUrl: $withPixel ? $this->pixelUrl($recipient) : null,
        );
    }

    private function sendEmail(CampaignRecipient $recipient): string
    {
        $sent = Mail::mailer('offers')->to($recipient->contact)->send($this->emailFor($recipient));

        return (string) $sent?->getMessageId();
    }

    private function contactFor(Clinic $clinic, string $channel): ?string
    {
        $contacts = OrganizationContact::query()->where('clinic_id', $clinic->id)->where('do_not_contact', false)
            ->whereIn('type', self::CONTACT_TYPES[$channel] ?? [])->orderByDesc('is_verified')->orderBy('id')->get();

        foreach (self::CONTACT_TYPES[$channel] ?? [] as $type) {
            foreach ($contacts->where('type', $type) as $contact) {
                $value = StopListEntry::normalize($channel, (string) $contact->value);
                $valid = match ($channel) {
                    'email' => filter_var($value, FILTER_VALIDATE_EMAIL) !== false,
                    'sms', 'whatsapp' => preg_match('/^\+79\d{9}$/', $value) === 1 || ($type === 'whatsapp' && strlen($value) >= 11),
                    'phone' => strlen($value) >= 11,
                    default => $value !== '',
                };
                if ($valid) {
                    return $value;
                }
            }
        }

        if (in_array($channel, ['phone', 'sms', 'whatsapp'], true) && filled($clinic->phone)) {
            $value = StopListEntry::normalize($channel, (string) $clinic->phone);

            return $channel === 'phone' || preg_match('/^\+79\d{9}$/', $value) === 1 ? $value : null;
        }

        return null;
    }

    private function recentlyContacted(string $channel, string $contact, int $days): bool
    {
        if ($days <= 0) {
            return false;
        }
        $channels = in_array($channel, ['sms', 'phone', 'whatsapp'], true) ? ['sms', 'phone', 'whatsapp'] : [$channel];

        return CampaignRecipient::query()->whereIn('channel', $channels)->where('contact', $contact)
            ->where('sent_at', '>=', now()->subDays($days))->exists();
    }

    private function sentToday(string $channel): int
    {
        return CampaignRecipient::query()->where('channel', $channel)
            ->where('sent_at', '>=', now(self::TIMEZONE)->startOfDay()->utc())->count();
    }

    private function nextWindow(Carbon $from, int $hour): Carbon
    {
        $start = $from->copy()->setTime($hour, 0);

        return ($start->lessThanOrEqualTo($from) ? $start->addDay() : $start)->utc();
    }
}
