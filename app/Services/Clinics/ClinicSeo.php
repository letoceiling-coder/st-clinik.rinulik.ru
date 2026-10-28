<?php

namespace App\Services\Clinics;

use App\Models\Clinic;
use App\Services\Seo;
use App\Support\Text;

/**
 * SEO страницы клиники: заголовок и описание собираются по шаблону «clinic» автоматически,
 * а заполненные вручную в админке значения имеют приоритет.
 */
class ClinicSeo
{
    public function __construct(private readonly Seo $seo) {}

    /** @return array<string, scalar|null> */
    public function vars(Clinic $clinic): array
    {
        $clinic->loadMissing('city:id,name');

        return [
            'name' => $clinic->name,
            'city' => $clinic->city?->name,
            'address' => $clinic->address,
            'rating' => $clinic->reviews_count ? number_format((float) $clinic->rating, 1, ',', '') : 'нет оценок',
            'reviews' => (int) $clinic->reviews_count,
            'doctors' => (int) ($clinic->doctors_count ?? $clinic->doctors()->published()->count()),
            'price' => $clinic->min_price ? Text::money((int) $clinic->min_price) : 'по запросу',
        ];
    }

    /** @return array{title: string, description: string} */
    public function auto(Clinic $clinic): array
    {
        $vars = $this->vars($clinic);
        $template = $this->seo->template('clinic');
        $appName = (string) config('app.name');

        $title = $template ? Seo::fill($template->title_tpl, $vars) : $clinic->name.' | '.$appName;
        $description = $template ? Seo::fill($template->description_tpl, $vars) : '';

        return [
            'title' => mb_strimwidth($title, 0, 160, '…'),
            'description' => mb_strimwidth($description, 0, 300, '…'),
        ];
    }

    /**
     * Подставляет ручные SEO-поля клиники поверх собранных по шаблону.
     *
     * @param  array<string, mixed>  $seoData
     * @return array<string, mixed>
     */
    public function applyOverrides(array $seoData, Clinic $clinic): array
    {
        if (filled($clinic->seo_title)) {
            $seoData['title'] = mb_strimwidth(trim((string) $clinic->seo_title), 0, 160, '…');
            $seoData['og']['title'] = $seoData['title'];
        }
        if (filled($clinic->seo_description)) {
            $seoData['description'] = mb_strimwidth(trim((string) $clinic->seo_description), 0, 300, '…');
            $seoData['og']['description'] = $seoData['description'];
        }

        return $seoData;
    }
}
