<?php

namespace Tests\Feature;

use App\Models\AssistantKbEntry;
use App\Models\User;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssistantKbAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_superadmin_can_create_kb_entry(): void
    {
        $this->actingAs($this->superadmin())
            ->post('/admin/assistant/kb', [
                'question' => 'Тестовый вопрос?',
                'answer' => 'Тестовый ответ.',
                'is_active' => true,
                'sort' => 50,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('assistant_kb_entries', [
            'question' => 'Тестовый вопрос?',
        ]);
    }

    public function test_superadmin_can_delete_kb_entry(): void
    {
        $entry = AssistantKbEntry::query()->firstOrFail();

        $this->actingAs($this->superadmin())
            ->delete('/admin/assistant/kb/'.$entry->id)
            ->assertRedirect();

        $this->assertDatabaseMissing('assistant_kb_entries', ['id' => $entry->id]);
    }

    private function superadmin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        return $admin;
    }
}
