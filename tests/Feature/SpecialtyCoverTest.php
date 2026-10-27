<?php

namespace Tests\Feature;

use App\Models\Specialty;
use App\Support\SpecialtyCover;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SpecialtyCoverTest extends TestCase
{
    use RefreshDatabase;

    public function test_seed_covers_command_fills_missing_cover_path(): void
    {
        Storage::fake('public');

        $specialty = Specialty::query()->create([
            'name' => 'Терапия',
            'slug' => 'terapiya-test',
            'icon' => 'tooth',
            'short' => 'Тест',
            'sort' => 1,
            'is_active' => true,
        ]);

        $this->artisan('specialties:seed-covers')->assertSuccessful();

        $specialty->refresh();
        $this->assertNotNull($specialty->cover_path);
        Storage::disk('public')->assertExists($specialty->cover_path);
        $this->assertNotNull(SpecialtyCover::url($specialty->cover_path));
    }
}
