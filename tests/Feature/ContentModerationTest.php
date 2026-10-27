<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\PromotionPackage;
use App\Models\PromotionProduct;
use App\Models\Review;
use App\Models\User;
use App\Services\ContentModerationSettings;
use App\Services\PromotionService;
use App\Services\ReviewService;
use Database\Seeders\FoundationSeeder;
use Database\Seeders\PromotionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContentModerationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        $this->seed(PromotionSeeder::class);
    }

    public function test_new_review_notifies_clinic_owner(): void
    {
        [$owner, $clinic, $patient] = $this->fixtures();

        app(ReviewService::class)->create($clinic, $patient, [
            'rating' => 5,
            'body' => str_repeat('Отличная клиника, всё понравилось. ', 3),
            'visit_date' => now()->subDays(3)->toDateString(),
            'rules' => true,
            'consent' => true,
        ]);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $owner->id,
            'type' => 'review_new',
        ]);
    }

    public function test_review_reply_requires_moderation_when_enabled(): void
    {
        [$owner, $clinic] = $this->fixtures();
        app(ContentModerationSettings::class)->save(['moderate_review_replies' => true]);

        $review = Review::create([
            'user_id' => User::factory()->create()->id,
            'clinic_id' => $clinic->id,
            'rating' => 4,
            'body' => str_repeat('Хороший приём, рекомендую. ', 3),
            'visit_date' => now()->subWeek(),
            'author_name' => 'Иван И.',
            'status' => 'published',
            'published_at' => now(),
        ]);

        $this->actingAs($owner)->post('/clinic-cabinet/reviews/'.$review->id.'/reply?branch='.$clinic->id, [
            'reply_text' => 'Спасибо за отзыв, рады были помочь!',
        ])->assertRedirect();

        $review->refresh();
        $this->assertSame('pending', $review->reply_status);
        $this->assertNull($review->reply_at);

        $admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);
        $this->actingAs($admin)->post('/admin/moderation/review_reply/'.$review->id, [
            'decision' => 'approve',
        ])->assertRedirect();

        $review->refresh();
        $this->assertSame('published', $review->reply_status);
        $this->assertNotNull($review->reply_at);
    }

    public function test_global_promotion_setting_forces_boost_moderation(): void
    {
        [$owner, $clinic] = $this->fixtures();
        app(ContentModerationSettings::class)->save(['moderate_promotions' => true]);

        $package = PromotionPackage::query()->where('code', 'publish_1m')->firstOrFail();
        app(PromotionService::class)->markPaid(app(PromotionService::class)->createOrder($clinic, $owner, 'package', $package->id));

        $product = PromotionProduct::query()->where('code', 'boost')->firstOrFail();
        $order = app(PromotionService::class)->createOrder($clinic, $owner, 'product', $product->id);

        $this->assertSame('pending', $order->moderation_status);
    }

    /** @return array{0: User, 1: Clinic, 2: User} */
    private function fixtures(): array
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $patient = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Mod test org']);
        OrganizationStaff::query()->create([
            'organization_id' => $org->id,
            'user_id' => $owner->id,
            'role' => OrganizationStaff::ROLE_OWNER,
            'invited_at' => now(),
        ]);
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => (int) City::query()->value('id'),
            'name' => 'Moderation clinic',
            'slug' => 'mod-clinic-'.uniqid(),
            'address' => 'Addr',
            'status' => 'published',
        ]);

        return [$owner, $clinic, $patient];
    }
}
