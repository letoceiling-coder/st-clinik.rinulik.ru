<?php

namespace Tests\Feature;

use App\Mail\OfferMail;
use App\Models\City;
use App\Models\Clinic;
use App\Models\Offer;
use App\Models\OfferTemplate;
use App\Models\ParsedOrganization;
use App\Models\User;
use App\Services\Offers\OfferRenderer;
use App\Services\Offers\OfferService;
use App\Services\Parser\ParsedOrganizationImporter;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/** Тестовая отправка шаблона КП: рабочие ссылки вместо условных, рекомендуемый текст. */
class OfferTemplateTestSendTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        Queue::fake();
        Mail::fake();
    }

    public function test_test_email_for_draft_clinic_contains_working_offer_links(): void
    {
        $template = OfferTemplate::factory()->create();
        $clinic = $this->draft('Дентал-Медиа');

        $this->actingAs($this->admin())->post('/admin/offers/templates/test', [
            ...$this->content(),
            'clinic_id' => $clinic->id,
            'template_id' => $template->id,
            'channel' => 'email',
        ])->assertSessionHas('success', fn (string $m) => str_contains($m, 'Ссылки в нём рабочие'));

        $offer = Offer::query()->where('clinic_id', $clinic->id)->sole();
        Mail::assertSent(OfferMail::class, fn (OfferMail $mail) => str_contains($mail->bodyText, $offer->shortUrl())
            && str_contains($mail->bodyText, route('offer.demo', ['code' => $offer->short_code]))
            && ! str_contains($mail->bodyText, 'XXXXXXXXXX'));
        $this->get($offer->shortUrl())->assertRedirect();
    }

    public function test_repeated_test_send_reuses_the_same_offer(): void
    {
        $template = OfferTemplate::factory()->create();
        $clinic = $this->draft('Улыбка');
        $offer = app(OfferService::class)->createFor($clinic, $template);

        $this->actingAs($this->admin())->post('/admin/offers/templates/test', [
            ...$this->content(), 'clinic_id' => $clinic->id, 'template_id' => $template->id, 'channel' => 'email',
        ])->assertSessionHas('success');

        $this->assertSame(1, Offer::query()->where('clinic_id', $clinic->id)->count());
        Mail::assertSent(OfferMail::class, fn (OfferMail $mail) => str_contains($mail->bodyText, $offer->shortUrl()));
    }

    public function test_published_clinic_without_offer_explains_to_pick_a_draft(): void
    {
        OfferTemplate::factory()->create();
        $clinic = $this->draft('Опубликованная');
        $clinic->update(['status' => 'published']);

        $this->actingAs($this->admin())->post('/admin/offers/templates/test', [
            ...$this->content(), 'clinic_id' => $clinic->id, 'channel' => 'email',
        ])->assertSessionHas('error', fn (string $m) => str_contains($m, 'выберите клинику-черновик'));

        Mail::assertNothingSent();
    }

    public function test_recommended_text_explains_benefits_trial_and_renders_named_links(): void
    {
        $this->actingAs($this->admin())->get('/admin/offers/templates/create')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('defaults.email_body', fn (string $body) => str_contains($body, 'без привязки карты') && str_contains($body, '[Открыть демо-кабинет]({demo_link})'))
                ->where('defaults.web_body', fn (string $body) => str_contains($body, '## Что получает клиника') && str_contains($body, '## Как начать')));

        $renderer = app(OfferRenderer::class);
        $html = $renderer->toHtml('Смотрите [демо-кабинет](https://mirklinik.ru/o/AbCdEfGhIj/demo) и https://mirklinik.ru/about');
        $this->assertStringContainsString('<a href="https://mirklinik.ru/o/AbCdEfGhIj/demo" target="_blank" rel="noopener">демо-кабинет</a>', $html);
        $this->assertStringContainsString('<a href="https://mirklinik.ru/about" target="_blank" rel="noopener">https://mirklinik.ru/about</a>', $html);
        $this->assertSame('Смотрите демо-кабинет: https://mirklinik.ru/o/AbCdEfGhIj/demo', $renderer->toPlain('Смотрите [демо-кабинет](https://mirklinik.ru/o/AbCdEfGhIj/demo)'));
    }

    public function test_lines_with_missing_metrics_are_dropped(): void
    {
        $clinic = $this->draft('Без рейтинга');
        ParsedOrganization::query()->where('clinic_id', $clinic->id)->update(['rating' => null, 'reviews_count' => 0]);

        $rendered = app(OfferRenderer::class)->render([
            ...$this->content(),
            'email_body' => "Здравствуйте!\n\n- Онлайн-запись\n- Ваш рейтинг {org.rating} и {org.reviews} отзывов\n\nДо встречи",
        ], $clinic->fresh(), ['offer_link' => 'https://mirklinik.ru/o/AbCdEfGhIj', 'unsubscribe_link' => '']);

        $this->assertStringNotContainsString('рейтинг', $rendered['email_text']);
        $this->assertStringContainsString('• Онлайн-запись', $rendered['email_text']);
        $this->assertStringContainsString('<li>Онлайн-запись</li>', $rendered['email_html']);
    }

    /** @return array<string, string> */
    private function content(): array
    {
        return [
            'web_title' => '{org.name}',
            'web_body' => 'Текст',
            'email_subject' => 'КП для {org.name}',
            'email_body' => "Предложение: {offer_link}\n\n[Открыть демо-кабинет]({demo_link})",
            'sms_text' => '{org.name} {offer_link}',
            'messenger_text' => '{offer_link}',
        ];
    }

    private function draft(string $name): Clinic
    {
        $parsed = ParsedOrganization::factory()->create(['name' => $name, 'city_id' => (int) City::query()->where('name', 'Краснодар')->value('id')]);

        return app(ParsedOrganizationImporter::class)->import($parsed, null, false);
    }

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        return $admin;
    }
}
