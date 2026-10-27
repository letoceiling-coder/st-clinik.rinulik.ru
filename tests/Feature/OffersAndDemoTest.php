<?php

namespace Tests\Feature;

use App\Mail\OfferMail;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\City;
use App\Models\Clinic;
use App\Models\Offer;
use App\Models\OfferTemplate;
use App\Models\OrganizationContact;
use App\Models\ParsedOrganization;
use App\Models\StopListEntry;
use App\Models\User;
use App\Services\Offers\CampaignService;
use App\Services\Offers\OfferRenderer;
use App\Services\Offers\OfferService;
use App\Services\Parser\ParsedOrganizationImporter;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class OffersAndDemoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        Queue::fake();
    }

    public function test_admin_creates_template_and_offers_for_three_drafts(): void
    {
        $admin = $this->admin();
        $content = [
            'name' => 'Базовое КП', 'is_active' => true,
            'web_title' => '{org.name}', 'web_body' => 'Демо: {demo_link}', 'email_subject' => 'КП для {org.name}',
            'email_body' => 'Ссылка: {offer_link}', 'sms_text' => '{org.name} {offer_link}', 'messenger_text' => 'КП {offer_link}',
        ];
        $this->actingAs($admin)->post('/admin/offers/templates', $content)->assertRedirect();
        $template = OfferTemplate::query()->firstOrFail();
        $this->assertSame(1, $template->latestVersion->version);

        $parsed = ParsedOrganization::factory()->count(3)->create(['city_id' => $this->cityId()]);
        foreach ($parsed as $org) {
            $this->actingAs($admin)->post('/admin/offers', ['template_id' => $template->id, 'parsed_organization_id' => $org->id])->assertRedirect();
        }

        $offers = Offer::query()->with('clinic', 'demoLink')->get();
        $this->assertCount(3, $offers);
        foreach ($offers as $offer) {
            $this->assertSame('draft', $offer->clinic->status);
            $this->assertSame(64, strlen($offer->token_hash));
            $this->assertGreaterThanOrEqual(43, strlen($offer->token()));
            $this->assertStringNotContainsString($offer->token(), (string) json_encode($offer->toArray()));
            $this->assertNotNull($offer->demoLink);
            $this->assertSame($offer->clinic->name, $offer->snapshot['web_title']);
            $this->assertStringContainsString('/o/'.$offer->short_code.'/demo', $offer->snapshot['web_html']);
        }

        $this->actingAs($admin)->put("/admin/offers/templates/{$template->id}", [...$content, 'web_title' => 'Новая версия'])->assertRedirect();
        $this->assertSame(2, $template->fresh()->latestVersion->version);
        $this->assertSame($offers[0]->clinic->name, $offers[0]->fresh()->snapshot['web_title']);
    }

    public function test_offer_page_is_noindex_counts_views_and_accepts_application(): void
    {
        $offer = $this->offer();

        $this->get($offer->shortUrl())->assertRedirect($offer->url());
        $this->get($offer->url())->assertOk()->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
            ->assertInertia(fn ($page) => $page->component('Offer/Show')->where('offer.title', $offer->clinic->name.' на СтомКлиник')->whereNot('demo_url', null));
        $this->assertSame(1, $offer->fresh()->views_count);
        $this->assertSame('viewed', $offer->fresh()->status);

        $this->post(route('offer.apply', $offer->token()), ['name' => 'Ирина', 'phone' => '+7 900 111-22-33', 'consent' => '1'])->assertRedirect();
        $this->assertSame('applied', $offer->fresh()->status);
        $this->assertSame(1, $offer->applications()->count());

        $offer->update(['expires_at' => now()->subDay()]);
        $this->get($offer->url())->assertStatus(410);
        $this->get('/offer/'.str_repeat('a', 43))->assertNotFound();
    }

    public function test_demo_cabinet_is_read_only_and_logs_visit(): void
    {
        $offer = $this->offer();
        $demo = $offer->demoLink;

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.57'])
            ->get($demo->url())->assertRedirect(route('cabinet.dashboard'))->assertCookie('demo_device');
        $this->get('/clinic-cabinet')->assertOk()
            ->assertInertia(fn ($page) => $page->where('demo.mode', 'offer')->where('cabinet.branch.id', $offer->clinic_id));

        $this->put('/clinic-cabinet/schedule', ['schedule' => []])->assertRedirect()->assertSessionHas('error');
        $this->post('/clinic-cabinet/doctors', ['name' => 'Новый врач'])->assertSessionHas('error');
        $this->assertSame(0, $offer->clinic->doctors()->count());

        $visit = $demo->visits()->firstOrFail();
        $this->assertSame('203.0.113.xxx', $visit->ip_masked);
        $this->assertContains('dashboard', $visit->sections);
        $this->assertSame(1, $demo->fresh()->opens_count);

        $this->post('/demo-exit')->assertRedirect($offer->url());
        $this->get('/clinic-cabinet')->assertRedirect(route('login'));
    }

    public function test_demo_limits_on_opens_devices_and_sections(): void
    {
        $offer = $this->offer(['max_opens' => 1, 'sections' => ['dashboard', 'leads']]);
        $demo = $offer->demoLink;

        $this->get($demo->url())->assertRedirect(route('cabinet.dashboard'));
        $this->get('/clinic-cabinet/reviews')->assertRedirect('/clinic-cabinet');
        $this->get('/clinic-cabinet/leads')->assertOk()
            ->assertInertia(fn ($page) => $page->where('demo.sections', ['dashboard', 'leads']));

        $this->flushSession();
        $this->get($demo->url())->assertRedirect('/')->assertSessionHas('error');
        $this->assertSame(1, $demo->fresh()->opens_count);

        $devices = $this->offer(['max_devices' => 1], 'Вторая клиника')->demoLink;
        $this->get($devices->url())->assertRedirect(route('cabinet.dashboard'));
        $this->flushSession();
        $this->withCookie('demo_device', str_repeat('b', 36))->get($devices->url())->assertRedirect('/')->assertSessionHas('error');

        $devices->update(['revoked_at' => now()]);
        $this->get('/clinic-cabinet')->assertRedirect(route('login'));
    }

    public function test_campaign_sends_email_and_sms_respecting_stop_list_and_hours(): void
    {
        Mail::fake();
        Http::fake(['sms.ru/*' => fn ($request) => Http::response([
            'status' => 'OK', 'sms' => [$request['to'] => ['status' => 'OK', 'sms_id' => 'sms-'.$request['to']]],
        ])]);
        config(['services.sms.provider' => 'smsru', 'services.sms.api_key' => 'test-key']);
        $this->travelTo(Carbon::parse('2026-10-26 12:00', 'Europe/Moscow'));

        $template = OfferTemplate::factory()->create();
        $clinics = collect(['Первая', 'Вторая', 'Третья'])->map(fn (string $name, int $i) => $this->draft($name, [
            'email' => "clinic{$i}@example.com", 'phone' => '+7900000100'.$i,
        ]));
        StopListEntry::add('email', 'clinic2@example.com', 'unsubscribed');

        $admin = $this->admin();
        $this->actingAs($admin)->post('/admin/campaigns', [
            'name' => 'Осень', 'template_id' => $template->id, 'channels' => ['email', 'sms', 'vk'],
            'filters' => ['ids' => $clinics->pluck('id')->all()],
        ])->assertRedirect();
        $campaign = Campaign::query()->firstOrFail();

        $this->assertSame(5, $campaign->recipients()->where('status', 'queued')->count());
        $this->assertSame('Контакт в стоп-листе', $campaign->recipients()->where('contact', 'clinic2@example.com')->value('error'));
        $this->assertSame(3, $campaign->recipients()->where('channel', 'vk')->where('status', 'skipped')->count());

        $this->actingAs($admin)->post("/admin/campaigns/{$campaign->id}/start")->assertRedirect();
        app(CampaignService::class)->sendBatch($campaign->fresh());

        Mail::assertSent(OfferMail::class, 2);
        Mail::assertSent(OfferMail::class, fn (OfferMail $mail) => str_contains($mail->bodyText, '/unsubscribe/') && $mail->hasTo('clinic0@example.com'));
        Http::assertSentCount(3);
        $this->assertSame(5, $campaign->recipients()->where('status', 'sent')->count());
        $this->assertSame('completed', $campaign->fresh()->status);

        $again = Campaign::factory()->create(['offer_template_id' => $template->id, 'channels' => ['email'], 'filters' => ['ids' => [$clinics[0]->id]]]);
        app(CampaignService::class)->build($again, $admin);
        $this->assertSame('skipped', $again->recipients()->value('status'));

        $this->travelTo(Carbon::parse('2026-10-26 21:00', 'Europe/Moscow'));
        $late = Campaign::factory()->create(['offer_template_id' => $template->id, 'channels' => ['sms'], 'status' => 'running',
            'filters' => ['ids' => [$this->draft('Поздняя', ['phone' => '+79000002000'])->id]]]);
        app(CampaignService::class)->build($late, $admin);
        $next = app(CampaignService::class)->sendBatch($late);
        $this->assertSame('2026-10-27 09:00', $next?->timezone('Europe/Moscow')->format('Y-m-d H:i'));
        $this->assertSame('queued', $late->recipients()->value('status'));
    }

    public function test_unsubscribe_link_adds_contact_to_stop_list_and_pixel_marks_open(): void
    {
        $offer = $this->offer();
        $campaign = Campaign::factory()->create();
        $recipient = CampaignRecipient::create([
            'campaign_id' => $campaign->id, 'offer_id' => $offer->id, 'clinic_id' => $offer->clinic_id,
            'channel' => 'email', 'contact' => 'owner@example.com', 'status' => 'sent', 'sent_at' => now(),
        ]);

        $this->get('/unsubscribe/'.$recipient->id)->assertForbidden();
        $pixel = url(URL::signedRoute('offers.pixel', ['recipient' => $recipient->id], absolute: false));
        $this->get($pixel)->assertOk()->assertHeader('Content-Type', 'image/gif');
        $this->assertSame('opened', $recipient->fresh()->status);

        $url = url(URL::signedRoute('offers.unsubscribe', ['recipient' => $recipient->id], absolute: false));
        $this->get($url)->assertOk()->assertInertia(fn ($page) => $page->component('Offer/Unsubscribe')->where('done', false));
        $this->post($url)->assertRedirect();

        $this->assertTrue(StopListEntry::blocks('email', 'OWNER@example.com'));
        $this->assertSame('unsubscribed', $recipient->fresh()->status);
    }

    public function test_renderer_escapes_html_and_counts_sms_segments(): void
    {
        $clinic = $this->draft('<b>Клиника</b>');
        $rendered = app(OfferRenderer::class)->render([
            'web_title' => '{org.name}', 'web_body' => "# Заголовок\n\n- раз\n- **два**\n\n<script>x</script> {offer_link}",
            'email_body' => 'Текст', 'sms_text' => str_repeat('ж', 80),
        ], $clinic, ['offer_link' => 'https://st.test/o/abc', 'demo_link' => '', 'unsubscribe_link' => '{unsubscribe_link}']);

        $this->assertStringContainsString('<h2>Заголовок</h2>', $rendered['web_html']);
        $this->assertStringContainsString('<li><strong>два</strong></li>', $rendered['web_html']);
        $this->assertStringContainsString('&lt;script&gt;', $rendered['web_html']);
        $this->assertStringContainsString('<a href="https://st.test/o/abc"', $rendered['web_html']);
        $this->assertStringContainsString('{unsubscribe_link}', $rendered['email_text']);
        $this->assertSame(2, OfferRenderer::smsSegments($rendered['sms']));
        $this->assertSame(1, OfferRenderer::smsSegments('Short latin text'));
    }

    public function test_admin_pages_render_for_offer_template_and_campaign(): void
    {
        $offer = $this->offer();
        $this->get($offer->demoLink->url());
        $this->flushSession();
        $offer->applications()->create(['name' => 'Ирина', 'phone' => '+79001112233', 'status' => 'new', 'consent_at' => now()]);
        $campaign = Campaign::factory()->create(['channels' => ['email', 'phone'], 'filters' => ['ids' => [$offer->clinic_id]]]);
        OrganizationContact::create(['clinic_id' => $offer->clinic_id, 'type' => 'email', 'value' => 'a@example.com']);
        app(CampaignService::class)->build($campaign, null);
        $admin = $this->admin();

        $this->actingAs($admin)->get("/admin/offers/{$offer->id}")->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Offer')->has('demo_links.0.visits', 1)->has('applications', 1));
        foreach (['offers', 'applications', 'templates', 'stop-list', 'settings'] as $tab) {
            $this->actingAs($admin)->get("/admin/offers?tab={$tab}")->assertOk();
        }
        $this->actingAs($admin)->get('/admin/offers/templates/create')->assertOk();
        $this->actingAs($admin)->get("/admin/offers/templates/{$campaign->offer_template_id}")->assertOk();
        $this->actingAs($admin)->postJson('/admin/offers/templates/preview', ['clinic_id' => $offer->clinic_id, 'web_title' => '{org.name}', 'sms_text' => 'Привет {offer_link}'])
            ->assertOk()->assertJsonPath('web_title', $offer->clinic->name)->assertJsonPath('sms_segments', 1);
        $this->actingAs($admin)->get('/admin/campaigns')->assertOk();
        $this->actingAs($admin)->postJson('/admin/campaigns/estimate', ['filters' => ['ids' => [$offer->clinic_id]]])->assertOk()->assertJsonPath('count', 1);
        $this->actingAs($admin)->get("/admin/campaigns/{$campaign->id}")->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Campaign')->where('campaign.funnel.queued', 2)->has('recipients.data', 2));

        $manual = $campaign->recipients()->where('channel', 'phone')->firstOrFail();
        $this->actingAs($admin)->post("/admin/campaigns/recipients/{$manual->id}/mark", ['status' => 'sent'])->assertRedirect();
        $this->assertSame('sent', $manual->fresh()->status);
        $this->assertSame($admin->id, $manual->fresh()->sent_by);

        $export = $this->actingAs($admin)->get("/admin/campaigns/{$campaign->id}/export")->assertOk();
        $this->assertStringContainsString('a@example.com', $export->streamedContent());
    }

    public function test_offers_section_requires_permission(): void
    {
        $user = User::factory()->create();
        $this->assertNotSame(200, $this->actingAs($user)->get('/admin/offers')->status());
        $this->actingAs($this->admin())->get('/admin/offers?tab=settings')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Offers')->where('settings.demo.max_opens', 30));
    }

    /**
     * @param  array<string, mixed>  $demo
     */
    private function offer(array $demo = [], string $name = 'Улыбка'): Offer
    {
        $offer = app(OfferService::class)->createFor($this->draft($name), OfferTemplate::factory()->create(), null, $demo);

        return $offer->load('clinic', 'demoLink');
    }

    /** @param array<string, string> $contacts */
    private function draft(string $name, array $contacts = []): Clinic
    {
        $parsed = ParsedOrganization::factory()->create(['name' => $name, 'city_id' => $this->cityId()]);
        $clinic = app(ParsedOrganizationImporter::class)->import($parsed, null, false);
        foreach ($contacts as $type => $value) {
            OrganizationContact::create(['parsed_organization_id' => $parsed->id, 'clinic_id' => $clinic->id, 'type' => $type, 'value' => $value]);
        }

        return $clinic;
    }

    private function cityId(): int
    {
        return (int) City::query()->where('name', 'Краснодар')->value('id');
    }

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        return $admin;
    }
}
