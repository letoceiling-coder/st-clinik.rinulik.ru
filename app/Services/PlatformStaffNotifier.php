<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserNotification;

/**
 * Уведомления команде платформы в админке: всем активным сотрудникам с нужным правом
 * (например, заявки без владельца — операторам записей, заявки на права — модераторам).
 * Персональные данные пациентов в текст не кладём — они открываются в админке по ссылке.
 */
class PlatformStaffNotifier
{
    public function notify(string $permission, string $type, string $title, string $body, string $url): int
    {
        $recipients = User::query()
            ->whereNotIn('role', ['user', 'clinic_owner'])
            ->where('status', 'active')
            ->with('roleModel')
            ->get()
            ->filter(fn (User $user) => $user->hasPermission($permission));

        foreach ($recipients as $user) {
            UserNotification::query()->create([
                'user_id' => $user->id,
                'type' => $type,
                'title' => $title,
                'body' => $body,
                'url' => $url,
            ]);
        }

        return $recipients->count();
    }
}
