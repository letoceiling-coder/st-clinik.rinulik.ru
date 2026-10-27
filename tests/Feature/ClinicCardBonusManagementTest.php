<?php

namespace Tests\Feature;

use App\Http\Resources\ClinicResource;
use App\Models\Appointment;
use App\Models\CardBonusType;
use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicCardBonus;
use App\Models\Organization;
use App\Models\User;
use App\Repositories\Contracts\ClinicRepository;
use Carbon\Carbon;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClinicCardBonusManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_same_day_on_card_requires_free_calendar_slot(): void
    {
        Carbon::setTestNow(now()->setTime(12, 0));

        $clinic = $this->clinicWithSchedule();
        $type = CardBonusType::query()->where('code', 'same_day')->firstOrFail();

        ClinicCardBonus::create([
            'clinic_id' => $clinic->id,
            'card_bonus_type_id' => $type->id,
            'enabled' => true,
            'short_label' => 'Запись на сегодня',
            'description' => 'Свободные окна сегодня.',
        ]);

        $payload = (new ClinicResource($clinic->fresh()->load('cardBonuses.type')))->resolve();
        $this->assertTrue($payload['same_day']);

        $this->fillAllSlotsToday($clinic);

        $payloadAfter = (new ClinicResource($clinic->fresh()->load('cardBonuses.type')))->resolve();
        $this->assertFalse($payloadAfter['same_day']);

        Carbon::setTestNow();
    }

    public function test_premium_clinics_are_listed_before_regular_ones(): void
    {
        $city = City::query()->firstOrFail();
        $plain = $this->clinicWithSchedule();
        $plain->update(['city_id' => $city->id, 'rating' => 5, 'reviews_count' => 100]);

        $premium = $this->clinicWithSchedule();
        $premium->update(['city_id' => $city->id, 'rating' => 3, 'reviews_count' => 1]);
        $type = CardBonusType::query()->where('code', 'cashback')->firstOrFail();
        ClinicCardBonus::create([
            'clinic_id' => $premium->id,
            'card_bonus_type_id' => $type->id,
            'enabled' => true,
            'short_label' => 'Кешбэк',
            'description' => 'Описание акции.',
        ]);

        $listed = app(ClinicRepository::class)->rankedForHome($city->id, 10, 0);

        $this->assertSame($premium->id, $listed->first()->id);
    }

    public function test_premium_card_when_clinic_enables_premium_bonus(): void
    {
        $clinic = $this->clinicWithSchedule();
        $type = CardBonusType::query()->where('code', 'cashback')->firstOrFail();

        ClinicCardBonus::create([
            'clinic_id' => $clinic->id,
            'card_bonus_type_id' => $type->id,
            'enabled' => true,
            'short_label' => 'Кешбэк 5%',
            'description' => 'Возврат на бонусный счёт.',
        ]);

        $payload = (new ClinicResource($clinic->fresh()->load('cardBonuses.type')))->resolve();
        $this->assertTrue($payload['card_premium']);
        $this->assertNotEmpty($payload['promo_offers']);
    }

    private function clinicWithSchedule(): Clinic
    {
        $owner = User::factory()->create();
        $owner->forceFill(['role' => 'clinic_owner', 'status' => 'active'])->save();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Org']);
        $city = City::query()->firstOrFail();

        return Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Bonus Clinic',
            'slug' => 'bonus-clinic-'.uniqid(),
            'address' => 'Addr',
            'status' => 'published',
            'same_day' => true,
            'is_24_7' => true,
        ]);
    }

    private function fillAllSlotsToday(Clinic $clinic): void
    {
        $start = now()->copy()->setTime(9, 0);
        while ($start->hour < 21) {
            Appointment::create([
                'clinic_id' => $clinic->id,
                'patient_name' => 'Busy',
                'patient_phone' => '+79001112233',
                'starts_at' => $start->copy(),
                'ends_at' => $start->copy()->addMinutes(30),
                'status' => 'confirmed',
                'source' => 'manual',
            ]);
            $start->addMinutes(30);
        }
    }
}
