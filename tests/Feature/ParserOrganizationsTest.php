<?php

namespace Tests\Feature;

use App\Jobs\ImportParsedOrganizationPhotos;
use App\Jobs\SyncParserOrganizationsJob;
use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\OrganizationContact;
use App\Models\ParsedOrganization;
use App\Models\ParserTask;
use App\Models\User;
use App\Services\Parser\ParsedOrganizationStore;
use App\Services\Parser\ParserTaskService;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ParserOrganizationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        config([
            'services.parser_ai.base_url' => 'https://parser.test',
            'services.parser_ai.api_key' => 'pai_test',
            'services.parser_ai.task_cost_limit_usd' => 0.5,
            'services.parser_ai.daily_budget_usd' => null,
        ]);
    }

    public function test_parser_section_is_only_for_superadmin(): void
    {
        $moderator = User::factory()->create();
        $moderator->forceFill(['role' => 'moderator', 'status' => 'active'])->save();

        $this->actingAs($moderator)->get('/admin/parser')->assertForbidden();
        $this->actingAs($this->admin())->get('/admin/parser')->assertOk();
    }

    public function test_organizations_can_be_filtered_by_city_id_or_name(): void
    {
        $this->stored($this->parserItem('3101', 'По городу', '+78612000031'));
        $cityId = City::query()->where('name', 'Краснодар')->value('id');
        $admin = $this->admin();

        $found = fn (string $city) => $this->actingAs($admin)->get('/admin/parser?tab=organizations&city='.urlencode($city))->assertOk()->inertiaProps('organizations.data');

        $this->assertCount(1, $found((string) $cityId));
        $this->assertCount(1, $found('Краснодар'));
        $this->assertCount(0, $found('Ростов-на-Дону'));
    }

    public function test_completed_task_fills_staging_table_without_creating_clinics(): void
    {
        $task = ParserTask::factory()->running()->create();
        Http::fake([
            "parser.test/api/v1/tasks/{$task->external_id}" => Http::response([
                'id' => $task->external_id, 'status' => 'completed', 'progress' => 100,
                'result' => ['organizations' => []], 'completedAt' => now()->toIso8601String(),
            ]),
            'parser.test/api/v1/organizations*' => Http::response([
                'items' => [$this->parserItem('1001', 'Улыбка', '+78612000001'), $this->parserItem('1002', 'Дента', '+78612000002')],
                'nextOffset' => null,
            ]),
        ]);
        $clinicsBefore = Clinic::query()->count();

        $this->artisan('parser:poll-tasks')->assertSuccessful();

        $task->refresh();
        $this->assertSame('completed', $task->status);
        $this->assertSame(2, $task->found_count);
        $this->assertSame(2, $task->new_count);
        $this->assertSame(2, ParsedOrganization::query()->where('parser_task_id', $task->id)->where('status', 'new')->count());
        $this->assertSame($clinicsBefore, Clinic::query()->count());
        $this->assertTrue(OrganizationContact::query()->where('type', 'phone')->where('value', '+78612000001')->exists());
    }

    public function test_import_creates_hidden_draft_without_yandex_rating(): void
    {
        Queue::fake();
        $parsed = $this->stored([
            ...$this->parserItem('2001', 'Белый зуб', '+78612000003', rating: 4.9, reviews: 300),
            'photoUrls' => ['https://avatars.mds.yandex.net/get-altay/1/preview/S', 'https://avatars.mds.yandex.net/get-altay/1/photo/XXL'],
        ]);

        $this->actingAs($this->admin())->post("/admin/parser/organizations/{$parsed->id}/import", ['photos' => true])->assertSessionHas('success');

        $parsed->refresh();
        $clinic = Clinic::query()->findOrFail($parsed->clinic_id);
        $this->assertSame('imported', $parsed->status);
        $this->assertSame('draft', $clinic->status);
        $this->assertNull($clinic->organization->owner_id);
        $this->assertSame(0, (int) $clinic->reviews_count);
        $this->assertEquals(0, $clinic->rating);
        $this->assertSame('2001', $clinic->yandex_org_id);
        $this->assertNull($clinic->description);
        $this->assertSame($clinic->id, OrganizationContact::query()->where('parsed_organization_id', $parsed->id)->value('clinic_id'));
        Queue::assertPushed(ImportParsedOrganizationPhotos::class, fn (ImportParsedOrganizationPhotos $job) => $job->photos === [
            ['url' => 'https://avatars.mds.yandex.net/get-altay/1/photo/XXL', 'kind' => 'exterior'],
        ]);

        $city = City::query()->findOrFail($clinic->city_id);
        $this->get("/{$city->slug}/clinics")->assertDontSee('Белый зуб');
    }

    public function test_second_import_of_same_card_is_rejected(): void
    {
        Queue::fake();
        $parsed = $this->stored($this->parserItem('2002', 'Дентал Про', '+78612000004'));
        $admin = $this->admin();

        $this->actingAs($admin)->post("/admin/parser/organizations/{$parsed->id}/import");
        $this->actingAs($admin)->post("/admin/parser/organizations/{$parsed->id}/import")->assertSessionHas('error');

        $this->assertSame(1, Clinic::query()->where('yandex_org_id', '2002')->count());
    }

    public function test_card_matching_existing_clinic_phone_is_flagged(): void
    {
        $city = City::query()->where('name', 'Краснодар')->firstOrFail();
        $org = Organization::create(['owner_id' => null, 'name' => 'Существующая']);
        $clinic = Clinic::create([
            'organization_id' => $org->id, 'city_id' => $city->id, 'name' => 'Клиника на сайте',
            'slug' => 'existing-'.uniqid(), 'address' => 'ул. Северная, 1', 'phone' => '8 (861) 200-00-05', 'status' => 'published',
        ]);

        $parsed = $this->stored($this->parserItem('3001', 'Совсем другое имя', '+78612000005'));

        $this->assertSame($clinic->id, $parsed->match_clinic_id);
        $this->assertSame('Совпадает телефон', $parsed->match_reason);
    }

    public function test_branches_with_shared_website_become_one_organization(): void
    {
        Queue::fake();
        $first = $this->stored($this->parserItem('4001', 'Сеть Дент на Красной', '+78612000006', website: 'https://set-dent.ru/'));
        $second = $this->stored($this->parserItem('4002', 'Сеть Дент на Северной', '+78612000007', website: 'https://www.set-dent.ru/contacts'));
        $this->assertSame('site:set-dent.ru', $second->refresh()->group_key);

        $admin = $this->admin();
        $this->actingAs($admin)->post('/admin/parser/organizations/import', ['ids' => [$first->id, $second->id], 'photos' => false])->assertSessionHas('success');

        $clinics = Clinic::query()->whereIn('yandex_org_id', ['4001', '4002'])->get();
        $this->assertCount(2, $clinics);
        $this->assertCount(1, $clinics->pluck('organization_id')->unique());
    }

    public function test_resync_keeps_admin_decision(): void
    {
        $parsed = $this->stored($this->parserItem('5001', 'Скрытая', '+78612000008'));
        $parsed->update(['status' => 'ignored']);

        $this->stored($this->parserItem('5001', 'Скрытая (новое имя)', '+78612000008'));

        $parsed->refresh();
        $this->assertSame('ignored', $parsed->status);
        $this->assertSame('Скрытая (новое имя)', $parsed->name);
    }

    public function test_launching_same_collect_twice_a_day_reuses_it(): void
    {
        Http::fake(['parser.test/api/v1/organizations/collect' => Http::response([
            'taskId' => 'remote-1',
            'mode' => 'structured',
            'status' => ['stage' => 'queued', 'message' => 'В очереди (позиция 1)', 'progress' => 0],
            'links' => ['statusPage' => 'https://parser.test/status/remote-1/sig'],
        ], 202)]);
        $admin = $this->admin();
        $payload = ['city' => 'Краснодар', 'query' => 'детская стоматология', 'count' => 45];

        $this->actingAs($admin)->post('/admin/parser/tasks', $payload)->assertSessionHas('success');
        $this->actingAs($admin)->post('/admin/parser/tasks', $payload)->assertRedirect();

        $task = ParserTask::query()->sole();
        $this->assertSame([ParserTask::COLLECT, 'remote-1', 'В очереди (позиция 1)'], [$task->type, $task->external_id, $task->stage()]);
        $this->assertSame('https://parser.test/status/remote-1/sig', $task->status_page_url);
        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => $request->hasHeader('Idempotency-Key')
            && $request['city'] === 'Краснодар'
            && $request['category'] === ParserTask::CATEGORY
            && $request['query'] === 'детская стоматология'
            && $request['count'] === 45
            && $request['fields'] === 'all_available');
    }

    public function test_launch_is_limited_to_what_fits_into_task_time_limit(): void
    {
        Http::fake();

        $this->actingAs($this->admin())
            ->post('/admin/parser/tasks', ['city' => 'Краснодар', 'count' => ParserTask::MAX_COLLECT_COUNT + 1])
            ->assertSessionHasErrors('count');

        Http::assertNothingSent();
    }

    public function test_collect_brings_partial_cards_while_running_and_final_on_completion(): void
    {
        $task = ParserTask::factory()->collect()->running()->create();
        $status = fn (string $state, int $collected, array $extra = []) => Http::response([
            'status' => $state, 'stage' => $state === 'completed' ? 'done' : 'collecting', 'stageLabel' => 'Сбор карточек',
            'message' => "Сбор карточек: собрано {$collected} из 45", 'progress' => $state === 'completed' ? 100 : 27,
            'stages' => [['id' => 'queued', 'label' => 'В очереди', 'state' => 'done'], ['id' => 'collecting', 'label' => 'Сбор карточек', 'state' => 'active']],
            'counts' => ['target' => 45, 'collected' => $collected], 'timing' => ['etaSec' => 1130],
            ...$extra,
        ]);
        Http::fakeSequence("parser.test/api/v1/organizations/collect/{$task->external_id}")
            ->pushResponse($status('running', 1, ['needsAttention' => ['kind' => 'yandex_challenge', 'message' => 'Яндекс показал проверку']]))
            ->pushResponse($status('completed', 2));
        Http::fakeSequence("parser.test/api/v1/organizations/collect/{$task->external_id}/result*")
            ->push(['final' => false, 'partial' => true, 'organizations' => [$this->parserItem('9001', 'Первая', '+78612000021')]])
            ->push(['final' => true, 'partial' => false, 'organizations' => [$this->parserItem('9001', 'Первая', '+78612000021'), $this->parserItem('9002', 'Вторая', '+78612000022')]]);
        $service = app(ParserTaskService::class);

        $service->poll($task);
        $task->refresh();
        $this->assertSame(['running', 1, 1], [$task->status, $task->collected_count, $task->new_count]);
        $this->assertSame('Яндекс показал проверку', $task->attention());
        $this->assertSame(1130, $task->etaSeconds());

        $task->update(['result_fetched_at' => now()->subMinutes(5)]);
        $service->poll($task);
        $task->refresh();
        $this->assertSame(['completed', 2, 2, 2], [$task->status, $task->collected_count, $task->found_count, $task->new_count]);
        $this->assertNull($task->attention());
        $this->assertSame(2, ParsedOrganization::query()->where('parser_task_id', $task->id)->count());
    }

    public function test_launch_requires_city_from_dictionary_and_known_filter(): void
    {
        Http::fake();

        $this->actingAs($this->admin())
            ->post('/admin/parser/tasks', ['city' => 'Атлантида', 'query' => 'автосервис', 'count' => 20])
            ->assertSessionHasErrors(['city', 'query']);

        Http::assertNothingSent();
    }

    public function test_non_dental_organizations_are_skipped(): void
    {
        $dental = $this->parserItem('7001', 'Зубная', '+78612000010');
        $pharmacy = [...$this->parserItem('7002', 'Аптека', '+78612000011'), 'categories' => ['Аптека']];
        $supplier = [...$this->parserItem('7003', 'Дентал-маркет', '+78612000012'), 'categories' => ['Стоматологические материалы и оборудование']];

        $stats = app(ParsedOrganizationStore::class)->upsert([$dental, $pharmacy, $supplier]);

        $this->assertSame(1, $stats['created']);
        $this->assertSame(['7001'], ParsedOrganization::query()->pluck('external_id')->all());
    }

    public function test_loading_city_from_parser_base_is_tracked_as_task(): void
    {
        Queue::fake();
        $admin = $this->admin();

        $this->actingAs($admin)->post('/admin/parser/sync', ['city' => 'Краснодар'])->assertSessionHas('success');
        $this->actingAs($admin)->post('/admin/parser/sync', ['city' => 'Краснодар'])->assertSessionHas('error');

        $task = ParserTask::query()->sole();
        $this->assertSame(['base.sync', 'queued'], [$task->type, $task->status]);
        Queue::assertPushed(SyncParserOrganizationsJob::class, 1);

        Http::fake(['parser.test/api/v1/organizations*' => Http::response([
            'items' => [$this->parserItem('8001', 'Из базы', '+78612000013')],
            'nextOffset' => null,
        ])]);
        app()->call([new SyncParserOrganizationsJob($task->id), 'handle']);

        $task->refresh();
        $this->assertSame(['completed', 1, 1], [$task->status, $task->found_count, $task->new_count]);
        Http::assertSent(fn ($request) => str_contains(urldecode($request->url()), 'category='.ParserTask::BASE_CATEGORY));
    }

    public function test_activity_reports_running_and_recently_finished_tasks(): void
    {
        $admin = $this->admin();
        $running = ParserTask::factory()->running()->create(['progress' => 40]);
        $since = now()->subMinute()->toIso8601String();
        $finished = ParserTask::factory()->create(['status' => 'completed', 'found_count' => 12, 'new_count' => 5]);

        $this->actingAs($admin)->getJson('/admin/parser/activity?since='.urlencode($since))
            ->assertOk()
            ->assertJsonPath('active.0.id', $running->id)
            ->assertJsonPath('active.0.progress', 40)
            ->assertJsonPath('finished.0.id', $finished->id)
            ->assertJsonPath('finished.0.created', 5);

        $this->actingAs($admin)->getJson('/admin/parser/activity')->assertOk()->assertJsonCount(0, 'finished');
    }

    public function test_email_search_result_is_saved_as_site_contact(): void
    {
        $parsed = $this->stored($this->parserItem('6001', 'С сайтом', '+78612000009', website: 'https://clinic.test/'));
        Http::fake(['parser.test/api/v1/tasks' => Http::response(['id' => 'remote-mail', 'status' => 'queued'], 201)]);
        $task = app(ParserTaskService::class)->launchEmailSearch($parsed, null);

        Http::fake(['parser.test/api/v1/tasks/remote-mail' => Http::response([
            'id' => 'remote-mail', 'status' => 'completed', 'progress' => 100,
            'result' => ['text' => 'Пишите: Info@Clinic.test или <a href="mailto:boss@clinic.test">', 'html' => '<img src="logo@2x.png">'],
        ])]);
        app(ParserTaskService::class)->poll($task);

        $emails = OrganizationContact::query()->where('parsed_organization_id', $parsed->id)->where('type', 'email')->pluck('value')->sort()->values()->all();
        $this->assertSame(['boss@clinic.test', 'info@clinic.test'], $emails);
    }

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        return $admin;
    }

    /** @param array<string, mixed> $item */
    private function stored(array $item): ParsedOrganization
    {
        app(ParsedOrganizationStore::class)->upsert([$item]);

        return ParsedOrganization::query()->where('external_id', $item['externalId'])->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function parserItem(string $id, string $name, string $phone, ?string $website = null, float $rating = 4.8, int $reviews = 10): array
    {
        return [
            'id' => 'uuid-'.$id,
            'externalId' => $id,
            'source' => 'yandex',
            'name' => $name,
            'city' => 'Краснодар',
            'categories' => ['Стоматологическая клиника'],
            'address' => 'ул. Красная, '.$id.', Краснодар',
            'phones' => [$phone],
            'website' => $website,
            'rating' => $rating,
            'reviewCount' => $reviews,
            'coordinates' => ['lat' => 45.0 + ((int) $id % 100) / 100, 'lon' => 39.0],
            'sourceUrl' => "https://yandex.ru/maps/org/x/{$id}/",
            'updatedAt' => now()->toIso8601String(),
        ];
    }
}
