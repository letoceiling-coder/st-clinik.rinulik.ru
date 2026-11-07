<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicDocument;
use App\Models\ClinicPhoto;
use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\User;
use App\Services\ProfileMetrics;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ClinicModerationFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_clinic_moderation_goes_pending_approved_published(): void
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Mod org']);
        OrganizationStaff::query()->create([
            'organization_id' => $org->id,
            'user_id' => $owner->id,
            'role' => OrganizationStaff::ROLE_OWNER,
            'invited_at' => now(),
        ]);
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => (int) City::query()->where('name', 'Краснодар')->value('id'),
            'name' => 'Тестовая стоматология',
            'slug' => 'test-mod-clinic',
            'address' => 'ул. Тестовая, 1',
            'phone' => '+79001112233',
            'status' => 'draft',
            'description' => str_repeat('Описание клиники. ', 20),
            'schedule' => ['mon' => ['open' => '09:00', 'close' => '18:00']],
            'payment_methods' => ['Наличные'],
            'lat' => 45.0,
            'lng' => 39.0,
            'restrictions' => 'Нет',
            'art_seed' => 1,
        ]);

        $admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);

        $this->actingAs($owner)->post(route('cabinet.branches.submit', $clinic))->assertRedirect();
        $this->assertSame('pending', $clinic->fresh()->status);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $admin->id, 'type' => 'moderation_request']);
        $this->assertDatabaseMissing('user_notifications', ['user_id' => $owner->id, 'type' => 'moderation_request']);

        $this->actingAs($admin)->put(route('admin.clinics.update', $clinic), [
            'status' => 'approved',
            'is_verified' => false,
        ])->assertRedirect();
        $this->assertSame('approved', $clinic->fresh()->status);

        $this->actingAs($owner)->post(route('cabinet.branches.publish', $clinic))->assertRedirect();
        $this->assertSame('published', $clinic->fresh()->status);
    }

    public function test_registered_clinic_owner_creates_geocoded_branch_and_sees_what_to_fill_before_moderation(): void
    {
        config(['services.yandex.maps_api_key' => 'test-maps-key']);
        Http::fake([
            'geocode-maps.yandex.ru/*' => Http::response(['response' => ['GeoObjectCollection' => ['featureMember' => [
                ['GeoObject' => ['Point' => ['pos' => '41.9734 45.0428']]],
            ]]]]),
        ]);

        $this->post('/register/clinic', [
            'name' => 'Владелец Тест',
            'organization_name' => 'ООО Улыбка',
            'email' => 'owner-flow@st-clinik.test',
            'password' => 'Secret123',
            'password_confirmation' => 'Secret123',
            'consent' => '1',
        ])->assertRedirect(route('cabinet.branches.create'));

        $owner = User::query()->where('email', 'owner-flow@st-clinik.test')->firstOrFail();
        $this->assertSame('clinic_owner', $owner->role);
        $this->assertDatabaseHas('organization_staff', ['user_id' => $owner->id, 'role' => OrganizationStaff::ROLE_OWNER]);

        $this->actingAs($owner)->post(route('cabinet.branches.store'), [
            'name' => 'Улыбка на Ленина',
            'city_id' => (int) City::query()->where('name', 'Краснодар')->value('id'),
            'address' => 'ул. Ленина, 100',
            'phone' => '+7 (900) 111-22-33',
        ])->assertRedirect(route('cabinet.branches'));

        $clinic = Clinic::query()->where('name', 'Улыбка на Ленина')->firstOrFail();
        $this->assertSame('draft', $clinic->status);
        $this->assertEqualsWithDelta(45.0428, (float) $clinic->lat, 0.0001);
        $this->assertEqualsWithDelta(41.9734, (float) $clinic->lng, 0.0001);

        $this->actingAs($owner)->post(route('cabinet.branches.submit', $clinic))
            ->assertSessionHas('error', fn (string $message) => str_contains($message, 'Профиль заполнен на 12%')
                && str_contains($message, 'минимум 3 фото (+15%), подтверждённая лицензия (+15%)'));
        $this->assertSame('draft', $clinic->fresh()->status);
    }

    public function test_photos_and_license_waiting_for_review_count_toward_moderation_threshold(): void
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Media org']);
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => (int) City::query()->where('name', 'Краснодар')->value('id'),
            'name' => 'Клиника с фото на проверке',
            'slug' => 'pending-media-clinic',
            'address' => 'ул. Тестовая, 2',
            'phone' => '+79001112244',
            'status' => 'draft',
            'art_seed' => 1,
        ]);
        foreach (range(1, 3) as $i) {
            ClinicPhoto::query()->create(['clinic_id' => $clinic->id, 'path' => "photos/{$i}.jpg", 'status' => 'pending']);
        }
        ClinicDocument::query()->create(['clinic_id' => $clinic->id, 'type' => 'license', 'title' => 'Лицензия', 'path' => 'docs/license.pdf', 'status' => 'pending']);

        $readiness = app(ProfileMetrics::class)->moderationReadiness($clinic);

        $this->assertSame(38, $readiness['percent']);
        $this->assertFalse($readiness['ready']);
        $this->assertSame(8, app(ProfileMetrics::class)->completeness($clinic)['percent']);
    }
}
