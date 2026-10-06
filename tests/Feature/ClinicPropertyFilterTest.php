<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\Service;
use App\Models\Specialty;
use App\Models\User;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Filters\ClinicFilters;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ClinicPropertyFilterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(FoundationSeeder::class);
    }

    public function test_catalog_includes_property_filter_options(): void
    {
        $city = City::query()->firstOrFail();

        $this->get(route('city.clinics', $city->slug))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('options.properties', 14)
                ->where('options.properties.0.slug', 'verified'));
    }

    public function test_filters_clinics_by_oms_and_partial_payment_flags(): void
    {
        $city = City::query()->firstOrFail();
        [$omsClinic, $partialClinic, $plainClinic] = $this->makeClinics($city);

        $repo = app(ClinicRepository::class);

        $oms = $repo->paginate(ClinicFilters::fromArray(['oms' => 1], $city->id), 50);
        $this->assertSame([$omsClinic->id], $oms->getCollection()->pluck('id')->all());

        $partial = $repo->paginate(ClinicFilters::fromArray(['partial_payment' => 1], $city->id), 50);
        $this->assertSame([$partialClinic->id], $partial->getCollection()->pluck('id')->all());

        $plain = $repo->paginate(ClinicFilters::fromArray([], $city->id), 50);
        $this->assertTrue($plain->getCollection()->pluck('id')->contains($plainClinic->id));
    }

    public function test_filters_clinics_by_multiple_services(): void
    {
        $city = City::query()->firstOrFail();
        $services = Service::query()->whereIn('slug', ['lechenie-kariesa', 'professionalnaya-chistka'])->pluck('id', 'slug');

        $both = $this->makeClinic($city, ['name' => 'Full Clinic', 'slug' => 'full-clinic']);
        $both->clinicServices()->createMany([
            ['service_id' => $services['lechenie-kariesa'], 'price_from' => 3000],
            ['service_id' => $services['professionalnaya-chistka'], 'price_from' => 5000],
        ]);

        $one = $this->makeClinic($city, ['name' => 'Partial Clinic', 'slug' => 'partial-clinic']);
        $one->clinicServices()->create(['service_id' => $services['lechenie-kariesa'], 'price_from' => 3200]);

        $repo = app(ClinicRepository::class);
        $filtered = $repo->paginate(
            ClinicFilters::fromArray(['services' => 'lechenie-kariesa,professionalnaya-chistka'], $city->id),
            50,
        );

        $this->assertSame([$both->id], $filtered->getCollection()->pluck('id')->all());
    }

    public function test_detskaya_property_filters_by_specialty(): void
    {
        $city = City::query()->firstOrFail();
        $specialty = Specialty::query()->where('slug', 'detskaya')->firstOrFail();

        $match = $this->makeClinic($city, ['name' => 'Kids Clinic', 'slug' => 'kids-clinic']);
        $match->specialties()->sync([$specialty->id]);

        $other = $this->makeClinic($city, ['name' => 'Adult Clinic', 'slug' => 'adult-clinic']);

        $repo = app(ClinicRepository::class);
        $filtered = $repo->paginate(ClinicFilters::fromArray(['detskaya' => 1], $city->id), 50);

        $this->assertSame([$match->id], $filtered->getCollection()->pluck('id')->all());
        $this->assertFalse($filtered->getCollection()->pluck('id')->contains($other->id));
    }

    /** @return array{0: Clinic, 1: Clinic, 2: Clinic} */
    private function makeClinics(City $city): array
    {
        return [
            $this->makeClinic($city, ['name' => 'OMS Clinic', 'slug' => 'oms-clinic', 'accepts_oms' => true]),
            $this->makeClinic($city, ['name' => 'Partial Clinic', 'slug' => 'partial-clinic', 'has_partial_payment' => true]),
            $this->makeClinic($city, ['name' => 'Plain Clinic', 'slug' => 'plain-clinic']),
        ];
    }

    /** @param array<string,mixed> $attrs */
    private function makeClinic(City $city, array $attrs): Clinic
    {
        $owner = User::factory()->create();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Org '.$attrs['slug']]);

        return Clinic::create(array_merge([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'address' => 'Test address',
            'status' => 'published',
        ], $attrs));
    }
}
