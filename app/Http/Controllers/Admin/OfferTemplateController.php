<?php

namespace App\Http\Controllers\Admin;

use App\Mail\OfferMail;
use App\Models\Clinic;
use App\Models\OfferTemplate;
use App\Models\OfferTemplateVersion;
use App\Rules\RussianPhone;
use App\Services\Audit;
use App\Services\Offers\OfferRenderer;
use App\Services\Offers\SmsSender;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Response;
use Throwable;

/** Шаблоны КП: каждая правка — новая версия; КП ссылаются на версию, по которой сформированы. */
class OfferTemplateController extends AdminController
{
    public function create(): Response
    {
        return $this->editor(null);
    }

    public function edit(OfferTemplate $template): Response
    {
        return $this->editor($template);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:120'], 'is_active' => ['boolean']] + OfferController::contentRules());

        $template = DB::transaction(function () use ($data, $request): OfferTemplate {
            $template = OfferTemplate::create([
                'name' => $data['name'], 'is_active' => (bool) ($data['is_active'] ?? true), 'current_version' => 1, 'created_by' => $request->user()->id,
            ]);
            $template->versions()->create([...$this->content($data), 'version' => 1, 'created_by' => $request->user()->id]);

            return $template;
        });
        Audit::log('offers.template_created', $template);

        return redirect()->route('admin.offers.templates.edit', $template)->with('success', 'Шаблон создан.');
    }

    public function update(Request $request, OfferTemplate $template): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:120'], 'is_active' => ['boolean']] + OfferController::contentRules());
        $latest = $template->latestVersion;
        $changed = $latest === null || $latest->only(OfferTemplateVersion::CONTENT_FIELDS) != $this->content($data);

        DB::transaction(function () use ($template, $data, $changed, $request): void {
            $version = (int) $template->versions()->max('version') + ($changed ? 1 : 0);
            if ($changed) {
                $template->versions()->create([...$this->content($data), 'version' => $version, 'created_by' => $request->user()->id]);
            }
            $template->update(['name' => $data['name'], 'is_active' => (bool) ($data['is_active'] ?? false), 'current_version' => $version]);
        });
        Audit::log('offers.template_updated', $template, ['new_version' => $changed]);

        return back()->with('success', $changed ? 'Сохранена новая версия шаблона. Уже сформированные КП не изменились.' : 'Шаблон сохранён.');
    }

    /** Предпросмотр несохранённого текста на конкретной организации. */
    public function preview(Request $request, OfferRenderer $renderer): JsonResponse
    {
        $data = $request->validate(['clinic_id' => ['required', 'integer', 'exists:clinics,id']] + $this->previewRules());
        $clinic = Clinic::query()->findOrFail($data['clinic_id']);
        $rendered = $renderer->render($this->content($data), $clinic, $this->sampleLinks());

        return response()->json([...$rendered, 'sms_segments' => OfferRenderer::smsSegments($rendered['sms']), 'sms_length' => mb_strlen($rendered['sms'])]);
    }

    /** Тестовая отправка себе: email на адрес администратора, SMS — на указанный номер. */
    public function test(Request $request, OfferRenderer $renderer, SmsSender $sms): RedirectResponse
    {
        $data = $request->validate([
            'clinic_id' => ['required', 'integer', 'exists:clinics,id'],
            'channel' => ['required', 'in:email,sms'],
            'phone' => ['required_if:channel,sms', 'nullable', 'string', 'max:32', new RussianPhone],
        ] + $this->previewRules());
        $rendered = $renderer->render($this->content($data), Clinic::query()->findOrFail($data['clinic_id']), $this->sampleLinks());

        try {
            if ($data['channel'] === 'email') {
                $sample = url('/unsubscribe/test');
                Mail::mailer('offers')->to($request->user()->email)->send(new OfferMail(
                    subjectLine: '[Тест] '.$rendered['email_subject'],
                    bodyHtml: str_replace('{unsubscribe_link}', $sample, $rendered['email_html']),
                    bodyText: str_replace('{unsubscribe_link}', $sample, $rendered['email_text']),
                    unsubscribeUrl: $sample,
                ));
                $message = "Тестовое письмо отправлено на {$request->user()->email}.";
            } else {
                $sms->send((string) $data['phone'], $rendered['sms']);
                $message = 'Тестовое SMS отправлено.';
            }
        } catch (Throwable $e) {
            return back()->with('error', 'Не отправлено: '.mb_substr($e->getMessage(), 0, 200));
        }
        Audit::log('offers.template_test', null, ['channel' => $data['channel']]);

        return back()->with('success', $message);
    }

    private function editor(?OfferTemplate $template): Response
    {
        $template?->load(['versions' => fn ($q) => $q->with('creator:id,name')->orderByDesc('version')]);
        $latest = $template?->versions->first();

        return $this->render('Admin/OfferTemplate', $template ? 'Шаблон КП: '.$template->name : 'Новый шаблон КП', [
            'template' => $template ? [
                'id' => $template->id,
                'name' => $template->name,
                'is_active' => $template->is_active,
                'version' => $latest?->version,
                'content' => $latest?->only(OfferTemplateVersion::CONTENT_FIELDS),
                'versions' => $template->versions->map(fn (OfferTemplateVersion $v) => [
                    'version' => $v->version,
                    'by' => $v->creator?->name,
                    'at' => $v->created_at?->format('d.m.Y H:i'),
                    'content' => $v->only(OfferTemplateVersion::CONTENT_FIELDS),
                ])->values(),
            ] : null,
            'defaults' => $this->defaultContent(),
            'variables' => OfferRenderer::VARIABLES,
            'sample_clinics' => Clinic::query()->where('status', 'draft')->latest('id')->limit(50)->get(['id', 'name'])
                ->concat(Clinic::query()->where('status', 'published')->orderByDesc('rating')->limit(10)->get(['id', 'name']))
                ->map(fn (Clinic $c) => ['id' => $c->id, 'name' => $c->name])->values(),
            'sms_limit' => OfferRenderer::SMS_MAX_SEGMENTS,
        ]);
    }

    /** @return array<string, list<string>> */
    private function previewRules(): array
    {
        return collect(OfferController::contentRules())->map(fn (array $rules) => ['nullable', ...array_diff($rules, ['required', 'nullable'])])->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, string|null>
     */
    private function content(array $data): array
    {
        return collect(OfferTemplateVersion::CONTENT_FIELDS)->mapWithKeys(fn (string $f) => [$f => $data[$f] ?? null])->all();
    }

    /** @return array{offer_link: string, demo_link: string, unsubscribe_link: string} */
    private function sampleLinks(): array
    {
        return [
            'offer_link' => url('/o/XXXXXXXXXX'),
            'demo_link' => url('/o/XXXXXXXXXX/demo'),
            'unsubscribe_link' => '{unsubscribe_link}',
        ];
    }

    /** @return array<string, string> */
    private function defaultContent(): array
    {
        return [
            'web_title' => '{org.name}: больше пациентов {city.in}',
            'web_body' => "# Здравствуйте!\n\nМы подготовили для «{org.name}» карточку на СтомКлиник — каталоге стоматологий города {city}. Сейчас у вас **{org.rating}** на Яндекс Картах и {org.reviews} отзывов: это хороший повод показать клинику пациентам, которые выбирают врача прямо сейчас.\n\n## Что уже есть в городе\n\n- Стоматологий в городе: {competitors_in_city}\n- Клиник на СтомКлиник: {platform.clinics_in_city}\n- Просмотров карточек клиник: {platform.visitors_in_city}\n\n## Что получает клиника\n\n- Карточку с ценами, врачами, фото и картой — уже заполнена по открытым данным\n- Онлайн-запись и заявки пациентов в личном кабинете\n- Ответы на отзывы и статистику просмотров\n\n**Первые {trial_days} дней — бесплатно.**\n\nПосмотрите, как будет выглядеть страница клиники: {preview_link}\n\nОткройте демо-кабинет — заявки, записи и статистика: {demo_link}\n\nПодробнее о сервисе: {about_link}\n\n{manager.name}, {manager.phone}",
            'email_subject' => '{org.name} — карточка клиники на СтомКлиник уже готова',
            'email_body' => "Здравствуйте!\n\nМы подготовили карточку «{org.name}» на СтомКлиник — каталоге стоматологий города {city}. Посмотрите предложение и демо-кабинет клиники: {offer_link}\n\nНа Яндекс Картах у вас {org.rating} и {org.reviews} отзывов — пациенты увидят это и на нашей площадке.\n\n{extra}\n\nПервые {trial_days} дней работы с кабинетом — бесплатно.\n\n{manager.name}\n{manager.phone}",
            'sms_text' => '{org.name}: карточка клиники на СтомКлиник готова {offer_link}',
            'messenger_text' => "Здравствуйте! Подготовили карточку «{org.name}» на СтомКлиник — каталоге стоматологий {city}. Предложение и демо-кабинет: {offer_link}\n\n{manager.name}, {manager.phone}",
            'call_script' => "1. Представиться: {manager.name}, СтомКлиник.\n2. Карточка «{org.name}» уже подготовлена, рейтинг {org.rating}.\n3. Предложить ссылку на демо-кабинет и КП: {offer_link}\n4. Уточнить, кому отправить предложение и когда удобно созвониться.",
        ];
    }
}
