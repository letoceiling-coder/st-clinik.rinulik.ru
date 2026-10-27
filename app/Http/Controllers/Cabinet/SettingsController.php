<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\NotificationSubscription;
use App\Models\Tariff;
use App\Services\Audit;
use App\Services\Monetization\ClinicSubscriptionService;
use App\Services\Notifications\NotificationPreferenceService;
use App\Services\Organization\CabinetAuthorization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class SettingsController extends CabinetController
{
    public function index(
        Request $request,
        NotificationPreferenceService $preferences,
        ClinicSubscriptionService $subscriptions,
    ): Response {
        $branch = $this->branch($request);
        $assistantFeature = $subscriptions->featureEnabled($branch, Tariff::FEATURE_ASSISTANT_LEADS);

        return $this->render($request, 'Cabinet/Settings', 'Настройки', [
            'notification_preferences' => $preferences->matrixForClinic($request->user()),
            'notification_channel_labels' => [
                'in_app' => 'На сайте',
                NotificationSubscription::CHANNEL_EMAIL => 'E-mail',
                NotificationSubscription::CHANNEL_MAX => 'MAX',
                NotificationSubscription::CHANNEL_WEB_PUSH => 'Push',
            ],
            'assistant_leads' => [
                'enabled' => $assistantFeature,
                'accepts' => (bool) $branch->accepts_assistant_leads,
                'can_manage' => app(CabinetAuthorization::class)
                    ->allows($request->user(), $request->attributes->get('org'), CabinetAuthorization::ABILITY_MANAGE_ORGANIZATION),
            ],
        ]);
    }

    public function updateNotifications(Request $request, NotificationPreferenceService $preferences): RedirectResponse
    {
        $data = $request->validate([
            'preferences' => ['required', 'array'],
            'preferences.*.key' => ['required', 'string', 'max:64'],
            'preferences.*.channels' => ['array'],
            'preferences.*.channels.*' => ['string', 'max:24'],
        ]);

        foreach ($data['preferences'] as $row) {
            $preferences->update($request->user(), (string) $row['key'], $row['channels'] ?? []);
        }

        return back()->with('success', 'Настройки уведомлений сохранены.');
    }

    public function updateAssistantLeads(Request $request, ClinicSubscriptionService $subscriptions): RedirectResponse
    {
        $branch = $this->branch($request);
        abort_unless(
            $subscriptions->featureEnabled($branch, Tariff::FEATURE_ASSISTANT_LEADS),
            422,
            'Приём лидов ассистента недоступен на вашем тарифе.',
        );

        $data = $request->validate(['accepts_assistant_leads' => ['required', 'boolean']]);
        $branch->update(['accepts_assistant_leads' => $data['accepts_assistant_leads']]);
        Audit::log('cabinet.assistant_leads', $branch, ['accepts' => $data['accepts_assistant_leads']]);

        return back()->with('success', $data['accepts_assistant_leads']
            ? 'Филиал участвует в рассылке лидов ассистента.'
            : 'Приём лидов ассистента отключён для этого филиала.');
    }
}
