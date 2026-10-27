<?php

namespace App\Services\Admin;

use App\Models\City;
use App\Models\District;
use App\Models\Region;
use App\Support\Text;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class CityImportService
{
    /**
     * CSV UTF-8, разделитель «;». Колонки:
     * name;slug;region;population;lat;lng;districts (районы через запятую).
     * Первая строка может быть заголовком (если name = «name» — пропускается).
     *
     * @return array{created: int, updated: int, regions: int, districts: int, skipped: int}
     */
    public function import(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        if ($path === false) {
            throw new \InvalidArgumentException('Не удалось прочитать файл.');
        }

        $handle = fopen($path, 'r');
        if ($handle === false) {
            throw new \InvalidArgumentException('Не удалось открыть CSV.');
        }

        $stats = ['created' => 0, 'updated' => 0, 'regions' => 0, 'districts' => 0, 'skipped' => 0];

        DB::transaction(function () use ($handle, &$stats): void {
            while (($row = fgetcsv($handle, 0, ';')) !== false) {
                if ($row === [null] || $row === false) {
                    continue;
                }

                $name = trim((string) ($row[0] ?? ''));
                if ($name === '' || strcasecmp($name, 'name') === 0) {
                    continue;
                }

                $slug = trim((string) ($row[1] ?? ''));
                $slug = $slug !== '' ? $slug : Text::slug($name);
                $regionName = trim((string) ($row[2] ?? ''));
                $population = filled($row[3] ?? null) ? (int) $row[3] : null;
                $lat = filled($row[4] ?? null) ? (float) $row[4] : null;
                $lng = filled($row[5] ?? null) ? (float) $row[5] : null;
                $districtsRaw = trim((string) ($row[6] ?? ''));

                $regionId = null;
                if ($regionName !== '') {
                    $region = Region::query()->firstOrCreate(
                        ['slug' => Text::slug($regionName)],
                        ['name' => $regionName, 'is_active' => true],
                    );
                    if ($region->wasRecentlyCreated) {
                        $stats['regions']++;
                    }
                    $regionId = $region->id;
                }

                $city = City::query()->where('slug', $slug)->first();
                $payload = array_filter([
                    'name' => $name,
                    'slug' => $slug,
                    'region' => $regionName !== '' ? $regionName : null,
                    'region_id' => $regionId,
                    'population' => $population,
                    'lat' => $lat,
                    'lng' => $lng,
                    'is_active' => true,
                ], fn ($v) => $v !== null);

                if ($city) {
                    $city->fill($payload);
                    $city->save();
                    $stats['updated']++;
                } else {
                    $city = City::query()->create($payload + ['sort' => 500]);
                    $stats['created']++;
                }

                if ($districtsRaw !== '') {
                    foreach (array_filter(array_map('trim', explode(',', $districtsRaw))) as $districtName) {
                        $dSlug = Text::slug($districtName);
                        $district = District::query()->firstOrCreate(
                            ['city_id' => $city->id, 'slug' => $dSlug],
                            ['name' => $districtName],
                        );
                        if ($district->wasRecentlyCreated) {
                            $stats['districts']++;
                        }
                    }
                }
            }
        });

        fclose($handle);

        return $stats;
    }
}
