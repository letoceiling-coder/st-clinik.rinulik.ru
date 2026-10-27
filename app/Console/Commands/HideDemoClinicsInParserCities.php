<?php

namespace App\Console\Commands;

use App\Models\City;
use App\Models\Clinic;
use Illuminate\Console\Command;

class HideDemoClinicsInParserCities extends Command
{
    protected $signature = 'parser:hide-demo-clinics
        {--cities=krasnodar,anapa,stavropol : Slugs городов, где показываем только импорт из parser}';

    protected $description = 'Скрыть демо-клиники в городах с реальными карточками (yandex_org_id)';

    public function handle(): int
    {
        $slugs = array_filter(array_map('trim', explode(',', (string) $this->option('cities'))));
        $cityIds = City::query()->whereIn('slug', $slugs)->pluck('id', 'slug');

        if ($cityIds->isEmpty()) {
            $this->warn('Города не найдены.');

            return self::FAILURE;
        }

        $hidden = 0;
        foreach ($cityIds as $slug => $cityId) {
            $hasReal = Clinic::query()
                ->where('city_id', $cityId)
                ->whereNotNull('yandex_org_id')
                ->exists();

            if (! $hasReal) {
                $this->line("{$slug}: нет импорта parser — демо не трогаем.");

                continue;
            }

            $count = Clinic::query()
                ->where('city_id', $cityId)
                ->whereNull('yandex_org_id')
                ->where('status', 'published')
                ->update(['status' => 'hidden']);

            $hidden += $count;
            $this->info("{$slug}: скрыто демо-клиник — {$count}");
        }

        $this->info("Всего скрыто: {$hidden}");

        return self::SUCCESS;
    }
}
