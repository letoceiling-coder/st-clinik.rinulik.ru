<?php

namespace App\Http\Controllers\Admin;

use App\Models\IntegrationCheck;
use App\Services\IntegrationSettings;
use Inertia\Response;

/** Чек-лист публикации MAX-бота и Mini App (план §6.3). */
class MaxPublishController extends AdminController
{
    public function index(IntegrationSettings $settings): Response
    {
        $values = $settings->groupValues('max_bot');
        $check = IntegrationCheck::query()->where('group', 'max_bot')->first();
        $appUrl = rtrim($this->appUrl(), '/');
        $miniApp = filled($values['mini_app_url'] ?? null)
            ? (string) $values['mini_app_url']
            : $appUrl.'/max';
        $webhookUrl = $appUrl.'/webhooks/max';

        $tokenOk = filled($values['bot_token'] ?? null);
        $webhookSecretOk = filled($values['webhook_secret'] ?? null);
        $miniAppHttps = str_starts_with($miniApp, 'https://');
        $apiOk = $check?->ok === true;

        $items = [
            [
                'key' => 'org_verified',
                'title' => 'Профиль организации заказчика верифицирован на business.max.ru',
                'manual' => true,
                'ok' => null,
                'detail' => 'ИП или ООО заказчика — владелец бота и Mini App.',
            ],
            [
                'key' => 'bot_moderation',
                'title' => 'Бот создан, токен в админке, webhook зарегистрирован, бот прошёл модерацию',
                'manual' => false,
                'ok' => $tokenOk && $webhookSecretOk && $apiOk,
                'detail' => $tokenOk
                    ? ($apiOk ? 'API MAX отвечает (последняя проверка интеграции).' : 'Нажмите «Проверить подключение» в интеграции MAX.')
                    : 'Укажите токен бота в разделе интеграций.',
                'links' => [
                    ['label' => 'Интеграция MAX', 'href' => '/admin/integrations#max_bot'],
                    ['label' => 'URL webhook', 'href' => $webhookUrl],
                ],
            ],
            [
                'key' => 'mini_app_url',
                'title' => 'В настройках бота указан URL Mini App (production, HTTPS)',
                'manual' => false,
                'ok' => $miniAppHttps && str_contains($miniApp, $appUrl),
                'detail' => "Текущий URL: {$miniApp}",
                'links' => [['label' => 'Открыть Mini App', 'href' => $miniApp]],
            ],
            [
                'key' => 'legal',
                'title' => 'Политика конфиденциальности, согласие на ПД и контакты поддержки доступны из Mini App',
                'manual' => false,
                'ok' => true,
                'detail' => 'Ссылки в футере сайта и в мини-приложении.',
                'links' => [
                    ['label' => 'Политика', 'href' => $appUrl.'/privacy'],
                    ['label' => 'Согласие', 'href' => $appUrl.'/consent'],
                    ['label' => 'О сервисе', 'href' => $appUrl.'/about'],
                ],
            ],
            [
                'key' => 'mincert',
                'title' => 'Сертификат Минцифры установлен на сервере приложения',
                'manual' => true,
                'ok' => null,
                'detail' => 'Нужен для вызовов platform-api MAX с production-сервера.',
            ],
            [
                'key' => 'devices',
                'title' => 'Проверено на iOS, Android и веб-версии MAX',
                'manual' => true,
                'ok' => null,
                'detail' => 'Каталог, записи, уведомления, ассистент, вход через бота.',
            ],
            [
                'key' => 'platform_rules',
                'title' => 'Соответствие правилам платформы MAX (контент, оплаты в Mini App)',
                'manual' => true,
                'ok' => null,
                'detail' => 'Актуальные правила — в кабинете партнёра MAX.',
            ],
        ];

        $autoItems = collect($items)->where('manual', false);
        $autoDone = $autoItems->where('ok', true)->count();
        $autoTotal = $autoItems->count();

        return $this->render('Admin/MaxPublish', 'Публикация MAX', [
            'items' => $items,
            'summary' => [
                'auto_done' => $autoDone,
                'auto_total' => $autoTotal,
                'webhook_url' => $webhookUrl,
                'mini_app_url' => $miniApp,
                'last_api_check' => $check ? [
                    'ok' => $check->ok,
                    'message' => $check->message,
                    'at' => $check->checked_at->format('d.m.Y H:i'),
                ] : null,
            ],
        ]);
    }
}
