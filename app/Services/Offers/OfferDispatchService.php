<?php

namespace App\Services\Offers;

use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Offer;
use App\Models\StopListEntry;
use App\Models\User;
use App\Rules\RussianPhone;
use App\Services\Audit;
use RuntimeException;

/**
 * Отправка одного КП из его карточки. Использует механику рассылок (стоп-лист, отписка, пиксель,
 * правило «не чаще раза в N дней»), но без массовой кампании: все отправки шаблона копятся
 * в служебной кампании со статусом «direct».
 */
class OfferDispatchService
{
    /** Каналы, отправляемые системой; остальные менеджер отправляет сам по готовому тексту. */
    public const AUTO = ['email', 'sms'];

    public const MANUAL = ['whatsapp', 'telegram', 'max', 'phone'];

    public function __construct(
        private readonly CampaignService $campaigns,
        private readonly OfferSettings $settings,
        private readonly SmsSender $sms,
    ) {}

    /**
     * Каналы для этого КП: доступность, контакт и причина, если канал недоступен.
     *
     * @return list<array{key: string, label: string, mode: string, available: bool, reason: string|null, contact: string|null, link: string|null, last: array{status: string, at: string|null}|null}>
     */
    public function channels(Offer $offer): array
    {
        $offer->loadMissing('clinic');
        $last = $offer->recipients()->latest('id')->get()->unique('channel')->keyBy('channel');

        return collect([...self::AUTO, ...self::MANUAL])->map(function (string $channel) use ($offer, $last): array {
            $contact = $this->campaigns->contactFor($offer->clinic, $channel);
            $reason = match (true) {
                $channel === 'email' && ! $this->emailConfigured() => 'Не настроена почта для КП (Интеграции → Почта для КП).',
                $channel === 'sms' && ! $this->sms->configured() => 'Не подключён SMS-шлюз (Интеграции → SMS).',
                in_array($channel, ['email', 'sms', 'whatsapp', 'phone'], true) && $contact === null => 'Нет подходящего контакта в карточке.',
                $contact !== null && StopListEntry::blocks($channel, $contact) => 'Контакт в стоп-листе.',
                default => null,
            };
            $recipient = $last->get($channel);

            return [
                'key' => $channel,
                'label' => Campaign::CHANNELS[$channel] ?? $channel,
                'mode' => in_array($channel, self::AUTO, true) ? 'auto' : 'manual',
                'available' => $reason === null,
                'reason' => $reason,
                'contact' => $contact,
                'link' => $reason === null ? $this->manualLink($offer, $channel, $contact) : null,
                'last' => $recipient ? ['status' => $recipient->status, 'at' => $recipient->sent_at?->format('d.m.Y H:i')] : null,
            ];
        })->values()->all();
    }

    /**
     * Отправить КП в канал. Автоканалы уходят сразу, ручные отмечаются как отправленные менеджером.
     */
    public function send(Offer $offer, string $channel, User $by, ?string $contact = null): CampaignRecipient
    {
        if (! $offer->isAvailable()) {
            throw new RuntimeException('КП отозвано или истекло — сформируйте новое.');
        }
        $info = collect($this->channels($offer))->firstWhere('key', $channel) ?? throw new RuntimeException('Неизвестный канал.');
        $contact = filled($contact) ? $this->normalizeContact($channel, (string) $contact) : $info['contact'];
        if (! $info['available'] && ! ($contact && $info['reason'] === 'Нет подходящего контакта в карточке.')) {
            throw new RuntimeException((string) $info['reason']);
        }
        if (($contact === null || $contact === '') && in_array($channel, ['telegram', 'max'], true)) {
            // Мессенджер без известного контакта: менеджер отправляет сам, учитываем по клинике.
            $contact = 'clinic:'.$offer->clinic_id;
        }
        if ($contact === null || $contact === '') {
            throw new RuntimeException('Укажите контакт получателя.');
        }
        if (StopListEntry::blocks($channel, $contact)) {
            throw new RuntimeException('Контакт в стоп-листе.');
        }
        $days = $this->settings->rules()['min_days_between'];
        $recent = CampaignRecipient::query()->where('channel', $channel)->where('contact', $contact)
            ->where('offer_id', '!=', $offer->id)->where('sent_at', '>', now()->subDays($days))->exists();
        if ($recent) {
            throw new RuntimeException("Этот контакт уже получал КП за последние {$days} дн.");
        }

        $recipient = CampaignRecipient::query()->updateOrCreate(
            ['campaign_id' => $this->directCampaign($offer, $by)->id, 'clinic_id' => $offer->clinic_id, 'channel' => $channel],
            ['offer_id' => $offer->id, 'contact' => $contact, 'status' => 'queued', 'error' => null, 'sent_by' => $by->id],
        );

        if (in_array($channel, self::AUTO, true)) {
            $this->campaigns->deliver($recipient);
            $recipient->refresh();
            if ($recipient->status !== 'sent') {
                throw new RuntimeException('Не удалось отправить: '.($recipient->error ?? 'ошибка провайдера'));
            }
        } else {
            $this->campaigns->markManual($recipient, 'sent', $by);
        }
        Audit::log('offers.sent', $offer, ['channel' => $channel, 'by' => $by->id]);

        return $recipient;
    }

    /** Контакт, введённый менеджером: телефон приводится к +7XXXXXXXXXX, email проверяется. */
    private function normalizeContact(string $channel, string $value): string
    {
        if (in_array($channel, ['sms', 'phone', 'whatsapp'], true)) {
            if (! RussianPhone::isValid($value)) {
                throw new RuntimeException('Укажите российский номер в формате +7 (900) 000-00-00.');
            }

            return RussianPhone::normalize($value);
        }
        if ($channel === 'email' && filter_var(trim($value), FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException('Некорректный email.');
        }

        return StopListEntry::normalize($channel, $value);
    }

    public function emailConfigured(): bool
    {
        return filled(config('mail.mailers.offers.host'));
    }

    /** Готовая ссылка для ручной отправки: мессенджер откроется с подставленным текстом. */
    private function manualLink(Offer $offer, string $channel, ?string $contact): ?string
    {
        $text = (string) ($offer->snapshot['messenger'] ?? '');
        $digits = preg_replace('/\D+/', '', (string) $contact) ?? '';

        return match ($channel) {
            'whatsapp' => $digits !== '' ? 'https://wa.me/'.$digits.'?text='.rawurlencode($text) : null,
            'telegram' => 'https://t.me/share/url?url='.rawurlencode($offer->shortUrl()).'&text='.rawurlencode($text),
            'phone' => $digits !== '' ? 'tel:+'.$digits : null,
            default => null,
        };
    }

    private function directCampaign(Offer $offer, User $by): Campaign
    {
        $offer->loadMissing('templateVersion');
        $templateId = (int) $offer->templateVersion?->offer_template_id;

        return Campaign::query()->firstOrCreate(
            ['offer_template_id' => $templateId, 'status' => 'direct'],
            ['name' => 'Отправки из карточек КП', 'channels' => [...self::AUTO, ...self::MANUAL], 'created_by' => $by->id, 'started_at' => now()],
        );
    }
}
