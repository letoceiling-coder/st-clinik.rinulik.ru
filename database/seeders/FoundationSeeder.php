<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\CmsPage;
use App\Models\Concern;
use App\Models\District;
use App\Models\Role;
use App\Models\SeoTemplate;
use App\Models\Service;
use App\Models\Specialty;
use App\Support\Text;
use Illuminate\Database\Seeder;

/** Роли, справочники, CMS и SEO-шаблоны — нужны в любом окружении. */
class FoundationSeeder extends Seeder
{
    private const CITY_IN = [
        'moskva' => 'в Москве',
        'sankt-peterburg' => 'в Санкт-Петербурге',
        'novosibirsk' => 'в Новосибирске',
        'ekaterinburg' => 'в Екатеринбурге',
        'kazan' => 'в Казани',
        'nizhniy-novgorod' => 'в Нижнем Новгороде',
        'krasnodar' => 'в Краснодаре',
        'samara' => 'в Самаре',
        'rostov-na-donu' => 'в Ростове-на-Дону',
        'ufa' => 'в Уфе',
        'krasnoyarsk' => 'в Красноярске',
        'voronezh' => 'в Воронеже',
    ];

    public function run(): void
    {
        $this->roles();
        $this->dictionaries();
        $this->cms();
    }

    private function roles(): void
    {
        foreach (config('permissions.defaults') as $slug => $def) {
            Role::updateOrCreate(['slug' => $slug], [
                'name' => $def['name'],
                'description' => $def['description'],
                'permissions' => $def['permissions'],
                'is_system' => true,
            ]);
        }
    }

    private function dictionaries(): void
    {
        $data = require database_path('seeders/data/dictionaries.php');

        foreach ($data['cities'] as $i => [$name, $slug, $region, $lat, $lng, $population, $districts]) {
            $city = City::updateOrCreate(['slug' => $slug], [
                'name' => $name,
                'name_in' => self::CITY_IN[$slug] ?? 'в '.$name,
                'region' => $region,
                'lat' => $lat,
                'lng' => $lng,
                'population' => $population,
                'sort' => ($i + 1) * 10,
            ]);
            foreach ($districts as $d) {
                District::updateOrCreate(['city_id' => $city->id, 'slug' => Text::slug($d)], ['name' => $d]);
            }
        }

        foreach ($data['specialties'] as $i => [$slug, $name, $icon, $short, $description, $when, $restrictions]) {
            Specialty::updateOrCreate(['slug' => $slug], [
                'name' => $name, 'icon' => $icon, 'short' => $short, 'description' => $description,
                'when_to_apply' => $when, 'restrictions' => $restrictions, 'sort' => ($i + 1) * 10,
            ]);
        }
        $specialties = Specialty::pluck('id', 'slug');

        foreach ($data['services'] as [$spec, $slug, $name, $price, $duration, $popular, $description]) {
            Service::updateOrCreate(['slug' => $slug], [
                'specialty_id' => $specialties[$spec], 'name' => $name, 'price_hint_from' => $price,
                'duration_min' => $duration, 'is_popular' => $popular, 'description' => $description,
            ]);
        }
        $services = Service::pluck('id', 'slug');

        foreach ($data['concerns'] as $i => [$slug, $name, $icon, $spec, $hint, $serviceSlugs, $keywords, $advice]) {
            $concern = Concern::updateOrCreate(['slug' => $slug], [
                'specialty_id' => $specialties[$spec], 'name' => $name, 'icon' => $icon, 'hint' => $hint,
                'keywords' => $keywords, 'advice' => $advice, 'sort' => ($i + 1) * 10,
            ]);
            $concern->services()->sync(array_values(array_filter(array_map(fn ($s) => $services[$s] ?? null, $serviceSlugs))));
        }
    }

    private function cms(): void
    {
        $cms = require database_path('seeders/data/cms.php');

        foreach ($cms['pages'] as $page) {
            CmsPage::updateOrCreate(['slug' => $page['slug']], [
                'title' => $page['title'],
                'body' => $page['body'],
                'meta_title' => $page['title'].' | СтомКлиник',
                'meta_description' => $page['meta_description'] ?? null,
                'kind' => 'page',
                'status' => 'published',
            ]);
        }

        foreach ($cms['seo_templates'] as [$type, $title, $description, $h1, $noindex]) {
            SeoTemplate::updateOrCreate(['page_type' => $type], [
                'title_tpl' => $title, 'description_tpl' => $description, 'h1_tpl' => $h1, 'noindex' => $noindex,
            ]);
        }
    }
}
