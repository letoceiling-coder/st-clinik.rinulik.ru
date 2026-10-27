<?php

namespace App\Services\Max;

use App\Models\Appointment;
use App\Models\User;
use App\Services\Notifications\NotificationPreferenceService;
use App\Support\NotificationEvents;

class MaxBotPatientMenu
{
    public function __construct(
        private readonly MaxBotClient $client,
        private readonly NotificationPreferenceService $preferences,
    ) {}

    public function sendAppointments(int $maxUserId, User $user): void
    {
        $appointments = Appointment::query()
            ->where('user_id', $user->id)
            ->where('starts_at', '>=', now()->startOfDay())
            ->whereIn('status', Appointment::ACTIVE)
            ->with(['clinic:id,name,slug', 'doctor:id,name'])
            ->orderBy('starts_at')
            ->limit(5)
            ->get();

        if ($appointments->isEmpty()) {
            $this->client->sendToUser(
                $maxUserId,
                "Ближайших записей нет.\n\nОткройте каталог в мини-приложении, чтобы записаться к врачу.",
                $this->miniAppRow('Открыть каталог'),
            );

            return;
        }

        $lines = ["Ваши ближайшие записи:\n"];
        foreach ($appointments as $i => $appointment) {
            $doctor = $appointment->doctor?->name ? ', '.$appointment->doctor->name : '';
            $lines[] = sprintf(
                '%d) %s — %s%s',
                $i + 1,
                $appointment->starts_at->format('d.m.Y H:i'),
                $appointment->clinic?->name ?? 'Клиника',
                $doctor,
            );
        }

        $lines[] = "\nОтменить запись — кнопкой ниже. Перенос — в мини-приложении.";

        $miniApp = config('services.max_bot.mini_app_url') ?: url('/max');
        $rows = [];

        foreach ($appointments->take(3) as $appointment) {
            if (! $appointment->canBeCancelledByPatient()) {
                continue;
            }

            $rows[] = [
                [
                    'type' => 'callback',
                    'text' => 'Отменить '.$appointment->starts_at->format('d.m H:i'),
                    'payload' => 'appt:patient_cancel:'.$appointment->id,
                ],
            ];
        }

        $rows[] = [
            ['type' => 'open_app', 'text' => 'Мои записи', 'web_app' => $miniApp.'/appointments'],
        ];
        $rows = array_merge($rows, $this->miniAppRow('Каталог'));

        $this->client->sendToUser($maxUserId, implode("\n", $lines), $rows);
    }

    public function sendNotificationsHelp(int $maxUserId, User $user): void
    {
        $matrix = $this->preferences->matrixFor($user);
        $lines = ["Настройки уведомлений (канал MAX):\n"];

        foreach ($matrix as $row) {
            $enabled = in_array('max', $row['channels'], true);
            $lines[] = ($enabled ? '✓ ' : '○ ').$row['label'];
        }

        $lines[] = "\nНажмите кнопку типа события, чтобы включить или выключить MAX. Все каналы — в профиле на сайте.";

        $rows = [];
        foreach ($matrix as $row) {
            if ($row['key'] === NotificationEvents::PLATFORM_MARKETING) {
                continue;
            }
            $enabled = in_array('max', $row['channels'], true);
            $rows[] = [
                [
                    'type' => 'callback',
                    'text' => ($enabled ? '✓ ' : '○ ').$row['label'],
                    'payload' => 'notify:toggle:'.$row['key'],
                ],
            ];
        }

        $rows[] = [
            ['type' => 'link', 'text' => 'Все каналы на сайте', 'url' => url('/account/profile')],
        ];
        $rows = array_merge($rows, $this->miniAppRow('Мини-приложение'));

        $this->client->sendToUser($maxUserId, implode("\n", $lines), $rows);
    }

    public function sendLinkAccountHint(int $maxUserId): void
    {
        $loginUrl = url('/auth/max/start');

        $this->client->sendToUser(
            $maxUserId,
            "Чтобы видеть записи и подписываться на клиники, войдите на сайте через MAX или откройте мини-приложение.\n\n".
            "На сайте: «Войти через MAX» — {$loginUrl}",
            $this->miniAppRow('Войти в мини-приложении'),
        );
    }

    /** @return array<int, array<int, array<string, mixed>>> */
    public function mainMenuRows(): array
    {
        $miniApp = config('services.max_bot.mini_app_url') ?: url('/max');

        return [
            [
                ['type' => 'open_app', 'text' => 'Найти клинику', 'web_app' => $miniApp],
                ['type' => 'callback', 'text' => 'Мои записи', 'payload' => 'menu:appointments'],
            ],
            [
                ['type' => 'callback', 'text' => 'Задать вопрос', 'payload' => 'menu:assistant'],
                ['type' => 'callback', 'text' => 'Уведомления', 'payload' => 'menu:notifications'],
            ],
            [
                ['type' => 'callback', 'text' => 'Связать с сайтом', 'payload' => 'menu:link'],
                ['type' => 'callback', 'text' => 'Меню', 'payload' => 'menu:main'],
            ],
            [
                ['type' => 'request_contact', 'text' => 'Поделиться контактом'],
            ],
        ];
    }

    /** @return array<int, array<int, array<string, mixed>>> */
    private function miniAppRow(string $label): array
    {
        $miniApp = config('services.max_bot.mini_app_url') ?: url('/max');

        return [
            [
                ['type' => 'open_app', 'text' => $label, 'web_app' => $miniApp],
            ],
        ];
    }
}
