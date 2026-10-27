<?php

namespace App\Jobs;

use App\Models\Appointment;
use App\Services\Max\MaxBotClient;
use App\Services\Notifications\NotificationSubscriptionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;

class NotifyClinicOwnerMaxJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $appointmentId)
    {
        $this->afterCommit();
    }

    /** @return list<object> */
    public function middleware(): array
    {
        return [new RateLimited('max-bot')];
    }

    public function handle(MaxBotClient $client, NotificationSubscriptionService $subscriptions): void
    {
        $appointment = Appointment::query()
            ->with(['clinic.organization.owner'])
            ->find($this->appointmentId);

        $owner = $appointment?->clinic?->organization?->owner;
        if ($appointment === null || $owner === null) {
            return;
        }

        $maxUserId = $subscriptions->activeMaxUserId($owner);
        if ($maxUserId === null) {
            return;
        }

        $calendarUrl = url('/clinic-cabinet/calendar?date='.$appointment->starts_at->toDateString());
        $phone = $appointment->patient_phone ?: 'не указан';

        $text = sprintf(
            "Новая онлайн-запись\n\n%s\n%s\nПациент: %s\nТел.: %s\n\nОткройте календарь кабинета:",
            $appointment->clinic->name,
            $appointment->starts_at->format('d.m.Y H:i'),
            $appointment->patient_name,
            $phone,
        );

        $rows = [];
        $actionRow = [];

        if ($appointment->status === 'new' && $appointment->canTransitionTo('confirmed')) {
            $actionRow[] = [
                'type' => 'callback',
                'text' => 'Подтвердить',
                'payload' => 'appt:confirm:'.$appointment->id,
            ];
        }

        if ($appointment->status === 'pending' && $appointment->requested_starts_at) {
            $actionRow[] = [
                'type' => 'callback',
                'text' => 'Подтвердить перенос',
                'payload' => 'appt:approve_reschedule:'.$appointment->id,
            ];
        }

        if ($actionRow !== []) {
            $rows[] = $actionRow;
        }

        $tel = preg_replace('/\D+/', '', $phone) ?: '';
        $callRow = [['type' => 'link', 'text' => 'Календарь', 'url' => $calendarUrl]];
        if ($tel !== '') {
            $callRow[] = ['type' => 'link', 'text' => 'Позвонить', 'url' => 'tel:'.$tel];
        }
        $rows[] = $callRow;

        $client->sendToUser((int) $maxUserId, $text, $rows);
    }
}
