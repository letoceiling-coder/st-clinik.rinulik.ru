<?php

namespace App\Services;

use App\Models\City;
use App\Repositories\Contracts\CatalogRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CityGeolocationService
{
    private const IP_CACHE_SECONDS = 86_400;

    private const COORDS_CACHE_KEY = 'city.geo.coords_index';

    private const COORDS_CACHE_SECONDS = 3_600;

    public function __construct(private readonly CatalogRepository $catalog) {}

    public function detectFromIp(?string $ip): ?City
    {
        if ($ip === null || ! $this->isPublicIp($ip)) {
            return null;
        }

        $hash = hash('sha256', $ip);

        return Cache::remember("city.geo.ip.{$hash}", self::IP_CACHE_SECONDS, function () use ($ip): ?City {
            $coords = $this->coordinatesForIp($ip);
            if ($coords === null) {
                return null;
            }

            return $this->nearestCity($coords['lat'], $coords['lng']);
        });
    }

    /** @return array{lat: float, lng: float}|null */
    public function detectCoordinatesFromIp(?string $ip): ?array
    {
        if ($ip === null || ! $this->isPublicIp($ip)) {
            return null;
        }

        $hash = hash('sha256', $ip);

        return Cache::remember("city.geo.ip_coords.{$hash}", self::IP_CACHE_SECONDS, fn (): ?array => $this->coordinatesForIp($ip));
    }

    public function nearestCity(float $lat, float $lng, float $maxKm = 250.0): ?City
    {
        $best = null;
        $bestKm = PHP_FLOAT_MAX;

        foreach ($this->citiesWithCoordinates() as $city) {
            $km = $this->haversineKm($lat, $lng, (float) $city->lat, (float) $city->lng);
            if ($km < $bestKm) {
                $bestKm = $km;
                $best = $city;
            }
        }

        if ($best === null || $bestKm > $maxKm) {
            return null;
        }

        return $best;
    }

    /** @return Collection<int, City> */
    private function citiesWithCoordinates(): Collection
    {
        return Cache::remember(self::COORDS_CACHE_KEY, self::COORDS_CACHE_SECONDS, fn () => City::query()
            ->where('is_active', true)
            ->whereNotNull('lat')
            ->whereNotNull('lng')
            ->get(['id', 'slug', 'name', 'name_in', 'region', 'lat', 'lng']));
    }

    /** @return array{lat: float, lng: float}|null */
    private function coordinatesForIp(string $ip): ?array
    {
        $key = app(IntegrationSettings::class)->valueForConfigPath('services.yandex.maps_api_key');
        if (! filled($key)) {
            return null;
        }

        try {
            $response = Http::timeout(4)
                ->acceptJson()
                ->post('https://geolocation.yandex.net/geolocation/v1/?apikey='.urlencode((string) $key), [
                    'ip' => $ip,
                ]);

            if (! $response->successful()) {
                return null;
            }

            $lat = data_get($response->json(), 'position.latitude');
            $lng = data_get($response->json(), 'position.longitude');
            if (! is_numeric($lat) || ! is_numeric($lng)) {
                return null;
            }

            return ['lat' => (float) $lat, 'lng' => (float) $lng];
        } catch (\Throwable $e) {
            Log::debug('city.geo.ip_failed', ['message' => $e->getMessage()]);

            return null;
        }
    }

    private function isPublicIp(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earth * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
