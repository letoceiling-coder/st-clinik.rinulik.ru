<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#F5F4F0">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="{{ config('app.name') }}">
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="apple-touch-icon" href="/favicon.svg">
    @php($seo = $seo ?? null)
    <title>{{ $seo['title'] ?? config('app.name') }}</title>
    @if (!empty($seo['description']))
        <meta name="description" content="{{ $seo['description'] }}">
    @endif
    <meta name="robots" content="{{ $seo['robots'] ?? (config('app.noindex') ? 'noindex, nofollow' : 'index, follow') }}">
    @if (!empty($seo['canonical']))
        <link rel="canonical" href="{{ $seo['canonical'] }}">
    @endif
    @if (!empty($seo['og']))
        <meta property="og:type" content="{{ $seo['og']['type'] }}">
        <meta property="og:title" content="{{ $seo['og']['title'] }}">
        <meta property="og:description" content="{{ $seo['og']['description'] }}">
        <meta property="og:url" content="{{ $seo['og']['url'] }}">
        <meta property="og:site_name" content="{{ $seo['og']['site_name'] }}">
        <meta property="og:locale" content="{{ $seo['og']['locale'] }}">
        <meta name="twitter:card" content="summary">
    @endif
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    @foreach (($seo['jsonld'] ?? []) as $schema)
        <script type="application/ld+json">{!! json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) !!}</script>
    @endforeach
    @viteReactRefresh
    @vite('resources/js/app.tsx')
    <x-inertia::head />
</head>
<body>
    <x-inertia::app />
</body>
</html>
