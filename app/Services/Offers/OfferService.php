<?php

namespace App\Services\Offers;

use App\Models\CampaignRecipient;
use App\Models\Clinic;
use App\Models\DemoLink;
use App\Models\Offer;
use App\Models\OfferTemplate;
use App\Models\OfferTemplateVersion;
use App\Models\ParsedOrganization;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class OfferService
{
    private const TOKEN_BYTES = 32;

    private const SHORT_CODE_LENGTH = 10;

    public function __construct(
        private readonly OfferRenderer $renderer,
        private readonly OfferSettings $settings,
        private readonly DemoCabinetData $demoData,
    ) {}

    /**
     * КП для черновика клиники: токены, демо-ссылка с ограничениями по умолчанию, снимок текста.
     * Повторный вызов для той же клиники возвращает действующее КП.
     *
     * @param  array<string, mixed>  $demoOverrides
     */
    public function createFor(Clinic $clinic, OfferTemplate $template, ?User $by = null, array $demoOverrides = []): Offer
    {
        if ($clinic->status !== 'draft') {
            throw new RuntimeException("КП формируется только для черновиков: «{$clinic->name}» уже {$clinic->status}.");
        }
        $existing = Offer::query()->where('clinic_id', $clinic->id)->whereNull('revoked_at')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))->latest('id')->first();
        if ($existing) {
            return $existing;
        }

        $version = $template->latestVersion ?? throw new RuntimeException('У шаблона нет содержимого.');
        $offerToken = $this->token();
        $demoToken = $this->token();

        $offer = DB::transaction(function () use ($clinic, $version, $by, $demoOverrides, $offerToken, $demoToken): Offer {
            $offer = Offer::create([
                'clinic_id' => $clinic->id,
                'parsed_organization_id' => ParsedOrganization::query()->where('clinic_id', $clinic->id)->value('id'),
                'offer_template_version_id' => $version->id,
                'token_hash' => Offer::hashToken($offerToken),
                'token_encrypted' => Crypt::encryptString($offerToken),
                'short_code' => $this->shortCode(),
                'snapshot' => [],
                'status' => 'ready',
                'expires_at' => now()->addDays($this->settings->all()['offer_expires_days']),
                'created_by' => $by?->id,
            ]);
            $this->createDemoLink($offer, $demoToken, $by, $demoOverrides);
            $offer->update(['snapshot' => $this->snapshot($offer, $version)]);

            return $offer;
        });

        $this->demoData->ensure($clinic);
        Audit::log('offers.created', $offer, ['clinic_id' => $clinic->id, 'template_version_id' => $version->id]);

        return $offer;
    }

    /**
     * @return array{web_title: string, web_html: string, email_subject: string, email_html: string, email_text: string, sms: string, messenger: string, call_script: string|null}
     */
    public function snapshot(Offer $offer, OfferTemplateVersion $version): array
    {
        return $this->renderer->render(
            $version->only(OfferTemplateVersion::CONTENT_FIELDS),
            $offer->clinic,
            $this->links($offer),
        );
    }

    /**
     * Ручная правка КП конкретной организации перед отправкой (сохраняется снимок).
     *
     * @param  array<string, string|null>  $content
     */
    public function customize(Offer $offer, array $content, ?User $by): void
    {
        $offer->update([
            'snapshot' => $this->renderer->render($content, $offer->clinic, $this->links($offer)),
            'custom_content' => $content,
            'is_customized' => true,
        ]);
        Audit::log('offers.customized', $offer, ['by' => $by?->id]);
    }

    /** Дополнительный текст (акции, спецпредложения): сохраняется и подставляется в {extra} всех версий КП. */
    public function setExtra(Offer $offer, ?string $text, ?User $by): void
    {
        $offer->extra_note = filled($text) ? trim((string) $text) : null;
        $content = is_array($offer->custom_content) ? $offer->custom_content : $offer->templateVersion?->only(OfferTemplateVersion::CONTENT_FIELDS);
        $offer->snapshot = $this->renderer->render((array) $content, $offer->clinic, $this->links($offer));
        $offer->save();
        Audit::log('offers.extra_updated', $offer, ['by' => $by?->id]);
    }

    /** @return array{offer_link: string, demo_link: string, preview_link: string, unsubscribe_link: string, extra: string} */
    public function links(Offer $offer): array
    {
        return [
            'offer_link' => $offer->shortUrl(),
            'demo_link' => route('offer.demo', ['code' => $offer->short_code]),
            'preview_link' => route('offer.preview', ['code' => $offer->short_code]),
            'unsubscribe_link' => '{unsubscribe_link}',
            'extra' => (string) ($offer->extra_note ?? ''),
        ];
    }

    public function recordView(Offer $offer): void
    {
        $offer->forceFill([
            'views_count' => $offer->views_count + 1,
            'first_viewed_at' => $offer->first_viewed_at ?? now(),
            'last_viewed_at' => now(),
            'status' => in_array($offer->status, ['ready', 'sent'], true) ? 'viewed' : $offer->status,
        ])->save();
        $this->advanceRecipients($offer, 'clicked');
    }

    public function advanceRecipients(Offer $offer, string $status): void
    {
        $offer->recipients()->whereNotIn('status', ['queued', 'failed', 'skipped', 'unsubscribed'])->get()
            ->each(fn (CampaignRecipient $r) => $r->advance($status));
    }

    public function revoke(Offer $offer, ?User $by, string $reason = 'Отозвано администратором'): void
    {
        $offer->update(['revoked_at' => now(), 'status' => 'revoked']);
        DemoLink::query()->where('offer_id', $offer->id)->whereNull('revoked_at')->update(['revoked_at' => now(), 'revoke_reason' => $reason]);
        Audit::log('offers.revoked', $offer, ['by' => $by?->id, 'reason' => $reason]);
    }

    /** Клиника подключилась: воронка, автоотзыв демо-ссылок, удаление демо-данных. */
    public function markConnected(Offer $offer, ?User $by): void
    {
        $offer->update(['status' => 'connected']);
        $this->advanceRecipients($offer, 'connected');
        DemoLink::query()->where('offer_id', $offer->id)->where('revoke_on_connect', true)->whereNull('revoked_at')
            ->update(['revoked_at' => now(), 'revoke_reason' => 'Клиника подключилась']);
        $this->demoData->purge($offer->clinic);
        Audit::log('offers.connected', $offer, ['by' => $by?->id]);
    }

    /**
     * Новая демо-ссылка вместо прежней: старые отзываются, ссылка в тексте КП ({demo_link}) ведёт на новую.
     *
     * @param  array<string, mixed>  $overrides
     */
    public function reissueDemoLink(Offer $offer, ?User $by, array $overrides = []): DemoLink
    {
        DemoLink::query()->where('offer_id', $offer->id)->whereNull('revoked_at')
            ->update(['revoked_at' => now(), 'revoke_reason' => 'Заменена новой ссылкой']);
        $link = $this->createDemoLink($offer, $this->token(), $by, $overrides);
        Audit::log('offers.demo_reissued', $offer, ['by' => $by?->id, 'demo_link_id' => $link->id]);

        return $link;
    }

    /** @param array<string, mixed> $overrides */
    public function createDemoLink(Offer $offer, string $token, ?User $by, array $overrides = []): DemoLink
    {
        $defaults = $this->settings->demo();
        $value = fn (string $key) => array_key_exists($key, $overrides) ? $overrides[$key] : $defaults[$key];
        $days = $value('expires_days');

        return DemoLink::create([
            'clinic_id' => $offer->clinic_id,
            'offer_id' => $offer->id,
            'token_hash' => Offer::hashToken($token),
            'token_encrypted' => Crypt::encryptString($token),
            'expires_at' => $days ? now()->addDays((int) $days) : null,
            'max_opens' => $value('max_opens') ?: null,
            'max_devices' => $value('max_devices') ?: null,
            'sections' => array_values(array_intersect((array) $value('sections'), array_keys(DemoLink::SECTIONS))) ?: ['dashboard'],
            'show_tariffs' => (bool) $value('show_tariffs'),
            'notify_manager' => (bool) $value('notify_manager'),
            'revoke_on_connect' => (bool) $value('revoke_on_connect'),
            'created_by' => $by?->id,
        ]);
    }

    private function token(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(self::TOKEN_BYTES)), '+/', '-_'), '=');
    }

    private function shortCode(): string
    {
        do {
            $code = Str::random(self::SHORT_CODE_LENGTH);
        } while (Offer::query()->where('short_code', $code)->exists());

        return $code;
    }
}
