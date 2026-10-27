<?php

namespace App\Services\Assistant;

use App\Models\AssistantConversation;
use App\Models\Clinic;
use App\Models\Lead;
use App\Models\LeadDispatch;
use App\Models\User;
use App\Services\LeadService;
use App\Services\Organization\ClinicStaffNotifier;
use App\Support\ClinicNotificationEvents;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/** Заявка из диалога ассистента (явное согласие на ПД). */
class AssistantLeadService
{
    public function __construct(
        private readonly LeadService $leads,
        private readonly AssistantLeadRouterService $router,
    ) {}

    /**
     * @param  array<string, mixed>  $input
     * @return array{lead: Lead, message: string}
     */
    public function create(AssistantConversation $conversation, array $input, ?User $user): array
    {
        $phone = preg_replace('/\s+/', ' ', trim((string) ($input['phone'] ?? '')));
        if ($phone !== '' && $this->isDuplicatePhone($phone)) {
            throw ValidationException::withMessages([
                'phone' => 'Заявка с этим телефоном уже отправлялась за последние 24 часа. Дождитесь звонка клиники или укажите другой номер.',
            ]);
        }

        $payload = array_merge($input, ['consent' => true]);
        $broadcast = filter_var($payload['broadcast'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($broadcast) {
            return $this->createBroadcast($conversation, $payload, $user);
        }

        $validated = $this->leads->validate($payload);
        $lead = $this->leads->create(
            $validated,
            $user,
            'assistant',
            $conversation->id,
        );

        return [
            'lead' => $lead,
            'message' => 'Заявка отправлена. Клиника свяжется с вами для подтверждения записи.',
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array{lead: Lead, message: string}
     */
    private function createBroadcast(AssistantConversation $conversation, array $input, ?User $user): array
    {
        $conversation->loadMissing('city');
        $city = $conversation->city;
        if ($city === null) {
            throw ValidationException::withMessages(['broadcast' => 'Не удалось определить город для рассылки.']);
        }

        $preferredSlug = isset($input['clinic']) && is_string($input['clinic']) ? $input['clinic'] : null;
        /** @var Collection<int, Clinic> $clinics */
        $clinics = $this->router->pickBroadcastClinics($city, $preferredSlug);
        if ($clinics->isEmpty()) {
            throw ValidationException::withMessages([
                'broadcast' => 'В этом городе пока нет клиник, принимающих лиды ассистента.',
            ]);
        }

        $input['clinic'] = $clinics->first()->slug;
        $validated = $this->leads->validate($input);

        $lead = $this->leads->create(
            $validated,
            $user,
            'assistant',
            $conversation->id,
            assistantBroadcast: true,
        );

        foreach ($clinics as $clinic) {
            LeadDispatch::query()->create([
                'lead_id' => $lead->id,
                'clinic_id' => $clinic->id,
                'status' => 'sent',
            ]);
            $this->notifyClinicOwner($clinic, $lead, true);
        }

        $names = $clinics->pluck('name')->implode(', ');

        return [
            'lead' => $lead,
            'message' => 'Заявка отправлена '.$clinics->count().' клиникам города: '.$names.'. С вами свяжется одна из них.',
        ];
    }

    private function notifyClinicOwner(Clinic $clinic, Lead $lead, bool $broadcast): void
    {
        $organization = $clinic->organization;
        if ($organization === null) {
            return;
        }

        $body = $broadcast
            ? "Лид от ассистента (рассылка) — «{$clinic->name}», пациент {$lead->name}, {$lead->phone}."
            : "Заявка в «{$clinic->name}» от {$lead->name}, {$lead->phone}.";

        app(ClinicStaffNotifier::class)->notify(
            $organization,
            ClinicNotificationEvents::LEAD_NEW,
            'lead_new',
            'Новая заявка',
            $body,
            '/clinic-cabinet/leads?branch='.$clinic->id,
        );
    }

    private function isDuplicatePhone(string $phone): bool
    {
        return Lead::query()
            ->where('phone', $phone)
            ->where('created_at', '>=', now()->subDay())
            ->exists();
    }
}
