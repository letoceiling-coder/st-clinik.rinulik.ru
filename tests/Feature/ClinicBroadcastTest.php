<?php

namespace Tests\Feature;

use App\Models\Broadcast;
use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\User;
use App\Services\Broadcasts\BroadcastService;
use App\Services\Broadcasts\ClinicBroadcastSettings;
use App\Services\Broadcasts\ClinicFollowerService;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ClinicBroadcastTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        app(ClinicBroadcastSettings::class)->save(['requires_active_promotion' => false]);
    }

    public function test_user_can_follow_clinic_and_unsubscribe(): void
    {
        $user = User::factory()->create(['role' => 'user', 'status' => 'active', 'notify_email' => true, 'email_verified_at' => now()]);
        $clinic = $this->publishedClinic();

        $this->actingAs($user)->post("/clinics/{$clinic->slug}/follow")->assertRedirect();

        $this->assertDatabaseHas('clinic_followers', ['user_id' => $user->id, 'clinic_id' => $clinic->id]);

        $this->actingAs($user)->delete("/account/clinic-follows/{$clinic->id}")->assertRedirect();
        $this->assertDatabaseMissing('clinic_followers', ['user_id' => $user->id, 'clinic_id' => $clinic->id]);
    }

    public function test_clinic_broadcast_requires_moderation_before_send(): void
    {
        $clinic = $this->publishedClinic();

        $follower = User::factory()->create(['role' => 'user', 'status' => 'active', 'notify_email' => true, 'email_verified_at' => now()]);
        app(ClinicFollowerService::class)->subscribe($follower, $clinic);

        $broadcast = Broadcast::query()->create([
            'sender_type' => Broadcast::SENDER_CLINIC,
            'clinic_id' => $clinic->id,
            'name' => 'Акция',
            'body' => 'Скидка на гигиену.',
            'channels' => ['email'],
            'status' => 'draft',
        ]);

        app(BroadcastService::class)->submitClinicForModeration($broadcast, $clinic);
        $broadcast->refresh();
        $this->assertSame(Broadcast::MODERATION_PENDING, $broadcast->moderation_status);

        try {
            app(BroadcastService::class)->start($broadcast->fresh());
            $this->fail('Expected start to be blocked before moderation approval.');
        } catch (HttpException $e) {
            $this->assertSame(422, $e->getStatusCode());
        }
    }

    public function test_moderator_approves_and_builds_recipients(): void
    {
        $clinic = $this->publishedClinic();

        $follower = User::factory()->create(['role' => 'user', 'status' => 'active', 'notify_email' => true, 'email_verified_at' => now()]);
        app(ClinicFollowerService::class)->subscribe($follower, $clinic);

        $broadcast = Broadcast::query()->create([
            'sender_type' => Broadcast::SENDER_CLINIC,
            'clinic_id' => $clinic->id,
            'name' => 'Акция',
            'body' => 'Скидка.',
            'channels' => ['email'],
            'status' => 'draft',
        ]);

        app(BroadcastService::class)->submitClinicForModeration($broadcast, $clinic);
        app(BroadcastService::class)->moderateClinic($broadcast->fresh(), 'approve');

        $this->assertSame(Broadcast::MODERATION_APPROVED, $broadcast->fresh()->moderation_status);
        $this->assertTrue($broadcast->recipients()->where('user_id', $follower->id)->exists());
    }

    private function publishedClinic(?User $owner = null): Clinic
    {
        $owner ??= User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Org broadcast']);
        $city = City::query()->firstOrFail();

        return Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Клиника рассылок',
            'slug' => 'broadcast-clinic-'.uniqid(),
            'address' => 'Тест',
            'status' => 'published',
            'is_24_7' => false,
        ]);
    }
}
