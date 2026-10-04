<?php

namespace Tests\Feature;

use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TzPageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(FoundationSeeder::class);
    }

    public function test_tz_page_renders_markdown_document(): void
    {
        $this->get(route('tz'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tz')
                ->has('page.html')
                ->where('page.html', fn (string $html) => str_contains($html, 'ТЕХНИЧЕСКОЕ ЗАДАНИЕ'))
            );
    }
}
