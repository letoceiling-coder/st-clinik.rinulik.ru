<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Notifications\AppointmentStatusNotification;
use App\Services\Notifications\NotificationDispatcher;
use App\Support\NotificationEvents;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class SendAppointmentReminders extends Command
{
    protected $signature = 'notifications:appointment-reminders';

    protected $description = 'Напоминания о записи за 24 часа и за 2 часа';

    public function handle(NotificationDispatcher $dispatcher): int
    {
        $this->sendWindow(NotificationEvents::APPOINTMENT_REMINDER_24H, 23, 25, $dispatcher);
        $this->sendWindow(NotificationEvents::APPOINTMENT_REMINDER_2H, 1, 3, $dispatcher);

        return self::SUCCESS;
    }

    private function sendWindow(string $eventKey, int $hoursMin, int $hoursMax, NotificationDispatcher $dispatcher): void
    {
        $from = now()->addHours($hoursMin);
        $to = now()->addHours($hoursMax);

        Appointment::query()
            ->active()
            ->whereNotNull('user_id')
            ->whereBetween('starts_at', [$from, $to])
            ->with(['clinic', 'doctor', 'service', 'user'])
            ->orderBy('id')
            ->chunkById(100, function ($appointments) use ($eventKey, $dispatcher) {
                foreach ($appointments as $appointment) {
                    $cacheKey = "appt-reminder:{$appointment->id}:".str_replace('.', '_', $eventKey);
                    if (! Cache::add($cacheKey, 1, $appointment->starts_at->copy()->addHour())) {
                        continue;
                    }

                    $user = $appointment->user;
                    if ($user === null) {
                        continue;
                    }

                    $notification = AppointmentStatusNotification::forReminder($appointment, $eventKey);
                    $dispatcher->send($user, $appointment, $notification);
                }
            });
    }
}
