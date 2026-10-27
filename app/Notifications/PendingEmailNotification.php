<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class PendingEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly User $user, private readonly string $newEmail) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = URL::temporarySignedRoute(
            'account.email.confirm',
            now()->addHours(24),
            ['id' => $this->user->getKey(), 'hash' => sha1($this->newEmail)],
        );

        return (new MailMessage)
            ->subject('Подтверждение нового e-mail')
            ->line('Вы запросили смену адреса электронной почты в '.config('app.name').'.')
            ->line('Новый адрес: '.$this->newEmail)
            ->action('Подтвердить e-mail', $url)
            ->line('Если это были не вы, проигнорируйте письмо.');
    }
}
