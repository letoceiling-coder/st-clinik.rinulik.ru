<?php

namespace App\Services\Offers;

use App\Models\Clinic;
use App\Models\ParsedOrganization;
use App\Models\PromotionPackage;
use App\Services\PromotionService;
use Illuminate\Support\Str;

/**
 * Подставляет переменные в шаблон КП и собирает версии по каналам.
 *
 * Разметка тела: пустая строка — новый абзац, `# ` / `## ` — заголовки, `- ` — пункт списка,
 * `**текст**` — жирный, ссылки распознаются автоматически. HTML из шаблона экранируется.
 */
class OfferRenderer
{
    public const VARIABLES = [
        '{org.name}' => 'Название клиники',
        '{city}' => 'Город',
        '{org.rating}' => 'Рейтинг на Яндекс Картах',
        '{org.reviews}' => 'Отзывов на Яндекс Картах',
        '{competitors_in_city}' => 'Стоматологий в городе (по данным парсера)',
        '{platform.clinics_in_city}' => 'Клиник города на СтомКлиник',
        '{platform.visitors_in_city}' => 'Просмотров карточек клиник города на СтомКлиник',
        '{tariffs}' => 'Тарифы продвижения с ценами города',
        '{demo_link}' => 'Ссылка на демо-кабинет',
        '{offer_link}' => 'Ссылка на страницу КП',
        '{manager.name}' => 'Имя менеджера',
        '{manager.phone}' => 'Телефон менеджера',
        '{unsubscribe_link}' => 'Ссылка для отписки',
    ];

    /** Рекомендуемый предел: два SMS-сегмента кириллицей. */
    public const SMS_MAX_SEGMENTS = 2;

    public function __construct(
        private readonly OfferSettings $settings,
        private readonly PromotionService $promotions,
    ) {}

    /**
     * @param  array<string, string|null>  $content  поля версии шаблона
     * @param  array<string, string>  $links  offer_link, demo_link, unsubscribe_link
     * @return array{web_title: string, web_html: string, email_subject: string, email_html: string, email_text: string, sms: string, messenger: string, call_script: string|null}
     */
    public function render(array $content, Clinic $clinic, array $links): array
    {
        $vars = $this->variables($clinic, $links);
        $fill = fn (?string $text) => strtr((string) $text, $vars);

        $emailText = $fill($content['email_body'] ?? '');
        if (! str_contains((string) ($content['email_body'] ?? ''), '{unsubscribe_link}') && ($links['unsubscribe_link'] ?? '') !== '') {
            $emailText .= "\n\nНе хотите получать предложения — отпишитесь: ".$links['unsubscribe_link'];
        }

        return [
            'web_title' => $fill($content['web_title'] ?? ''),
            'web_html' => $this->toHtml($fill($content['web_body'] ?? '')),
            'email_subject' => Str::limit($fill($content['email_subject'] ?? ''), 150, ''),
            'email_html' => $this->toHtml($emailText),
            'email_text' => $this->toPlain($emailText),
            'sms' => $this->sms($fill($content['sms_text'] ?? '')),
            'messenger' => $this->toPlain($fill($content['messenger_text'] ?? '')),
            'call_script' => filled($content['call_script'] ?? null) ? $this->toPlain($fill($content['call_script'])) : null,
        ];
    }

    /**
     * @param  array<string, string>  $links
     * @return array<string, string>
     */
    public function variables(Clinic $clinic, array $links): array
    {
        $clinic->loadMissing('city:id,name');
        $parsed = ParsedOrganization::query()->where('clinic_id', $clinic->id)->first();
        $cityId = (int) $clinic->city_id;
        $published = Clinic::query()->where('city_id', $cityId)->where('status', 'published');
        $manager = $this->settings->manager();

        return [
            '{org.name}' => (string) $clinic->name,
            '{city}' => (string) ($clinic->city?->name ?? ''),
            '{org.rating}' => $parsed?->rating ? number_format((float) $parsed->rating, 1, ',', '') : '—',
            '{org.reviews}' => (string) ($parsed?->reviews_count ?? 0),
            '{competitors_in_city}' => (string) max(ParsedOrganization::query()->where('city_id', $cityId)->count(), (clone $published)->count()),
            '{platform.clinics_in_city}' => (string) (clone $published)->count(),
            '{platform.visitors_in_city}' => number_format((int) (clone $published)->sum('views_count'), 0, ',', ' '),
            '{tariffs}' => $this->tariffs($cityId),
            '{demo_link}' => $links['demo_link'] ?? '',
            '{offer_link}' => $links['offer_link'] ?? '',
            '{manager.name}' => $manager['name'],
            '{manager.phone}' => $manager['phone'],
            '{unsubscribe_link}' => $links['unsubscribe_link'] ?? '',
        ];
    }

    /** @return list<array{name: string, description: string|null, price: int|null, days: int}> */
    public function tariffList(int $cityId): array
    {
        return PromotionPackage::query()->where('is_active', true)->orderBy('sort')->get()
            ->map(fn (PromotionPackage $p) => [
                'name' => (string) $p->name,
                'description' => $p->description,
                'price' => $this->promotions->resolvePrice('package', $p->id, $cityId)?->price,
                'days' => (int) $p->duration_days,
            ])
            ->values()->all();
    }

    private function tariffs(int $cityId): string
    {
        return collect($this->tariffList($cityId))
            ->map(fn (array $t) => '- '.$t['name'].($t['price'] !== null ? ' — '.number_format($t['price'], 0, ',', ' ').' ₽ за '.$t['days'].' дн.' : ''))
            ->implode("\n");
    }

    public function toHtml(string $text): string
    {
        $blocks = preg_split('/\R{2,}/u', trim(str_replace("\r", '', $text))) ?: [];
        $html = [];
        foreach ($blocks as $block) {
            $lines = preg_split('/\R/u', $block) ?: [];
            if ($lines !== [] && collect($lines)->every(fn (string $l) => str_starts_with(ltrim($l), '- '))) {
                $html[] = '<ul>'.collect($lines)->map(fn (string $l) => '<li>'.$this->inline(substr(ltrim($l), 2)).'</li>')->implode('').'</ul>';

                continue;
            }
            if (str_starts_with($block, '## ')) {
                $html[] = '<h3>'.$this->inline(substr($block, 3)).'</h3>';

                continue;
            }
            if (str_starts_with($block, '# ')) {
                $html[] = '<h2>'.$this->inline(substr($block, 2)).'</h2>';

                continue;
            }
            $html[] = '<p>'.collect($lines)->map(fn (string $l) => $this->inline($l))->implode('<br>').'</p>';
        }

        return implode("\n", $html);
    }

    public function toPlain(string $text): string
    {
        $text = preg_replace('/\*\*(.+?)\*\*/u', '$1', str_replace("\r", '', $text)) ?? $text;
        $text = preg_replace('/^#{1,2} /mu', '', $text) ?? $text;

        return trim(preg_replace('/^- /mu', '• ', $text) ?? $text);
    }

    private function sms(string $text): string
    {
        return trim(preg_replace('/\s+/u', ' ', $this->toPlain($text)) ?? '');
    }

    /** Число SMS-сегментов: кириллица — 70 знаков в одном, 67 в составном; латиница — 160 и 153. */
    public static function smsSegments(string $text): int
    {
        $length = mb_strlen($text);
        $unicode = preg_match('/[^\x00-\x7F]/', $text) === 1;
        [$single, $multi] = $unicode ? [70, 67] : [160, 153];

        return $length <= $single ? 1 : (int) ceil($length / $multi);
    }

    private function inline(string $text): string
    {
        $escaped = e($text);
        $escaped = preg_replace('/\*\*(.+?)\*\*/u', '<strong>$1</strong>', $escaped) ?? $escaped;

        return preg_replace_callback(
            '~https?://[^\s<]+~u',
            fn (array $m) => '<a href="'.$m[0].'" target="_blank" rel="noopener">'.$m[0].'</a>',
            $escaped,
        ) ?? $escaped;
    }
}
