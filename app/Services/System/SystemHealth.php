<?php

namespace App\Services\System;

use App\Services\Max\MaxBotClient;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;
use Throwable;

/**
 * Состояние системы для админки: всё, что тихо ломается и о чём узнают от пользователей —
 * база, Redis, очереди, планировщик, бэкапы, диск, сертификат, вебхук MAX, AI через прокси, почта.
 *
 * @phpstan-type Check array{key: string, label: string, status: 'ok'|'warn'|'fail', value: string, hint: ?string}
 */
class SystemHealth
{
    public const SCHEDULER_BEAT_KEY = 'health.scheduler_beat';

    /** Внешние проверки (сеть) кешируются, чтобы страница открывалась быстро и не дёргала API. */
    private const EXTERNAL_TTL = 300;

    /** @return list<Check> */
    public function checks(bool $fresh = false): array
    {
        if ($fresh) {
            Cache::forget('health.external');
        }

        $external = Cache::remember('health.external', self::EXTERNAL_TTL, fn () => [
            $this->safe('ssl', 'SSL-сертификат', fn () => $this->ssl()),
            $this->safe('max_webhook', 'Вебхук бота MAX', fn () => $this->maxWebhook()),
            $this->safe('openrouter', 'AI-ассистент (OpenRouter)', fn () => $this->openRouter()),
        ]);

        return [
            $this->safe('database', 'База данных', fn () => $this->database()),
            $this->safe('redis', 'Redis (кеш и очереди)', fn () => $this->redis()),
            $this->safe('queue', 'Очередь задач', fn () => $this->queue()),
            $this->safe('failed_jobs', 'Упавшие задачи за сутки', fn () => $this->failedJobs()),
            $this->safe('scheduler', 'Планировщик', fn () => $this->scheduler()),
            $this->safe('backup', 'Резервная копия базы', fn () => $this->backup()),
            $this->safe('disk', 'Место на диске', fn () => $this->disk()),
            $this->safe('mail', 'Почта', fn () => $this->mail()),
            ...$external,
        ];
    }

    /** @return 'ok'|'warn'|'fail' */
    public static function overall(array $checks): string
    {
        $statuses = array_column($checks, 'status');

        return in_array('fail', $statuses, true) ? 'fail' : (in_array('warn', $statuses, true) ? 'warn' : 'ok');
    }

    /** @return Check */
    private function safe(string $key, string $label, callable $check): array
    {
        try {
            [$status, $value, $hint] = $check() + [2 => null];
        } catch (Throwable $e) {
            [$status, $value, $hint] = ['fail', 'ошибка проверки', mb_substr($e->getMessage(), 0, 200)];
        }

        return ['key' => $key, 'label' => $label, 'status' => $status, 'value' => $value, 'hint' => $hint];
    }

    private function database(): array
    {
        $started = microtime(true);
        DB::select('select 1');
        $ms = (int) round((microtime(true) - $started) * 1000);

        return [$ms < 200 ? 'ok' : 'warn', "отвечает за {$ms} мс"];
    }

    private function redis(): array
    {
        if (config('cache.default') !== 'redis' && config('queue.default') !== 'redis') {
            return ['ok', 'не используется'];
        }
        Redis::connection()->ping();

        return ['ok', 'доступен'];
    }

    private function queue(): array
    {
        $size = Queue::size();

        return match (true) {
            $size > 500 => ['fail', "{$size} задач в ожидании", 'Очередь не разбирается: проверьте контейнер queue.'],
            $size > 50 => ['warn', "{$size} задач в ожидании", 'Задачи копятся — возможно, воркер перегружен.'],
            default => ['ok', $size === 0 ? 'пусто' : "{$size} в ожидании"],
        };
    }

    private function failedJobs(): array
    {
        $count = DB::table('failed_jobs')->where('failed_at', '>=', now()->subDay())->count();

        return match (true) {
            $count >= 20 => ['fail', (string) $count, 'Много сбоев: уведомления или импорт не доходят. Смотрите failed_jobs.'],
            $count > 0 => ['warn', (string) $count, 'Есть упавшие задачи — посмотрите причину в failed_jobs.'],
            default => ['ok', 'нет'],
        };
    }

    private function scheduler(): array
    {
        $beat = Cache::get(self::SCHEDULER_BEAT_KEY);
        if ($beat === null) {
            return ['warn', 'нет данных', 'Отметка появится после первой минуты работы планировщика.'];
        }
        $minutes = (int) CarbonImmutable::parse($beat)->diffInMinutes(now());

        return match (true) {
            $minutes > 10 => ['fail', "молчит {$minutes} мин", 'Рассылки, напоминания и парсер не запускаются: проверьте контейнер scheduler.'],
            $minutes > 3 => ['warn', "последний запуск {$minutes} мин назад"],
            default => ['ok', 'работает'],
        };
    }

    private function backup(): array
    {
        $files = File::glob(storage_path('app/backups/db-*.sql.gz')) ?: [];
        if ($files === []) {
            return ['fail', 'копий нет', 'Ежедневная копия создаётся в 03:30 командой db:backup.'];
        }
        $latest = max(array_map('filemtime', $files));
        $hours = (int) floor((time() - $latest) / 3600);
        $size = round(filesize(array_values(array_filter($files, fn ($f) => filemtime($f) === $latest))[0]) / 1048576, 1);

        return match (true) {
            $hours > 48 => ['fail', "последняя {$hours} ч назад", 'Ежедневный бэкап не создаётся.'],
            $hours > 26 => ['warn', "последняя {$hours} ч назад"],
            default => ['ok', "{$hours} ч назад · {$size} МБ"],
        };
    }

    private function disk(): array
    {
        $free = @disk_free_space(storage_path());
        $total = @disk_total_space(storage_path());
        if (! $free || ! $total) {
            return ['warn', 'нет данных'];
        }
        $percent = (int) round($free * 100 / $total);
        $gb = round($free / 1073741824, 1);

        return match (true) {
            $percent < 5 => ['fail', "свободно {$gb} ГБ ({$percent}%)", 'Диск почти заполнен: бэкапы и загрузки фото перестанут работать.'],
            $percent < 15 => ['warn', "свободно {$gb} ГБ ({$percent}%)"],
            default => ['ok', "свободно {$gb} ГБ ({$percent}%)"],
        };
    }

    private function mail(): array
    {
        $mailer = (string) config('mail.default');
        if (in_array($mailer, ['log', 'array'], true)) {
            return ['warn', "режим «{$mailer}»", 'Письма не отправляются — настройте почту в «Интеграциях».'];
        }

        return filled(config("mail.mailers.{$mailer}.host")) || $mailer !== 'smtp'
            ? ['ok', $mailer]
            : ['fail', 'SMTP не настроен', 'Заполните почту в «Интеграциях».'];
    }

    private function ssl(): array
    {
        $host = (string) parse_url((string) config('app.url'), PHP_URL_HOST);
        if ($host === '' || str_starts_with((string) config('app.url'), 'http://')) {
            return ['warn', 'сайт без HTTPS'];
        }
        $context = stream_context_create(['ssl' => ['capture_peer_cert' => true, 'verify_peer' => false, 'SNI_enabled' => true, 'peer_name' => $host]]);
        $client = @stream_socket_client("ssl://{$host}:443", $errno, $error, 5, STREAM_CLIENT_CONNECT, $context);
        if ($client === false) {
            return ['fail', 'не удалось подключиться', $error ?: null];
        }
        $cert = openssl_x509_parse(stream_context_get_params($client)['options']['ssl']['peer_certificate']);
        $days = (int) floor(((int) $cert['validTo_time_t'] - time()) / 86400);

        return match (true) {
            $days < 7 => ['fail', "истекает через {$days} дн", 'Автопродление certbot не сработало.'],
            $days < 20 => ['warn', "истекает через {$days} дн", 'Обычно продлевается сам за 30 дней — проверьте certbot.'],
            default => ['ok', "действует ещё {$days} дн"],
        };
    }

    private function maxWebhook(): array
    {
        $token = (string) config('services.max_bot.token');
        if ($token === '') {
            return ['warn', 'бот не подключён'];
        }
        $subscriptions = app(MaxBotClient::class)->subscriptions($token);
        if ($subscriptions === null) {
            return ['fail', 'API MAX недоступен или токен отклонён'];
        }
        $expected = route('webhooks.max', absolute: true);

        return in_array($expected, array_column($subscriptions, 'url'), true)
            ? ['ok', 'установлен на этот сайт']
            : ['fail', 'не указывает на этот сайт', 'Вход через MAX и бот не работают. Нажмите «Проверить» в «Интеграции → MAX».'];
    }

    private function openRouter(): array
    {
        if (! filled(config('services.openrouter.api_key'))) {
            return ['warn', 'ключ не задан', 'Ассистент работает только шаблонами.'];
        }
        $http = Http::timeout(8)->acceptJson()->withToken((string) config('services.openrouter.api_key'));
        if (filled(config('services.openrouter.proxy'))) {
            $http = $http->withOptions(['proxy' => (string) config('services.openrouter.proxy')]);
        }
        $response = $http->get(rtrim((string) config('services.openrouter.base_url'), '/').'/key');

        return $response->successful()
            ? ['ok', 'доступен']
            : ['fail', 'ответ '.$response->status(), 'Ассистент отвечает шаблонами. Проверьте ключ и прокси в «Интеграциях».'];
    }
}
