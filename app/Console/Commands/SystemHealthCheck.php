<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\UserNotification;
use App\Notifications\SystemAlertNotification;
use App\Services\System\SystemHealth;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

#[Signature('system:health-check')]
#[Description('Проверяет состояние системы и сообщает суперадминам о новых сбоях и о восстановлении')]
class SystemHealthCheck extends Command
{
    private const LAST_FAILURES_KEY = 'health.last_failures';

    public function handle(SystemHealth $health): int
    {
        $checks = $health->checks(fresh: true);
        $failing = collect($checks)->where('status', 'fail')->keyBy('key');
        $previous = (array) Cache::get(self::LAST_FAILURES_KEY, []);

        $new = $failing->except($previous);
        $recovered = array_values(array_diff($previous, $failing->keys()->all()));
        Cache::forever(self::LAST_FAILURES_KEY, $failing->keys()->all());

        if ($new->isNotEmpty()) {
            $this->notifyAdmins('Сбой на сайте', $new->map(fn ($c) => "— {$c['label']}: {$c['value']}".($c['hint'] ? ". {$c['hint']}" : ''))->implode("\n"));
        }
        if ($recovered !== []) {
            $labels = collect($checks)->whereIn('key', $recovered)->pluck('label')->implode(', ');
            $this->notifyAdmins('Работа восстановлена', "Снова в порядке: {$labels}.");
        }

        $this->info('Состояние: '.SystemHealth::overall($checks).'; сбоев: '.$failing->count());

        return self::SUCCESS;
    }

    /** Суперадминам: в админке и в MAX/на почту. Сбой доставки одному не мешает остальным. */
    private function notifyAdmins(string $title, string $body): void
    {
        Log::warning('system.health', ['title' => $title, 'body' => $body]);

        User::query()->where('role', 'superadmin')->where('status', 'active')->get()->each(function (User $admin) use ($title, $body) {
            UserNotification::query()->create(['user_id' => $admin->id, 'type' => 'system_health', 'title' => $title, 'body' => $body, 'url' => '/admin/system']);
            try {
                $admin->notify(new SystemAlertNotification($title, $body));
            } catch (Throwable $e) {
                Log::warning('system.health.notify_failed', ['user' => $admin->id, 'error' => $e->getMessage()]);
            }
        });
    }
}
