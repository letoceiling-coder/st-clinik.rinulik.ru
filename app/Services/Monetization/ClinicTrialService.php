<?php

namespace App\Services\Monetization;

use App\Models\Clinic;
use App\Models\ClinicSubscription;
use App\Models\CmsPage;
use App\Models\Organization;
use App\Models\Tariff;
use App\Models\User;
use App\Models\UserNotification;
use App\Rules\RussianPhone;
use App\Services\Audit;
use Illuminate\Http\Request;

/**
 * Пробный период для клиники, подключившейся по КП.
 *
 * Клиника принимает соглашение и соглашается на публикацию → карточка уходит на модерацию,
 * пробный период запрашивается. После одобрения модератором включается подписка на тариф
 * пробного периода. Одна организация (и один ИНН / телефон) — один пробный период.
 */
class ClinicTrialService
{
    public const AGREEMENT_SLUG = 'clinic-agreement';

    public function __construct(
        private readonly MonetizationSettings $settings,
        private readonly ClinicSubscriptionService $subscriptions,
    ) {}

    /** Версия соглашения — хэш текста: при правке текста меняется и версия, принятие фиксируется заново. */
    public function agreementVersion(): string
    {
        $body = (string) CmsPage::query()->where('slug', self::AGREEMENT_SLUG)->value('body');

        return 'v-'.substr(sha1($body), 0, 12);
    }

    public function agreementUrl(): string
    {
        return route('alias.'.self::AGREEMENT_SLUG);
    }

    /** Причина, по которой пробный период не положен, или null. */
    public function ineligibleReason(Organization $organization, Clinic $clinic): ?string
    {
        if (! $this->settings->trialEnabled()) {
            return 'Пробный период сейчас не предоставляется.';
        }
        if ($organization->trial_used_at !== null) {
            return 'Пробный период для этой организации уже использован.';
        }
        if (filled($organization->inn) && Organization::query()->where('inn', $organization->inn)->whereKeyNot($organization->id)->whereNotNull('trial_used_at')->exists()) {
            return 'Пробный период для этого ИНН уже использован.';
        }
        if (filled($clinic->phone) && RussianPhone::isValid((string) $clinic->phone)) {
            $digits = substr(preg_replace('/\D+/', '', (string) $clinic->phone) ?? '', -10);
            $used = ClinicSubscription::query()->where('is_trial', true)
                ->whereHas('clinic', fn ($q) => $q->whereKeyNot($clinic->id)->where('phone', 'like', '%'.substr($digits, -4)))
                ->with('clinic:id,phone')->get()
                ->contains(fn (ClinicSubscription $s) => substr(preg_replace('/\D+/', '', (string) $s->clinic?->phone) ?? '', -10) === $digits);
            if ($used) {
                return 'Пробный период для этого номера клиники уже использован.';
            }
        }

        return null;
    }

    /**
     * Принятие соглашения и согласие на публикацию: карточка уходит на модерацию, пробный период запрашивается.
     */
    public function request(Organization $organization, Clinic $clinic, User $user, ?Request $request = null): bool
    {
        $organization->forceFill([
            'agreement_version' => $this->agreementVersion(),
            'agreement_accepted_at' => now(),
            'agreement_ip_hash' => $request ? hash('sha256', (string) $request->ip().config('app.key')) : null,
        ]);
        $eligible = $this->ineligibleReason($organization, $clinic) === null;
        if ($eligible) {
            $organization->trial_requested_at = now();
        }
        $organization->save();

        if (in_array($clinic->status, ['draft', 'rejected'], true)) {
            $clinic->update(['status' => 'pending', 'moderation_note' => null]);
        }
        Audit::log('trial.requested', $clinic, ['user_id' => $user->id, 'eligible' => $eligible, 'agreement' => $organization->agreement_version]);

        return $eligible;
    }

    /** Вызывается после одобрения карточки модератором. */
    public function activateIfRequested(Clinic $clinic): ?ClinicSubscription
    {
        $organization = $clinic->organization;
        if ($organization === null || $organization->trial_requested_at === null || $organization->trial_used_at !== null) {
            return null;
        }
        if ($this->ineligibleReason($organization, $clinic) !== null) {
            return null;
        }
        $tariff = $this->tariff();
        if ($tariff === null) {
            return null;
        }

        $days = $this->settings->trialDays();
        $subscription = $this->subscriptions->activate($clinic, $tariff, null, now(), now()->addDays($days));
        $subscription->update(['is_trial' => true, 'auto_renew' => false]);
        $organization->update(['trial_used_at' => now()]);

        if ($organization->owner_id) {
            UserNotification::create([
                'user_id' => $organization->owner_id,
                'type' => 'trial_started',
                'title' => "Пробный период: {$days} дней",
                'body' => "Для «{$clinic->name}» включён тариф «{$tariff->name}» до ".$subscription->ends_at->format('d.m.Y').'. Опубликуйте карточку в кабинете.',
                'url' => '/clinic-cabinet/payments',
            ]);
        }
        Audit::log('trial.activated', $clinic, ['tariff_id' => $tariff->id, 'days' => $days]);

        return $subscription;
    }

    /** Тариф пробного периода: из настроек, иначе самый дорогой активный (полный набор возможностей). */
    public function tariff(): ?Tariff
    {
        $id = $this->settings->trialTariffId();
        $configured = $id ? Tariff::query()->where('is_active', true)->find($id) : null;

        return $configured ?? Tariff::query()->where('is_active', true)->orderByDesc('price')->orderByDesc('sort')->first();
    }
}
