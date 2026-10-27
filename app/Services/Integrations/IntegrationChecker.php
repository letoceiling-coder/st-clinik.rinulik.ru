<?php

namespace App\Services\Integrations;

use App\Services\IntegrationSettings;
use App\Services\Max\MaxBotClient;
use App\Services\Payments\TBankAcquiringService;
use App\Support\Vapid;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Sentry\ClientBuilder;
use Sentry\Severity;
use Throwable;

/**
 * Проверка подключения интеграций по сохранённым значениям.
 * Ничего платного не вызывает: балансы, служебные эндпоинты и тестовые письма/события.
 */
class IntegrationChecker
{
    private const TIMEOUT_SECONDS = 15;

    public function __construct(private readonly IntegrationSettings $settings) {}

    public function check(string $group, ?string $adminEmail = null): CheckResult
    {
        $values = $this->settings->groupValues($group);

        try {
            return match ($group) {
                'tbank' => $this->tbank($values),
                'yandex_oauth' => $this->oauthApp($values, 'yandex', fn (string $id) => preg_match('/^[a-f0-9]{32}$/', $id) === 1),
                'vk_oauth' => $this->oauthApp($values, 'vk', fn (string $id) => ctype_digit($id)),
                'max_bot' => $this->maxBot($values),
                'vk_community' => $this->vkCommunity($values),
                'mail' => $this->mail($values, 'mail', $adminEmail),
                'mail_offers' => $this->mail($values, 'offers', $adminEmail),
                'sms' => $this->sms($values),
                'web_push' => $this->webPush($values),
                'parser' => $this->parser($values),
                'openrouter' => $this->openRouter($values),
                'yandex_maps' => $this->yandexMaps($values),
                'yandex_metrika' => $this->yandexMetrika($values),
                's3_backups' => $this->s3(),
                'sentry' => $this->sentry($values),
                default => CheckResult::fail('Для этой интеграции проверка не предусмотрена.'),
            };
        } catch (ConnectionException $e) {
            return CheckResult::fail('Сервис не ответил: '.$this->shortError($e));
        } catch (Throwable $e) {
            return CheckResult::fail('Ошибка проверки: '.$this->shortError($e));
        }
    }

    /** @param array<string, string|null> $v */
    private function tbank(array $v): CheckResult
    {
        if ($missing = $this->missing($v, ['terminal_key' => 'TerminalKey', 'password' => 'пароль терминала'])) {
            return $missing;
        }

        $service = app(TBankAcquiringService::class);
        config([
            'tbank.terminal_key' => $v['terminal_key'],
            'tbank.password' => $v['password'],
        ]);

        $payload = [
            'TerminalKey' => (string) $v['terminal_key'],
            'PaymentId' => 0,
        ];
        $payload['Token'] = $service->sign($payload);

        $response = $this->http()->post(rtrim((string) config('tbank.api_url'), '/').'/GetState', $payload);

        if (! $response->successful()) {
            return $this->httpFail('Т‑Банк', $response);
        }

        $message = (string) $response->json('Message', '');
        $details = (string) $response->json('Details', '');
        $errorCode = (string) $response->json('ErrorCode', '');

        if (str_contains(Str::lower($message.$details), 'token') || str_contains(Str::lower($message.$details), 'парол')) {
            return CheckResult::fail('Т‑Банк отклонил подпись: проверьте TerminalKey и пароль терминала.');
        }

        $accepted = in_array($errorCode, ['0', '7', '8', '99', '101', '1006'], true)
            || str_contains(Str::lower($message.$details), 'не найден');

        return $accepted
            ? CheckResult::ok('Терминал отвечает, ключи приняты (тестовый запрос без списания).', [
                ['label' => 'TerminalKey', 'value' => (string) $v['terminal_key']],
                ['label' => 'Ответ API', 'value' => $message !== '' ? $message : ($details !== '' ? $details : 'OK')],
            ])
            : CheckResult::fail('Т‑Банк вернул ошибку: '.($message ?: $details ?: 'код '.$errorCode));
    }

    /**
     * @param  array<string, string|null>  $v
     * @param  callable(string): bool  $clientIdLooksValid
     */
    private function oauthApp(array $v, string $provider, callable $clientIdLooksValid): CheckResult
    {
        if ($missing = $this->missing($v, ['client_id' => 'Client ID', 'client_secret' => 'секрет', 'redirect_uri' => 'Redirect URI'])) {
            return $missing;
        }

        $expected = $this->appUrl()."/auth/{$provider}/callback";
        $redirectOk = rtrim((string) $v['redirect_uri'], '/') === $expected;
        $idOk = $clientIdLooksValid((string) $v['client_id']);

        $details = [
            ['label' => 'Формат Client ID', 'value' => $idOk ? 'корректный' : 'не похож на ID приложения', 'ok' => $idOk],
            ['label' => 'Redirect URI', 'value' => $redirectOk ? 'совпадает с адресом сайта' : "ожидается {$expected}", 'ok' => $redirectOk],
            ['label' => 'Вход по кнопке', 'value' => config("services.{$provider}_oauth.enabled") ? 'включён' : 'выключен'],
        ];

        return $idOk && $redirectOk
            ? CheckResult::ok('Настройки корректны. Окончательная проверка — вход по кнопке на странице входа.', $details)
            : CheckResult::fail('Исправьте отмеченные поля.', $details);
    }

    /** @param array<string, string|null> $v */
    private function maxBot(array $v): CheckResult
    {
        if ($missing = $this->missing($v, ['bot_token' => 'токен бота'])) {
            return $missing;
        }

        $response = $this->http()->withHeaders(['Authorization' => (string) $v['bot_token']])
            ->get(rtrim((string) config('services.max_bot.api_url'), '/').'/me');

        if ($response->status() === 401) {
            return CheckResult::fail('MAX отклонил токен бота.');
        }
        if (! $response->successful()) {
            return $this->httpFail('MAX', $response);
        }

        $username = (string) $response->json('username');
        if ($username !== '' && $username !== ($v['bot_username'] ?? null)) {
            $this->settings->put('max_bot', 'bot_username', $username);
        }

        $webhook = app(MaxBotClient::class)->registerWebhook();

        return CheckResult::ok('Бот подключён.', [
            ['label' => 'Имя', 'value' => (string) $response->json('name')],
            ['label' => 'Username', 'value' => $username !== '' ? '@'.$username : '—'],
            ['label' => 'Ссылка на бота', 'value' => $username !== '' ? "https://max.ru/{$username}" : '—'],
            ['label' => 'Секрет webhook', 'value' => filled($v['webhook_secret'] ?? null) ? 'задан' : 'не задан', 'ok' => filled($v['webhook_secret'] ?? null)],
            ['label' => 'Webhook MAX', 'value' => ($webhook['ok'] ?? false) ? 'зарегистрирован' : ($webhook['message'] ?? 'ошибка'), 'ok' => (bool) ($webhook['ok'] ?? false)],
        ]);
    }

    /** @param array<string, string|null> $v */
    private function vkCommunity(array $v): CheckResult
    {
        if ($missing = $this->missing($v, ['group_id' => 'ID сообщества', 'access_token' => 'ключ доступа'])) {
            return $missing;
        }

        $group = $this->vkCall('groups.getById', ['group_id' => $v['group_id']], (string) $v['access_token']);
        if (isset($group['error'])) {
            return CheckResult::fail('VK: '.($group['error']['error_msg'] ?? 'ошибка запроса').'.');
        }

        $info = $group['response']['groups'][0] ?? $group['response'][0] ?? [];
        $details = [
            ['label' => 'Сообщество', 'value' => (string) ($info['name'] ?? '—')],
            ['label' => 'Адрес', 'value' => isset($info['screen_name']) ? "https://vk.com/{$info['screen_name']}" : '—'],
        ];

        if (filled($v['test_user_id'] ?? null)) {
            $allowed = $this->vkCall('messages.isMessagesFromGroupAllowed', [
                'group_id' => $v['group_id'],
                'user_id' => $v['test_user_id'],
            ], (string) $v['access_token']);

            if (isset($allowed['error'])) {
                $details[] = ['label' => 'Права ключа на сообщения', 'value' => (string) ($allowed['error']['error_msg'] ?? 'нет'), 'ok' => false];

                return CheckResult::fail('Ключ не даёт доступа к сообщениям сообщества.', $details);
            }

            $isAllowed = (bool) ($allowed['response']['is_allowed'] ?? false);
            $details[] = ['label' => "Пользователь {$v['test_user_id']}", 'value' => $isAllowed ? 'разрешил сообщения' : 'не разрешал сообщения', 'ok' => $isAllowed];
        }

        $details[] = ['label' => 'Callback API', 'value' => filled($v['confirmation_code'] ?? null) && filled($v['callback_secret'] ?? null) ? 'настроен' : 'не настроен', 'ok' => filled($v['confirmation_code'] ?? null)];

        return CheckResult::ok('Сообщество доступно.', $details);
    }

    /** @param array<string, string|null> $v */
    private function mail(array $v, string $mailer, ?string $adminEmail): CheckResult
    {
        if ($adminEmail === null || $adminEmail === '') {
            return CheckResult::fail('У вашей учётной записи нет email — некуда отправить тестовое письмо.');
        }

        if ($mailer === 'mail' && ($v['mailer'] ?? 'log') === 'log') {
            Mail::mailer('log')->raw('Тестовое письмо СтомКлиник.', fn ($m) => $m->to($adminEmail)->subject('Проверка почты'));

            return CheckResult::ok('Выбран режим «только в лог»: письмо записано в журнал, реальная отправка выключена.', [
                ['label' => 'Отправка', 'value' => 'выключена', 'ok' => false],
            ]);
        }

        if ($missing = $this->missing($v, ['host' => 'SMTP-хост', 'port' => 'порт', 'from_address' => 'email отправителя'])) {
            return $missing;
        }

        $from = (string) $v['from_address'];
        $name = (string) ($v['from_name'] ?? config('app.name'));
        Mail::mailer($mailer === 'mail' ? 'smtp' : 'offers')->raw(
            "Это тестовое письмо из центра интеграций СтомКлиник.\nЕсли вы его получили — отправка через {$v['host']} работает.",
            fn ($m) => $m->from($from, $name)->to($adminEmail)->subject('Проверка почты: '.config("integrations.groups.{$this->groupFor($mailer)}.title")),
        );

        $details = [
            ['label' => 'SMTP', 'value' => "{$v['host']}:{$v['port']}"],
            ['label' => 'Письмо отправлено на', 'value' => $adminEmail],
        ];

        $domain = Str::after($from, '@');
        if ($mailer === 'offers' && $domain !== '') {
            $details = array_merge($details, $this->dnsAuthentication($domain, $v['dkim_selector'] ?? null));
        }

        return CheckResult::ok('Сервер принял письмо. Проверьте входящие и папку «Спам».', $details);
    }

    /** @return list<array{label: string, value: string, ok: bool}> */
    private function dnsAuthentication(string $domain, ?string $dkimSelector): array
    {
        $txt = fn (string $host) => collect(@dns_get_record($host, DNS_TXT) ?: [])->pluck('txt')->filter()->values();

        $spf = $txt($domain)->first(fn (string $r) => str_starts_with($r, 'v=spf1'));
        $dmarc = $txt('_dmarc.'.$domain)->first(fn (string $r) => str_starts_with($r, 'v=DMARC1'));
        $rows = [
            ['label' => 'SPF', 'value' => $spf ?: 'запись не найдена', 'ok' => (bool) $spf],
            ['label' => 'DMARC', 'value' => $dmarc ?: 'запись не найдена', 'ok' => (bool) $dmarc],
        ];

        if (filled($dkimSelector)) {
            $dkim = $txt("{$dkimSelector}._domainkey.{$domain}")->first(fn (string $r) => str_contains($r, 'p='));
            $rows[] = ['label' => "DKIM ({$dkimSelector})", 'value' => $dkim ? 'запись найдена' : 'запись не найдена', 'ok' => (bool) $dkim];
        }

        return $rows;
    }

    /** @param array<string, string|null> $v */
    private function sms(array $v): CheckResult
    {
        if ($missing = $this->missing($v, ['provider' => 'провайдер', 'api_key' => 'API-ключ'])) {
            return $missing;
        }

        $provider = (string) $v['provider'];
        if (in_array($provider, ['smsc', 'smsaero'], true) && blank($v['login'] ?? null)) {
            return CheckResult::fail('Для этого провайдера нужен логин.');
        }

        [$balance, $error] = match ($provider) {
            'smsru' => $this->smsRuBalance((string) $v['api_key']),
            'smsc' => $this->smscBalance((string) $v['login'], (string) $v['api_key']),
            'smsaero' => $this->smsAeroBalance((string) $v['login'], (string) $v['api_key']),
            default => [null, 'неизвестный провайдер'],
        };

        if ($error !== null) {
            return CheckResult::fail("Провайдер вернул ошибку: {$error}.");
        }

        return CheckResult::ok('Ключ принят провайдером.', [
            ['label' => 'Баланс', 'value' => "{$balance} ₽", 'ok' => (float) $balance > 0],
            ['label' => 'Имя отправителя', 'value' => filled($v['sender'] ?? null) ? (string) $v['sender'] : 'по умолчанию у провайдера'],
        ]);
    }

    /** @return array{0: ?string, 1: ?string} */
    private function smsRuBalance(string $apiId): array
    {
        $json = $this->http()->get('https://sms.ru/my/balance', ['api_id' => $apiId, 'json' => 1])->json();

        return ($json['status'] ?? null) === 'OK'
            ? [(string) $json['balance'], null]
            : [null, (string) ($json['status_text'] ?? 'неверный api_id')];
    }

    /** @return array{0: ?string, 1: ?string} */
    private function smscBalance(string $login, string $password): array
    {
        $json = $this->http()->get('https://smsc.ru/sys/balance.php', ['login' => $login, 'psw' => $password, 'fmt' => 3])->json();

        return isset($json['balance'])
            ? [(string) $json['balance'], null]
            : [null, (string) ($json['error'] ?? 'неверный логин или пароль')];
    }

    /** @return array{0: ?string, 1: ?string} */
    private function smsAeroBalance(string $email, string $apiKey): array
    {
        $json = $this->http()->withBasicAuth($email, $apiKey)->get('https://gate.smsaero.ru/v2/balance')->json();

        return ($json['success'] ?? false)
            ? [(string) ($json['data']['balance'] ?? '0'), null]
            : [null, (string) ($json['message'] ?? 'неверный email или ключ')];
    }

    /** @param array<string, string|null> $v */
    private function webPush(array $v): CheckResult
    {
        if ($missing = $this->missing($v, ['public_key' => 'публичный ключ', 'private_key' => 'приватный ключ', 'subject' => 'контакт'])) {
            return $missing;
        }

        $publicOk = Vapid::isValidPublicKey((string) $v['public_key']);
        $derived = Vapid::publicKeyFor((string) $v['private_key']);
        $pairOk = $derived !== null && hash_equals($derived, (string) $v['public_key']);
        $subjectOk = str_starts_with((string) $v['subject'], 'mailto:') || str_starts_with((string) $v['subject'], 'https://');

        $details = [
            ['label' => 'Публичный ключ', 'value' => $publicOk ? 'корректный P-256' : 'неверный формат', 'ok' => $publicOk],
            ['label' => 'Пара ключей', 'value' => $pairOk ? 'приватный соответствует публичному' : 'ключи не из одной пары', 'ok' => $pairOk],
            ['label' => 'Контакт', 'value' => $subjectOk ? (string) $v['subject'] : 'нужен mailto: или https://', 'ok' => $subjectOk],
        ];

        return $publicOk && $pairOk && $subjectOk
            ? CheckResult::ok('Ключи VAPID корректны.', $details)
            : CheckResult::fail('Исправьте отмеченные поля или сгенерируйте ключи заново.', $details);
    }

    /** @param array<string, string|null> $v */
    private function parser(array $v): CheckResult
    {
        if ($missing = $this->missing($v, ['base_url' => 'базовый URL', 'api_key' => 'API-ключ'])) {
            return $missing;
        }

        $base = rtrim((string) $v['base_url'], '/');
        $health = $this->http()->get("{$base}/health");
        if (! $health->successful() || $health->json('status') !== 'healthy') {
            return CheckResult::fail('Парсер нездоров: '.$health->status().' '.Str::limit((string) json_encode($health->json('checks')), 120));
        }

        $workers = $this->http()->withToken((string) $v['api_key'])->get("{$base}/api/v1/workers");
        if (in_array($workers->status(), [401, 403], true)) {
            return CheckResult::fail('Парсер отклонил API-ключ.');
        }
        if (! $workers->successful()) {
            return $this->httpFail('Парсер', $workers);
        }

        $list = collect($workers->json('workers', []));
        $online = $list->where('connected', true);
        $htmlCapable = $online->filter(fn (array $w) => in_array('task:page.html', $w['capabilities'] ?? [], true))->count();

        return CheckResult::ok('Парсер доступен, ключ принят.', [
            ['label' => 'Исполнители онлайн', 'value' => "{$online->count()} из {$list->count()}", 'ok' => $online->isNotEmpty()],
            ['label' => 'Умеют page.html (поиск email на сайтах)', 'value' => (string) $htmlCapable, 'ok' => $htmlCapable > 0],
            ['label' => 'Лимит задачи / бюджет в сутки', 'value' => ($v['task_cost_limit_usd'] ?? '—').' / '.($v['daily_budget_usd'] ?? '—').' USD'],
        ]);
    }

    /** @param array<string, string|null> $v */
    private function openRouter(array $v): CheckResult
    {
        if ($missing = $this->missing($v, ['api_key' => 'API-ключ', 'chat_model' => 'модель диалога'])) {
            return $missing;
        }

        $base = rtrim((string) ($v['base_url'] ?: 'https://openrouter.ai/api/v1'), '/');
        $http = $this->http()->withToken((string) $v['api_key']);
        if (filled($v['proxy'] ?? null)) {
            $http = $http->withOptions(['proxy' => (string) $v['proxy']]);
        }

        $key = $http->get("{$base}/key");
        if ($key->status() === 403 && str_contains($key->body(), 'security policy')) {
            return CheckResult::fail('OpenRouter блокирует запросы с IP сервера (Access denied by security policy). Укажите HTTP-прокси за пределами РФ.');
        }
        if ($key->status() === 401) {
            return CheckResult::fail('OpenRouter отклонил ключ.');
        }
        if (! $key->successful()) {
            return $this->httpFail('OpenRouter', $key);
        }

        $models = collect($http->get("{$base}/models")->json('data', []))->pluck('id')->flip();
        $details = [
            ['label' => 'Ключ', 'value' => (string) ($key->json('data.label') ?: 'без названия')],
            ['label' => 'Израсходовано', 'value' => '$'.number_format((float) $key->json('data.usage'), 2)],
            ['label' => 'Лимит ключа', 'value' => $key->json('data.limit') === null ? 'без лимита' : '$'.number_format((float) $key->json('data.limit'), 2), 'ok' => $key->json('data.limit') !== null],
        ];

        $allFound = true;
        foreach (['chat_model' => 'Модель диалога', 'fallback_model' => 'Резервная модель', 'embedding_model' => 'Модель эмбеддингов'] as $field => $label) {
            if (blank($v[$field] ?? null)) {
                continue;
            }
            $found = $models->isEmpty() || $models->has($v[$field]);
            $allFound = $allFound && $found;
            $details[] = ['label' => $label, 'value' => $found ? (string) $v[$field] : "{$v[$field]} — нет в каталоге", 'ok' => $found];
        }

        return $allFound
            ? CheckResult::ok('Ключ OpenRouter работает.', $details)
            : CheckResult::fail('Ключ работает, но часть моделей не найдена в каталоге OpenRouter.', $details);
    }

    /** @param array<string, string|null> $v */
    private function yandexMaps(array $v): CheckResult
    {
        if ($missing = $this->missing($v, ['api_key' => 'API-ключ'])) {
            return $missing;
        }

        $response = $this->http()->withHeaders(['Referer' => $this->appUrl().'/'])->get('https://geocode-maps.yandex.ru/1.x/', [
            'apikey' => $v['api_key'],
            'geocode' => 'Краснодар',
            'format' => 'json',
            'results' => 1,
        ]);

        if ($response->status() === 403) {
            return CheckResult::fail('Ключ не принят геокодером: неверный ключ, не подключён HTTP Геокодер или домен сайта не входит в ограничения ключа.');
        }
        if (! $response->successful()) {
            return $this->httpFail('Яндекс Геокодер', $response);
        }

        $point = $response->json('response.GeoObjectCollection.featureMember.0.GeoObject.Point.pos');

        return CheckResult::ok('Ключ работает.', [
            ['label' => 'Тестовый геокод «Краснодар»', 'value' => $point ? "координаты {$point}" : 'пустой ответ', 'ok' => (bool) $point],
        ]);
    }

    /** @param array<string, string|null> $v */
    private function yandexMetrika(array $v): CheckResult
    {
        if ($missing = $this->missing($v, ['counter_id' => 'номер счётчика'])) {
            return $missing;
        }

        $id = (string) $v['counter_id'];
        if (! ctype_digit($id)) {
            return CheckResult::fail('Номер счётчика должен состоять из цифр.');
        }

        $details = [['label' => 'Вебвизор', 'value' => ($v['webvisor'] ?? '0') === '1' ? 'включён' : 'выключен']];

        try {
            $html = $this->http()->get($this->appUrl().'/')->body();
            $onSite = str_contains($html, "ym({$id},");
            $details[] = ['label' => 'Код на главной странице', 'value' => $onSite ? 'найден' : 'не найден', 'ok' => $onSite];
        } catch (ConnectionException) {
            $details[] = ['label' => 'Код на главной странице', 'value' => 'не удалось открыть сайт с сервера', 'ok' => null];
        }

        if (filled($v['oauth_token'] ?? null)) {
            $api = $this->http()->withHeaders(['Authorization' => 'OAuth '.$v['oauth_token']])
                ->get("https://api-metrika.yandex.net/management/v1/counter/{$id}");
            $details[] = $api->successful()
                ? ['label' => 'Доступ по API', 'value' => $api->json('counter.name').' ('.$api->json('counter.site2.site', $api->json('counter.site')).')', 'ok' => true]
                : ['label' => 'Доступ по API', 'value' => 'нет доступа ('.$api->status().')', 'ok' => false];
        }

        $failed = collect($details)->contains(fn (array $d) => ($d['ok'] ?? null) === false);

        return $failed
            ? CheckResult::fail('Счётчик сохранён, но есть замечания.', $details)
            : CheckResult::ok('Счётчик подключён.', $details);
    }

    private function s3(): CheckResult
    {
        $config = config('filesystems.disks.backups');
        foreach (['endpoint' => 'endpoint', 'bucket' => 'бакет', 'key' => 'access key', 'secret' => 'secret key'] as $key => $label) {
            if (blank($config[$key] ?? null)) {
                return CheckResult::fail("Не заполнено: {$label}.");
            }
        }

        $disk = Storage::build($config);
        $path = 'healthcheck/'.Str::uuid().'.txt';
        $payload = 'st-clinik '.now()->toIso8601String();

        $disk->put($path, $payload);
        $readBack = $disk->get($path);
        $disk->delete($path);

        return $readBack === $payload
            ? CheckResult::ok('Запись, чтение и удаление тестового файла прошли успешно.', [
                ['label' => 'Бакет', 'value' => (string) $config['bucket']],
                ['label' => 'Путь копий', 'value' => ($config['root'] ?? '').'/db/'],
            ])
            : CheckResult::fail('Файл записан, но прочитанное содержимое не совпало.');
    }

    /** @param array<string, string|null> $v */
    private function sentry(array $v): CheckResult
    {
        if ($missing = $this->missing($v, ['dsn' => 'DSN'])) {
            return $missing;
        }

        $client = ClientBuilder::create([
            'dsn' => (string) $v['dsn'],
            'environment' => (string) ($v['environment'] ?: app()->environment()),
            'send_default_pii' => false,
        ])->getClient();

        $eventId = $client->captureMessage('Проверка подключения из центра интеграций СтомКлиник', Severity::info());
        $client->flush();

        return $eventId !== null
            ? CheckResult::ok('Тестовое событие отправлено.', [['label' => 'ID события', 'value' => (string) $eventId]])
            : CheckResult::fail('Sentry не принял событие: проверьте DSN и доступность сервера Sentry.');
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    private function vkCall(string $method, array $params, string $token): array
    {
        return (array) $this->http()->asForm()->post("https://api.vk.com/method/{$method}", array_merge($params, [
            'access_token' => $token,
            'v' => config('services.vk_community.api_version', '5.199'),
        ]))->json();
    }

    /**
     * @param  array<string, string|null>  $values
     * @param  array<string, string>  $required
     */
    private function missing(array $values, array $required): ?CheckResult
    {
        $empty = collect($required)->filter(fn (string $label, string $field) => blank($values[$field] ?? null));

        return $empty->isEmpty() ? null : CheckResult::fail('Не заполнено: '.$empty->implode(', ').'. Сохраните настройки и повторите проверку.');
    }

    private function httpFail(string $service, Response $response): CheckResult
    {
        $message = $response->json('message') ?? $response->json('description') ?? $response->json('error.message') ?? Str::limit(strip_tags($response->body()), 150);

        return CheckResult::fail("{$service} ответил {$response->status()}: {$message}");
    }

    private function http(): PendingRequest
    {
        return Http::timeout(self::TIMEOUT_SECONDS)->connectTimeout(8)->acceptJson();
    }

    private function appUrl(): string
    {
        return rtrim((string) config('app.url'), '/');
    }

    private function groupFor(string $mailer): string
    {
        return $mailer === 'mail' ? 'mail' : 'mail_offers';
    }

    /** Текст ошибки без query-строк и учётных данных в URL (там бывают ключи API). */
    private function shortError(Throwable $e): string
    {
        $message = preg_replace(['#(https?://)[^/\s@]+@#', '/\?\S*/', '/\s+/'], ['$1', '?…', ' '], $e->getMessage()) ?? '';

        return Str::limit($message, 200);
    }
}
