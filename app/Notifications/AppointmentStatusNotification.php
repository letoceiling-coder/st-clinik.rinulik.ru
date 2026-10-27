<?php

namespace App\Notifications;

use App\Models\Appointment;
use App\Models\NotificationSubscription;
use App\Services\Notifications\NotificationPreferenceService;
use App\Support\NotificationEvents;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AppointmentStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly Appointment $appointment,
        private readonly string $eventKey,
        private readonly string $title,
        private readonly string $body,
        private readonly ?string $url = null,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        $channels = app(NotificationPreferenceService::class)->channelsFor($notifiable, $this->eventKey);
        $out = [];
        if (in_array('email', $channels, true)) {
            $out[] = 'logged_mail';
        }
        if (in_array('max', $channels, true)) {
            $out[] = 'max';
        }
        if (in_array(NotificationSubscription::CHANNEL_WEB_PUSH, $channels, true)) {
            $out[] = 'webpush';
        }

        return $out;
    }

    public function eventKey(): string
    {
        return $this->eventKey;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject($this->title)
            ->greeting('Здравствуйте!')
            ->line($this->body);

        if ($this->url !== null) {
            $message->action('Открыть запись', $this->url);
        }

        return $message->salutation('С уважением, '.config('app.name'));
    }

    public function toMax(object $notifiable): string
    {
        $text = $this->title."\n\n".$this->body;
        if ($this->url !== null) {
            $text .= "\n\n".$this->url;
        }

        return $text;
    }

    /** @return array{title: string, body: string, url?: string} */
    public function toWebPush(object $notifiable): array
    {
        $payload = [
            'title' => $this->title,
            'body' => str_replace("\n", ' · ', $this->body),
        ];
        if ($this->url !== null) {
            $payload['url'] = $this->url;
        }

        return $payload;
    }

    public static function fromTransition(Appointment $appointment, ?string $from, string $to): ?self
    {
        $eventKey = NotificationEvents::forAppointmentTransition($from, $to);
        if ($eventKey === null) {
            return null;
        }

        $appointment->loadMissing(['clinic', 'doctor', 'service']);

        $clinic = $appointment->clinic?->name ?? 'клиника';
        $when = $appointment->starts_at?->timezone(config('app.timezone'))->format('d.m.Y H:i') ?? '—';
        $doctor = $appointment->doctor?->name;
        $service = $appointment->service?->name;

        $details = collect([
            $doctor ? "Врач: {$doctor}" : null,
            $service ? "Услуга: {$service}" : null,
            "Дата и время: {$when}",
            "Филиал: {$clinic}",
        ])->filter()->implode("\n");

        $title = NotificationEvents::label($eventKey);
        $body = "{$title}.\n{$details}";

        $url = route('account.appointments', absolute: true);

        return new self($appointment, $eventKey, $title.' — '.config('app.name'), $body, $url);
    }

    public static function forReminder(Appointment $appointment, string $eventKey): self
    {
        $appointment->loadMissing(['clinic', 'doctor']);
        $clinic = $appointment->clinic?->name ?? 'клиника';
        $when = $appointment->starts_at?->timezone(config('app.timezone'))->format('d.m.Y H:i') ?? '—';
        $title = NotificationEvents::label($eventKey).' — '.config('app.name');
        $body = "Напоминание: приём {$when} в {$clinic}.";

        return new self(
            $appointment,
            $eventKey,
            $title,
            $body,
            route('account.appointments', absolute: true),
        );
    }
}
