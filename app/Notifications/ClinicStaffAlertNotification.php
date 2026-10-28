<?php

namespace App\Notifications;

use App\Models\NotificationSubscription;
use App\Services\Notifications\NotificationPreferenceService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Событие кабинета клиники (новая заявка, отзыв и т. п.) во внешние каналы сотрудника: почта, MAX, push —
 * по его настройкам уведомлений. Уведомление внутри кабинета создаётся отдельно.
 */
class ClinicStaffAlertNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
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
        if (in_array(NotificationSubscription::CHANNEL_EMAIL, $channels, true)) {
            $out[] = 'logged_mail';
        }
        if (in_array(NotificationSubscription::CHANNEL_MAX, $channels, true)) {
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
            $message->action('Открыть в кабинете', $this->absoluteUrl());
        }

        return $message->salutation('С уважением, '.config('app.name'));
    }

    public function toMax(object $notifiable): string
    {
        $text = $this->title."\n\n".$this->body;
        if ($this->url !== null) {
            $text .= "\n\n".$this->absoluteUrl();
        }

        return $text;
    }

    /** @return array{title: string, body: string, url?: string} */
    public function toWebPush(object $notifiable): array
    {
        $payload = ['title' => $this->title, 'body' => str_replace("\n", ' · ', $this->body)];
        if ($this->url !== null) {
            $payload['url'] = $this->url;
        }

        return $payload;
    }

    private function absoluteUrl(): string
    {
        return str_starts_with((string) $this->url, 'http') ? (string) $this->url : url((string) $this->url);
    }
}
