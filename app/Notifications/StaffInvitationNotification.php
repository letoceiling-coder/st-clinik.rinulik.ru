<?php

namespace App\Notifications;

use App\Models\OrganizationStaff;
use App\Models\StaffInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StaffInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly StaffInvitation $invitation,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $org = $this->invitation->organization?->name ?? 'клиника';
        $role = OrganizationStaff::ROLES[$this->invitation->role] ?? $this->invitation->role;
        $url = url('/invite/staff/'.$this->invitation->token);

        return (new MailMessage)
            ->subject('Приглашение в кабинет «'.$org.'»')
            ->greeting('Здравствуйте!')
            ->line("Вас пригласили в кабинет организации «{$org}» с ролью «{$role}».")
            ->action('Принять приглашение', $url)
            ->line('Ссылка действует до '.$this->invitation->expires_at->format('d.m.Y').'.');
    }
}
