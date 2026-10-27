<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Отписка — {{ config('app.name') }}</title>
    <style>
        body { font-family: system-ui, sans-serif; background: #f4f5f7; margin: 0; padding: 48px 16px; }
        .box { max-width: 420px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; text-align: center; }
        h1 { font-size: 1.25rem; margin: 0 0 12px; }
        p { color: #555; line-height: 1.5; margin: 0; }
        a { color: #0d9488; }
    </style>
</head>
<body>
    <div class="box">
        <h1>Вы отписаны</h1>
        @if (!empty($clinic))
            <p>Мы больше не будем присылать новости и акции этой клиники. Управление подписками — в <a href="{{ url('/account/profile') }}">профиле</a>.</p>
        @else
            <p>Мы больше не будем присылать новости и акции платформы на выбранный канал. Настройки можно изменить в <a href="{{ url('/account/profile') }}">личном кабинете</a>.</p>
        @endif
    </div>
</body>
</html>
