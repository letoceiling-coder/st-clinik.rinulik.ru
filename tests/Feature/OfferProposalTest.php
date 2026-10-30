<?php

namespace Tests\Feature;

use App\Mail\OfferMail;
use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicSubscription;
use App\Models\Offer;
use App\Models\OfferTemplate;
use App\Models\OrganizationContact;
use App\Models\ParsedOrganization;
use App\Models\StopListEntry;
use App\Models\Tariff;
use App\Models\User;
use App\Services\ModerationService;
use App\Services\Offers\OfferRenderer;
use App\Services\Offers\OfferService;
use App\Services\Parser\ParsedOrganizationImporter;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/** КП из данных парсера: реальные тарифы, предпросмотр страницы, отправка, пробный период. */
class OfferProposalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        Queue::fake();
    }

    public function test_offer_page_shows_admin_tariffs_trial_and_prepared_card(): void
    {
        Tariff::query()->update(['is_active' => false]);
        Tariff::query()->create(['name' => 'Профи', 'slug' => 'profi-test', 'price' => 490000, 'duration_days' => 30, 'max_doctors' => 10, 'features' => [Tariff::FEATURE_ONLINE_BOOKING], 'is_active' => true]);
        $offer = $this->offer();

        $this->get($offer->url())->assertOk()->assertInertia(fn ($page) => $page
            ->component('Offer/Show')
            ->where('plans.0.name', 'Профи')
            ->where('plans.0.price', 4900)
            ->where('plans.0.features.0', 'Онлайн-запись')
            ->where('trial.days', 30)
            ->where('preview_url', route('offer.preview', ['code' => $offer->short_code]))
            ->has('prepared', 8));

        $vars = app(OfferRenderer::class)->variables($offer->clinic, app(OfferService::class)->links($offer));
        $this->assertStringContainsString('Профи', $vars['{tariffs}']);
        $this->assertSame('30', $vars['{trial_days}']);
        $this->assertStringContainsString('/o/'.$offer->short_code.'/preview', $vars['{preview_link}']);
    }

    public function test_preview_renders_draft_clinic_page_and_closes_with_offer(): void
    {
        $offer = $this->offer();

        $this->get(route('offer.preview', ['code' => $offer->short_code]))->assertOk()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
            ->assertInertia(fn ($page) => $page->component('Clinics/Show')
                ->where('clinic.slug', $offer->clinic->slug)
                ->where('preview.back_url', $offer->shortUrl()));

        $this->get(route('clinics.show', $offer->clinic->slug))->assertNotFound();

        $offer->update(['revoked_at' => now()]);
        $this->get(route('offer.preview', ['code' => $offer->short_code]))->assertNotFound();
    }

    public function test_single_offer_send_uses_configured_channels_stop_list_and_frequency_rule(): void
    {
        Mail::fake();
        config(['mail.mailers.offers.host' => 'smtp.test', 'services.sms.provider' => null]);
        $admin = $this->admin();
        $offer = $this->offer(['email' => 'info@ulybka.test', 'whatsapp' => '+79001112233']);

        $this->actingAs($admin)->get("/admin/offers/{$offer->id}")->assertOk()->assertInertia(fn ($page) => $page
            ->where('dispatch.0.key', 'email')->where('dispatch.0.available', true)->where('dispatch.0.contact', 'info@ulybka.test')
            ->where('dispatch.1.key', 'sms')->where('dispatch.1.available', false));

        $this->actingAs($admin)->post("/admin/offers/{$offer->id}/send", ['channel' => 'email'])->assertSessionHas('success');
        Mail::assertSent(OfferMail::class, 1);
        $this->assertSame('sent', $offer->fresh()->status);

        $this->actingAs($admin)->post("/admin/offers/{$offer->id}/send", ['channel' => 'sms', 'contact' => '+7 900 111-22-33'])->assertSessionHas('error');

        $this->actingAs($admin)->post("/admin/offers/{$offer->id}/send", ['channel' => 'whatsapp'])->assertSessionHas('success');
        $this->assertDatabaseHas('campaign_recipients', ['offer_id' => $offer->id, 'channel' => 'whatsapp', 'contact' => '+79001112233', 'status' => 'sent']);

        $other = $this->offer(['email' => 'info@ulybka.test'], 'Другая клиника');
        $this->actingAs($admin)->post("/admin/offers/{$other->id}/send", ['channel' => 'email'])->assertSessionHas('error');

        StopListEntry::add('email', 'stop@clinic.test', 'unsubscribed', $admin->id);
        $this->actingAs($admin)->post("/admin/offers/{$other->id}/send", ['channel' => 'email', 'contact' => 'stop@clinic.test'])->assertSessionHas('error');
        Mail::assertSent(OfferMail::class, 1);
    }

    public function test_extra_note_goes_into_offer_and_ai_only_suggests_text(): void
    {
        config(['services.openrouter.api_key' => 'sk-test']);
        Http::fake(['*/chat/completions' => Http::response(['choices' => [['message' => ['content' => 'Подключитесь до 30 ноября — 3 месяца по цене двух.']]], 'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 10]])]);
        $admin = $this->admin();
        $offer = $this->offer();
        $offer->templateVersion->update(['email_body' => 'Привет! {extra}']);

        $this->actingAs($admin)->postJson("/admin/offers/{$offer->id}/improve", ['text' => 'до 30.11 три месяца по цене двух'])
            ->assertOk()->assertJsonPath('text', 'Подключитесь до 30 ноября — 3 месяца по цене двух.');
        Http::assertSent(fn ($request) => $request['model'] === 'deepseek/deepseek-chat' && str_contains($request['messages'][0]['content'], 'не добавляй новых скидок'));
        $this->assertNull($offer->fresh()->extra_note);

        $this->actingAs($admin)->put("/admin/offers/{$offer->id}/extra", ['extra_note' => 'Скидка 20% на первый месяц'])->assertSessionHas('success');
        $fresh = $offer->fresh();
        $this->assertSame('Скидка 20% на первый месяц', $fresh->extra_note);
        $this->assertStringContainsString('Скидка 20% на первый месяц', $fresh->snapshot['email_text']);
        $this->get($fresh->url())->assertInertia(fn ($page) => $page->where('extra_html', '<p>Скидка 20% на первый месяц</p>'));
    }

    public function test_claim_requires_agreement_and_trial_starts_after_moderation_approval(): void
    {
        Tariff::query()->update(['is_active' => false]);
        $tariff = Tariff::query()->create(['name' => 'Профи', 'slug' => 'profi-trial', 'price' => 490000, 'duration_days' => 30, 'is_active' => true]);
        $offer = $this->offer();
        $owner = User::factory()->create(['role' => 'user', 'status' => 'active']);

        $this->actingAs($owner)->get(route('offer.claim.show', ['token' => $offer->token()]))->assertOk()
            ->assertInertia(fn ($page) => $page->component('Offer/Claim')->where('trial.enabled', true)->where('trial.days', 30)->where('sms.required', false));

        $this->actingAs($owner)->post(route('offer.claim.store', ['token' => $offer->token()]), ['confirm' => '1'])
            ->assertSessionHasErrors(['agreement', 'publish']);

        $this->actingAs($owner)->post(route('offer.claim.store', ['token' => $offer->token()]), ['confirm' => '1', 'agreement' => '1', 'publish' => '1'])
            ->assertRedirect(route('cabinet.dashboard'));

        $clinic = $offer->clinic->fresh();
        $org = $clinic->organization;
        $this->assertSame('pending', $clinic->status);
        $this->assertSame($owner->id, $org->owner_id);
        $this->assertNotNull($org->agreement_accepted_at);
        $this->assertStringStartsWith('v-', (string) $org->agreement_version);
        $this->assertNotNull($org->trial_requested_at);
        $this->assertSame(0, ClinicSubscription::query()->where('clinic_id', $clinic->id)->where('is_trial', true)->count());

        app(ModerationService::class)->decide('clinic', $clinic->id, 'approve');

        $subscription = ClinicSubscription::query()->where('clinic_id', $clinic->id)->where('is_trial', true)->firstOrFail();
        $this->assertSame($tariff->id, $subscription->tariff_id);
        $this->assertSame(30, (int) round($subscription->starts_at->diffInDays($subscription->ends_at)));
        $this->assertNotNull($org->fresh()->trial_used_at);

        // Тот же ИНН у другой организации — пробный период больше не положен.
        $org->update(['inn' => '2310000001']);
        $second = $this->offer([], 'Вторая клиника');
        $second->clinic->organization->update(['inn' => '2310000001']);
        $this->actingAs(User::factory()->create(['role' => 'user', 'status' => 'active']))->get(route('offer.claim.show', ['token' => $second->token()]))
            ->assertInertia(fn ($page) => $page->where('trial.enabled', false)->where('trial.reason', 'Пробный период для этого ИНН уже использован.'));
    }

    public function test_claim_needs_verified_email_and_sms_code_when_gateway_is_connected(): void
    {
        config(['services.sms.provider' => 'smsru', 'services.sms.api_key' => 'key']);
        $sent = [];
        Http::fake(function ($request) use (&$sent) {
            $sent[] = $request['msg'] ?? '';

            return Http::response(['status' => 'OK', 'sms' => [preg_replace('/\D+/', '', (string) $request['to']) => ['status' => 'OK', 'sms_id' => '1']]]);
        });
        $offer = $this->offer(['phone' => '+79001112233']);
        $offer->clinic->update(['phone' => '+7 (900) 111-22-33']);
        $token = $offer->token();

        $unverified = User::factory()->unverified()->create(['role' => 'user', 'status' => 'active']);
        $this->actingAs($unverified)->post(route('offer.claim.store', ['token' => $token]), ['confirm' => '1', 'agreement' => '1', 'publish' => '1'])
            ->assertRedirect(route('verification.notice'));
        $this->assertNull($offer->clinic->organization->fresh()->owner_id);

        $owner = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $this->actingAs($owner)->get(route('offer.claim.show', ['token' => $token]))
            ->assertInertia(fn ($page) => $page->where('sms.required', true)->where('sms.phone', '+7 ••• •••-••-33'));
        $this->actingAs($owner)->post(route('offer.claim.code', ['token' => $token]))->assertSessionHas('success');
        preg_match('/\d{6}/', (string) end($sent), $m);
        $code = $m[0] ?? '';
        $this->assertSame(6, strlen($code));

        $this->actingAs($owner)->post(route('offer.claim.store', ['token' => $token]), ['confirm' => '1', 'agreement' => '1', 'publish' => '1', 'code' => '000000'])
            ->assertSessionHasErrors('code');
        $this->actingAs($owner)->post(route('offer.claim.store', ['token' => $token]), ['confirm' => '1', 'agreement' => '1', 'publish' => '1', 'code' => $code])
            ->assertRedirect(route('cabinet.dashboard'));
        $this->assertSame($owner->id, $offer->clinic->organization->fresh()->owner_id);
    }

    public function test_bulk_offers_from_parser_import_drafts_and_skip_existing(): void
    {
        $admin = $this->admin();
        $template = OfferTemplate::factory()->create();
        $fresh = ParsedOrganization::factory()->count(2)->create(['city_id' => $this->cityId()]);
        $existing = $this->offer([], 'Уже с КП');
        $existingParsed = ParsedOrganization::query()->where('clinic_id', $existing->clinic_id)->firstOrFail();

        $this->actingAs($admin)->get('/admin/parser?tab=organizations')->assertOk()
            ->assertInertia(fn ($page) => $page->where('offer_templates', fn ($templates) => collect($templates)->pluck('id')->contains($template->id)));

        $this->actingAs($admin)->post('/admin/offers/bulk', [
            'template_id' => $template->id,
            'ids' => [...$fresh->pluck('id')->all(), $existingParsed->id],
        ])->assertRedirect(route('admin.offers.index'))->assertSessionHas('success', fn (string $m) => str_contains($m, 'Сформировано КП: 2') && str_contains($m, 'уже были: 1'));

        $this->assertSame(3, Offer::query()->count());
        $this->assertSame(2, Clinic::query()->whereIn('id', $fresh->fresh()->pluck('clinic_id'))->where('status', 'draft')->count());
    }

    /** @param array<string, string> $contacts */
    private function offer(array $contacts = [], string $name = 'Улыбка'): Offer
    {
        return app(OfferService::class)->createFor($this->draft($name, $contacts), OfferTemplate::factory()->create())->load('clinic', 'demoLink');
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
