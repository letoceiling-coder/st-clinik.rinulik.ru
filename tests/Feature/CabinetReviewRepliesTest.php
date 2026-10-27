<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\Review;
use App\Models\User;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CabinetReviewRepliesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_reviews_without_public_reply_are_counted_as_unanswered(): void
    {
        [$owner, $clinic] = $this->fixtures();
        $this->review($clinic, null, null);
        $this->review($clinic, 'Спасибо!', 'pending');
        $this->review($clinic, 'Спасибо!', 'published');
        $this->review($clinic, 'Спасибо!', null);

        $this->actingAs($owner)
            ->get('/clinic-cabinet?branch='.$clinic->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('kpi.unanswered', 2));

        $this->actingAs($owner)
            ->get('/clinic-cabinet/reviews?filter=unanswered&branch='.$clinic->id)
            ->assertOk();
    }

    /** @return array{0: User, 1: Clinic} */
    private function fixtures(): array
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Reply org']);
        OrganizationStaff::query()->create([
            'organization_id' => $org->id,
            'user_id' => $owner->id,
            'role' => OrganizationStaff::ROLE_OWNER,
            'invited_at' => now(),
        ]);
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => (int) City::query()->value('id'),
            'name' => 'Reply clinic',
            'slug' => 'reply-clinic-'.uniqid(),
            'address' => 'Addr',
            'status' => 'published',
        ]);

        return [$owner, $clinic];
    }

    private function review(Clinic $clinic, ?string $replyText, ?string $replyStatus): Review
    {
        return Review::create([
            'user_id' => User::factory()->create()->id,
            'clinic_id' => $clinic->id,
            'rating' => 5,
            'body' => str_repeat('Хороший приём, рекомендую. ', 3),
            'visit_date' => now()->subWeek(),
            'author_name' => 'Иван И.',
            'status' => 'published',
            'published_at' => now(),
            'reply_text' => $replyText,
            'reply_status' => $replyStatus,
        ]);
    }
}
