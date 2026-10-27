<?php

namespace App\Services\Notifications;

use App\Models\Appointment;
use App\Models\User;
use App\Models\UserNotification;
use App\Notifications\AppointmentStatusNotification;
use App\Support\NotificationEvents;
use Illuminate\Support\Facades\Notification;

class NotificationDispatcher
{
    public function __construct(private readonly NotificationPreferenceService $preferences) {}

    public function appointmentStatusChanged(Appointment $appointment, ?string $from, string $to): void
    {
        $user = $appointment->user;
        if (! $user instanceof User) {
            return;
        }

        $notification = AppointmentStatusNotification::fromTransition($appointment, $from, $to);
        if ($notification === null) {
            return;
        }

        $this->send($user, $appointment, $notification);
    }

    public function send(User $user, Appointment $appointment, AppointmentStatusNotification $notification): void
    {
        $eventKey = $notification->eventKey();

        if ($this->preferences->allows($user, $eventKey, 'in_app')) {
            UserNotification::query()->create([
                'user_id' => $user->id,
                'type' => 'appointment',
                'title' => NotificationEvents::label($eventKey),
                'body' => $this->inAppBody($appointment),
                'url' => route('account.appointments'),
            ]);
        }

        Notification::send($user, $notification);
    }

    private function inAppBody(Appointment $appointment): string
    {
        $appointment->loadMissing(['clinic', 'doctor']);
        $when = $appointment->starts_at?->timezone(config('app.timezone'))->format('d.m.Y H:i') ?? '—';
        $clinic = $appointment->clinic?->name ?? 'клиника';
        $doctor = $appointment->doctor?->name;

        return trim(collect([
            $doctor ? "{$doctor}," : null,
            "{$clinic}, {$when}",
        ])->filter()->implode(' '));
    }
}
