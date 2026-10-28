<?php

namespace App\Notifications;

use App\Services\Notifications\NotificationPreferenceService;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Сбой системы — суперадминам в MAX и на почту (если подключены). Отправляется сразу, без очереди:
 * при сломанной очереди уведомление иначе не дошло бы.
 */
class SystemAlertNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $title,
        private readonly string $body,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        $available = app(NotificationPreferenceService::class)->availableOutboundChannels($notifiable);

        return array_values(array_filter([
            in_array('max', $available, true) ? 'max' : null,
            in_array('email', $available, true) ? 'logged_mail' : null,
        ]));
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->title)
            ->line($this->body)
            ->action('Состояние системы', url('/admin/system'));
    }

    public function toMax(object $notifiable): string
    {
        return $this->title."\n\n".$this->body."\n\n".url('/admin/system');
    }
}
