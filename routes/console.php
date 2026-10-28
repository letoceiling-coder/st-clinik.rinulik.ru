<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('db:backup')->dailyAt('03:30')->withoutOverlapping()->onOneServer();
Schedule::command('queue:prune-failed --hours=720')->daily();
Schedule::command('parser:poll-tasks')->everyFifteenSeconds()->withoutOverlapping()->onOneServer();
Schedule::command('notifications:appointment-reminders')->everyFiveMinutes()->withoutOverlapping()->onOneServer();
Schedule::command('assistant:reindex-catalog')->dailyAt('04:15')->withoutOverlapping()->onOneServer();
Schedule::command('broadcasts:dispatch-scheduled')->everyMinute()->withoutOverlapping()->onOneServer();
// Смена домена или токена: webhook бота MAX переустанавливается сам (без изменений запросов к MAX нет).
Schedule::command('max:sync-webhook')->hourly()->withoutOverlapping()->onOneServer();
Schedule::command('subscriptions:process')->dailyAt('09:00')->withoutOverlapping()->onOneServer();
