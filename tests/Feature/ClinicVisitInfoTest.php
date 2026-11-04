<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Organization;
use App\Repositories\Contracts\CatalogRepository;
use App\Support\Schedule;
use Carbon\CarbonImmutable;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ClinicVisitInfoTest extends TestCase
{
    use RefreshDatabase;

    private const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_clinic_page_shows_open_state_route_links_and_visit_details(): void
    {
        $this->freezeAt('2026-11-04 10:00');
        $clinic = $this->clinic([
            'schedule' => $this->weekSchedule('09:00', '20:00'),
            'directions_note' => 'Вход со двора, 2 этаж',
            'parking' => 'Бесплатная у входа',
            'warranty' => 'Гарантия на пломбы — 1 год',
            'lat' => 44.89,
            'lng' => 37.31,
        ]);

        $this->get("/clinics/{$clinic->slug}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Clinics/Show')
                ->where('clinic.open_state.open', true)
                ->where('clinic.open_state.label', 'Открыто до 20:00')
                ->where('clinic.directions_note', 'Вход со двора, 2 этаж')
                ->where('clinic.parking', 'Бесплатная у входа')
                ->where('clinic.warranty', 'Гарантия на пломбы — 1 год')
                ->where('clinic.routes.yandex', fn (string $url) => str_starts_with($url, 'https://yandex.ru/maps/'))
                ->where('clinic.routes.gis', fn (string $url) => str_starts_with($url, 'https://2gis.ru/'))
                ->where('visit.next_slot.date', '2026-11-04')
                ->where('visit.next_slot.label', fn (string $label) => str_starts_with($label, 'Сегодня в '))
                ->where('visit.response', null));
    }

    public function test_next_slot_moves_to_tomorrow_after_closing_time(): void
    {
        $this->freezeAt('2026-11-04 21:00');
        $clinic = $this->clinic(['schedule' => $this->weekSchedule('09:00', '20:00')]);

        $this->get("/clinics/{$clinic->slug}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('clinic.open_state.open', false)
                ->where('clinic.open_state.label', 'Закрыто · откроется завтра в 09:00')
                ->where('visit.next_slot.date', '2026-11-05')
                ->where('visit.next_slot.label', 'Завтра в 09:00'));
    }

    public function test_clinic_without_schedule_has_no_open_state_or_next_slot(): void
    {
        $clinic = $this->clinic(['schedule' => null]);

        $this->get("/clinics/{$clinic->slug}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('clinic.open_state', null)
                ->where('visit.next_slot', null));
    }

    public function test_open_state_warns_when_closing_within_an_hour(): void
    {
        $schedule = $this->weekSchedule('09:00', '20:00');

        $state = Schedule::openState($schedule, false, CarbonImmutable::parse('2026-11-04 19:30', 'Europe/Moscow'));

        $this->assertTrue($state['open']);
        $this->assertTrue($state['closing_soon']);
        $this->assertSame('Закроется в 20:00', $state['label']);
        $this->assertSame('Открыто круглосуточно', Schedule::openState(null, true)['label']);
    }

    private function freezeAt(string $moment): void
    {
        $now = Carbon::parse($moment, config('app.timezone'));
        Carbon::setTestNow($now);
        CarbonImmutable::setTestNow($now);
    }

    /** @return array<string, array{open: string, close: string}> */
    private function weekSchedule(string $open, string $close): array
    {
        return array_fill_keys(self::WEEKDAYS, ['open' => $open, 'close' => $close]);
    }

    /** @param array<string, mixed> $attributes */
    private function clinic(array $attributes): Clinic
    {
        $organization = Organization::create(['name' => 'Org '.uniqid(), 'status' => 'active']);

        return Clinic::create([
            'organization_id' => $organization->id,
            'city_id' => app(CatalogRepository::class)->defaultCity()->id,
            'name' => 'Дентал-Медиа',
            'slug' => 'dental-media-'.uniqid(),
            'address' => 'просп. Михаила Нагибина, 49',
            'phone' => '+7 (900) 000-00-00',
            'status' => 'published',
            ...$attributes,
        ]);
    }
}
