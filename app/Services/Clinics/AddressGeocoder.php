<?php

namespace App\Services\Clinics;

use App\Models\City;
use App\Models\Clinic;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Координаты филиала по адресу через HTTP Геокодер Яндекса.
 * Без ключа или при ошибке геокодера ничего не меняет — сохранение филиала не должно падать из-за карты.
 */
class AddressGeocoder
{
    private const ENDPOINT = 'https://geocode-maps.yandex.ru/1.x/';

    /** Проставляет координаты, если их нет или изменились город либо адрес. */
    public function fillCoordinates(Clinic $clinic): void
    {
        $addressChanged = $clinic->isDirty(['address', 'city_id']);
        $hasCoordinates = $clinic->lat !== null && $clinic->lng !== null;
        if ($hasCoordinates && ! $addressChanged) {
            return;
        }
        if ($addressChanged && $clinic->isDirty(['lat', 'lng']) && $hasCoordinates) {
            return;
        }

        $point = $this->geocode($this->query($clinic));
        if ($point !== null) {
            $clinic->lat = $point['lat'];
            $clinic->lng = $point['lng'];
        } elseif ($addressChanged) {
            $clinic->lat = null;
            $clinic->lng = null;
        }
    }

    /** @return array{lat: float, lng: float}|null */
    public function geocode(string $query): ?array
    {
        $apiKey = config('services.yandex.maps_api_key');
        if (blank($apiKey) || blank($query)) {
            return null;
        }

        try {
            $response = Http::timeout(5)
                ->withHeaders(['Referer' => rtrim((string) config('app.url'), '/').'/'])
                ->get(self::ENDPOINT, ['apikey' => $apiKey, 'geocode' => $query, 'format' => 'json', 'results' => 1]);
        } catch (Throwable) {
            return null;
        }

        $pos = $response->successful() ? $response->json('response.GeoObjectCollection.featureMember.0.GeoObject.Point.pos') : null;
        if (! is_string($pos) || ! str_contains($pos, ' ')) {
            return null;
        }

        [$lng, $lat] = array_map('floatval', explode(' ', $pos, 2));

        return ['lat' => $lat, 'lng' => $lng];
    }

    private function query(Clinic $clinic): string
    {
        $city = $clinic->city_id ? City::query()->whereKey($clinic->city_id)->value('name') : null;

        return trim(implode(', ', array_filter([$city, $clinic->address])));
    }
}
