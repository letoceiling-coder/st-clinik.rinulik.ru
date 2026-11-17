<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\Service;
use App\Models\Specialty;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SeoUrlsAndSitemapTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        Cache::flush();
    }

    public function test_direction_page_is_served_on_city_slug_url(): void
    {
        $city = City::query()->firstOrFail();
        $specialty = Specialty::query()->firstOrFail();

        $this->get("/{$city->slug}/{$specialty->slug}")->assertOk();
        $this->assertSame("/{$city->slug}/{$specialty->slug}", route('city.direction', [$city->slug, $specialty->slug], false));
    }

    public function test_legacy_directions_url_redirects_permanently(): void
    {
        $city = City::query()->firstOrFail();
        $specialty = Specialty::query()->firstOrFail();

        $this->get("/{$city->slug}/directions/{$specialty->slug}")
            ->assertStatus(301)
            ->assertRedirect(route('city.direction', [$city->slug, $specialty->slug]));
    }

    public function test_service_slug_redirects_to_catalog_filter_and_unknown_slug_is_404(): void
    {
        $city = City::query()->firstOrFail();
        $service = Service::query()->firstOrFail();

        $this->get("/{$city->slug}/{$service->slug}")
            ->assertStatus(301)
            ->assertRedirect(route('city.clinics', $city->slug).'?service='.$service->slug);

        $this->get("/{$city->slug}/net-takoy-stranicy")->assertNotFound();
    }

    public function test_fixed_city_sections_are_not_shadowed_by_slug_route(): void
    {
        $city = City::query()->firstOrFail();

        foreach (['clinics', 'doctors', 'directions', 'prices', 'reviews'] as $section) {
            $this->get("/{$city->slug}/{$section}")->assertOk();
        }
    }

    public function test_sitemap_is_an_index_with_part_files(): void
    {
        $city = City::query()->firstOrFail();
        $org = Organization::create(['name' => 'Org']);
        Clinic::create(['organization_id' => $org->id, 'city_id' => $city->id, 'name' => 'Sitemap Clinic', 'slug' => 'sitemap-clinic', 'address' => 'x', 'status' => 'published']);

        $index = $this->get('/sitemap.xml')->assertOk()->getContent();
        $this->assertStringContainsString('<sitemapindex', $index);
        foreach (['pages', 'clinics', 'doctors'] as $type) {
            $this->assertStringContainsString("sitemap-{$type}-1.xml", $index);
        }

        $clinics = $this->get('/sitemap-clinics-1.xml')->assertOk()->getContent();
        $this->assertStringContainsString('<urlset', $clinics);
        $this->assertStringContainsString('/clinics/sitemap-clinic', $clinics);

        $pages = $this->get('/sitemap-pages-1.xml')->assertOk()->getContent();
        $specialty = Specialty::query()->firstOrFail();
        $this->assertStringContainsString("/{$city->slug}/{$specialty->slug}", $pages);
        $this->assertStringNotContainsString('/directions/'.$specialty->slug, $pages);

        $this->get('/sitemap-clinics-99.xml')->assertOk();
        $this->get('/sitemap-unknown-1.xml')->assertNotFound();
    }
}
