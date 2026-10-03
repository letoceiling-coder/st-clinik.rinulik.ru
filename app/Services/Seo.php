<?php

namespace App\Services;

use App\Models\SeoTemplate;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * Генерация title/description/canonical/robots по шаблонам из админки (SEO-шаблоны).
 */
class Seo
{
    /** @var array<string,SeoTemplate>|null */
    private ?array $templates = null;

    private function template(string $type): ?SeoTemplate
    {
        if ($this->templates === null) {
            $this->templates = Schema::hasTable('seo_templates')
                ? SeoTemplate::query()->get()->keyBy('page_type')->all()
                : [];
        }

        return $this->templates[$type] ?? null;
    }

    public static function flush(): void
    {
        Cache::forget('seo.templates');
    }

    /** @param array<string,scalar|null> $vars */
    public static function fill(string $tpl, array $vars): string
    {
        $out = preg_replace_callback('/\{(\w+)\}/u', fn ($m) => (string) ($vars[$m[1]] ?? ''), $tpl);

        return trim(preg_replace('/\s{2,}/u', ' ', $out ?? ''));
    }

    /**
     * @param  array<string,scalar|null>  $vars
     * @param  list<array<string,mixed>>  $jsonLd
     * @return array<string,mixed>
     */
    public function build(string $type, array $vars, array $jsonLd = [], bool $forceNoindex = false, ?string $canonical = null): array
    {
        $tpl = $this->template($type);
        $appName = config('app.name');

        $title = $tpl ? self::fill($tpl->title_tpl, $vars) : ($vars['name'] ?? $appName).' | '.$appName;
        $description = $tpl ? self::fill($tpl->description_tpl, $vars) : '';
        $h1 = $tpl && $tpl->h1_tpl ? self::fill($tpl->h1_tpl, $vars) : ($vars['name'] ?? $title);

        $url = $canonical ?? url()->current();
        $page = (int) request()->query('page', 1);
        if ($page > 1 && $canonical === null) {
            $url .= '?page='.$page;
        }

        $hasFilters = collect(request()->query())->except(['page'])->filter(fn ($v) => $v !== null && $v !== '')->isNotEmpty();
        $noindex = config('app.noindex') || $forceNoindex || ($tpl?->noindex ?? false) || $hasFilters;

        return [
            'title' => mb_strimwidth($title, 0, 160, '…'),
            'description' => mb_strimwidth($description, 0, 300, '…'),
            'h1' => $h1,
            'canonical' => $url,
            'robots' => config('app.noindex') ? 'noindex, nofollow' : ($noindex ? 'noindex, follow' : 'index, follow'),
            'og' => [
                'type' => $vars['og_type'] ?? 'website',
                'title' => $title,
                'description' => $description,
                'url' => $url,
                'site_name' => $appName,
                'locale' => 'ru_RU',
            ],
            'jsonld' => $jsonLd,
        ];
    }

    /** Для служебных страниц (кабинеты, авторизация): всегда noindex. */
    public function private(string $title): array
    {
        return [
            'title' => $title.' | '.config('app.name'),
            'description' => '',
            'h1' => $title,
            'canonical' => url()->current(),
            'robots' => 'noindex, nofollow',
            'og' => null,
            'jsonld' => [],
        ];
    }
}
