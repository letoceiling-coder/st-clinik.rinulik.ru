<?php

namespace App\Services\Assistant;

use App\Models\Clinic;
use App\Models\Lead;
use App\Models\LeadDispatch;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** «Беру в работу» для лидов ассистента с рассылкой по клиникам. */
class AssistantLeadAcceptService
{
    public function __construct(private readonly AssistantSettings $settings) {}

    public function accept(Lead $lead, Clinic $clinic, ?User $actor): LeadDispatch
    {
        if (! $lead->assistant_broadcast) {
            throw ValidationException::withMessages([
                'lead' => 'Для одиночной заявки используйте смену статуса.',
            ]);
        }

        return DB::transaction(function () use ($lead, $clinic) {
            $lead = Lead::query()->lockForUpdate()->findOrFail($lead->id);

            $dispatch = LeadDispatch::query()
                ->where('lead_id', $lead->id)
                ->where('clinic_id', $clinic->id)
                ->lockForUpdate()
                ->first();

            if ($dispatch === null) {
                throw ValidationException::withMessages(['lead' => 'Заявка не отправлялась в эту клинику.']);
            }

            $winner = LeadDispatch::query()
                ->where('lead_id', $lead->id)
                ->where('status', 'accepted')
                ->exists();

            if ($winner) {
                throw ValidationException::withMessages([
                    'lead' => 'Пациента уже взяли в работу другой клиникой.',
                ]);
            }

            $dispatch->update([
                'status' => 'accepted',
                'accepted_at' => now(),
                'viewed_at' => $dispatch->viewed_at ?? now(),
            ]);

            $exclusive = (bool) ($this->settings->get()['assistant_lead_exclusive_first'] ?? true);
            if ($exclusive) {
                LeadDispatch::query()
                    ->where('lead_id', $lead->id)
                    ->where('id', '!=', $dispatch->id)
                    ->whereIn('status', ['sent', 'viewed'])
                    ->update(['status' => 'expired']);

                $lead->update([
                    'clinic_id' => $clinic->id,
                    'status' => $lead->status === 'new' ? 'confirmed' : $lead->status,
                ]);
            }

            $this->notifyPatient($lead, $clinic);
            $this->notifyOtherClinics($lead, $clinic);

            return $dispatch->fresh();
        });
    }

    public function markViewed(Lead $lead, Clinic $clinic): void
    {
        LeadDispatch::query()
            ->where('lead_id', $lead->id)
            ->where('clinic_id', $clinic->id)
            ->where('status', 'sent')
            ->update([
                'status' => 'viewed',
                'viewed_at' => now(),
            ]);
    }

    private function notifyPatient(Lead $lead, Clinic $clinic): void
    {
        if ($lead->user_id === null) {
            return;
        }

        UserNotification::create([
            'user_id' => $lead->user_id,
            'type' => 'lead_status',
            'title' => 'Клиника свяжется с вами',
            'body' => "«{$clinic->name}» взяла вашу заявку от ассистента в работу и перезвонит для записи.",
            'url' => '/account/leads',
        ]);
    }

    private function notifyOtherClinics(Lead $lead, Clinic $winner): void
    {
        $others = LeadDispatch::query()
            ->where('lead_id', $lead->id)
            ->where('clinic_id', '!=', $winner->id)
            ->where('status', 'expired')
            ->with('clinic.organization.owner')
            ->get();

        foreach ($others as $row) {
            $owner = $row->clinic?->organization?->owner;
            if ($owner === null) {
                continue;
            }

            UserNotification::create([
                'user_id' => $owner->id,
                'type' => 'lead_new',
                'title' => 'Лид уже в работе',
                'body' => "Заявку от {$lead->name} уже взяла клиника «{$winner->name}».",
                'url' => '/clinic-cabinet/leads',
            ]);
        }
    }
}
