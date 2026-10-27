<?php

namespace Tests\Feature;

use App\Models\City;
use App\Services\CityGeolocationService;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CityGeolocationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_nearest_city_picks_closest_coordinates(): void
    {
        City::query()->where('slug', 'moskva')->update(['lat' => 55.7558, 'lng' => 37.6173]);
        City::query()->where('slug', '!=', 'moskva')->update(['lat' => null, 'lng' => null]);
        City::query()->create([
            'name' => 'Химки',
            'name_in' => 'Химках',
            'slug' => 'himki-test',
            'region' => 'Московская область',
            'is_active' => true,
            'sort' => 999,
            'lat' => 55.8881,
            'lng' => 37.4304,
        ]);

        $service = app(CityGeolocationService::class);
        $nearMoscow = $service->nearestCity(55.76, 37.62);
        $this->assertNotNull($nearMoscow);
        $this->assertSame('moskva', $nearMoscow->slug);

        $nearKhimki = $service->nearestCity(55.89, 37.43);
        $this->assertSame('himki-test', $nearKhimki?->slug);
    }

    public function test_first_visit_shows_city_prompt_without_cookies(): void
    {
        $this->withUnencryptedCookies([])
            ->get('/')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('city_prompt.suggested.slug'));
    }

    public function test_city_prompt_hidden_after_city_cookie(): void
    {
        $city = City::query()->where('slug', 'moskva')->firstOrFail();

        $this->withUnencryptedCookies(['city' => $city->slug])
            ->get('/')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('city_prompt', null));
    }

    public function test_city_switch_sets_confirmation_cookie(): void
    {
        $city = City::query()->where('slug', 'moskva')->firstOrFail();

        $response = $this->from('/')->post("/city/{$city->slug}");

        $response->assertRedirect('/');
        $cookies = collect($response->headers->getCookies())->keyBy(fn ($c) => $c->getName());
        $this->assertSame($city->slug, $cookies->get('city')?->getValue());
        $this->assertSame('1', $cookies->get('city_confirmed')?->getValue());
    }

    public function test_city_locate_api_returns_nearest_city(): void
    {
        City::query()->where('slug', 'moskva')->update(['lat' => 55.7558, 'lng' => 37.6173]);

        $this->postJson('/api/v1/city/locate', [
            'lat' => 55.76,
            'lng' => 37.62,
        ])->assertOk()->assertJsonPath('city.slug', 'moskva');
    }
}
