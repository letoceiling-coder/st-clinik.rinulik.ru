<?php

namespace App\Http\Controllers\Admin;

use App\Mail\OfferMail;
use App\Models\Clinic;
use App\Models\Offer;
use App\Models\OfferTemplate;
use App\Models\OfferTemplateVersion;
use App\Rules\RussianPhone;
use App\Services\Audit;
use App\Services\Offers\OfferRenderer;
use App\Services\Offers\OfferService;
use App\Services\Offers\SmsSender;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Response;
use RuntimeException;
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
    public function test(Request $request, OfferRenderer $renderer, SmsSender $sms, OfferService $offers): RedirectResponse
    {
        $data = $request->validate([
            'clinic_id' => ['required', 'integer', 'exists:clinics,id'],
            'template_id' => ['nullable', 'integer', 'exists:offer_templates,id'],
            'channel' => ['required', 'in:email,sms'],
            'phone' => ['required_if:channel,sms', 'nullable', 'string', 'max:32', new RussianPhone],
        ] + $this->previewRules());
        $clinic = Clinic::query()->findOrFail($data['clinic_id']);

        try {
            $offer = $this->offerForTest($clinic, $offers, $request, $data['template_id'] ?? null);
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $rendered = $renderer->render($this->content($data), $clinic, $offers->links($offer));

        try {
            if ($data['channel'] === 'email') {
                $sample = url('/unsubscribe/test');
                Mail::mailer('offers')->to($request->user()->email)->send(new OfferMail(
                    subjectLine: '[Тест] '.$rendered['email_subject'],
                    bodyHtml: str_replace('{unsubscribe_link}', $sample, $rendered['email_html']),
                    bodyText: str_replace('{unsubscribe_link}', $sample, $rendered['email_text']),
                    unsubscribeUrl: $sample,
                ));
                $message = "Тестовое письмо отправлено на {$request->user()->email}. Ссылки в нём рабочие — это КП клиники «{$clinic->name}».";
            } else {
                $sms->send((string) $data['phone'], $rendered['sms']);
                $message = "Тестовое SMS отправлено. Ссылка в нём рабочая — это КП клиники «{$clinic->name}».";
            }
        } catch (Throwable $e) {
            return back()->with('error', 'Не отправлено: '.mb_substr($e->getMessage(), 0, 200));
        }
        Audit::log('offers.template_test', null, ['channel' => $data['channel']]);

        return back()->with('success', $message);
    }

    /**
     * КП клиники для тестовой отправки со своими, рабочими ссылками: действующее КП клиники
     * или новое (то же самое потом уйдёт клинике — повторно оно не создаётся).
     */
    private function offerForTest(Clinic $clinic, OfferService $offers, Request $request, ?int $templateId): Offer
    {
        $existing = Offer::query()->where('clinic_id', $clinic->id)->whereNull('revoked_at')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))->latest('id')->first();
        if ($existing) {
            return $existing;
        }
        if ($clinic->status !== 'draft') {
            throw new RuntimeException("КП формируется только для неподключённых клиник, а «{$clinic->name}» уже на сайте. Для теста выберите клинику-черновик.");
        }

        $template = OfferTemplate::query()->whereHas('versions')
            ->when($templateId, fn ($q) => $q->whereKey($templateId), fn ($q) => $q->where('is_active', true))
            ->first()
            ?? throw new RuntimeException('Сначала сохраните шаблон — без него не создать КП с рабочими ссылками.');

        return $offers->createFor($clinic, $template, $request->user());
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

    /**
     * Рекомендуемый текст КП для всех каналов: что получает клиника, почему это выгодно,
     * бесплатный пробный период без риска и понятный следующий шаг.
     *
     * @return array<string, string>
     */
    private function defaultContent(): array
    {
        return [
            'web_title' => '{org.name}: новые пациенты {city.in} — {trial_days} дней бесплатно',
            'web_body' => <<<'MD'
# Здравствуйте!

Мы уже подготовили для «{org.name}» карточку на МирКлиник — каталоге стоматологий {city.in}. Пациенты находят здесь клинику по услуге, цене, району и отзывам и сразу записываются онлайн. Осталось проверить карточку и включить приём заявок — первые **{trial_days} дней бесплатно**.

## Что получает клиника

- **Пациентов, которые уже ищут стоматолога.** Каталог показывает вашу клинику тем, кто выбирает лечение {city.in} прямо сейчас: по услугам, ценам, району и рейтингу.
- **Онлайн-запись без лишних звонков.** Пациент выбирает врача и удобное время, заявка сразу появляется в личном кабинете.
- **Ни одной потерянной заявки.** Уведомления приходят в MAX, на почту и в браузер; в кабинете видно, сколько ждёт пациент, кто ответственный и кому перезвонить.
- **Доверие с первого взгляда.** Ваш рейтинг **{org.rating}** и {org.reviews} отзывов на Яндекс Картах, проверенная лицензия и ответы клиники на отзывы показывают пациенту, что сюда можно идти.
- **Всё о клинике на одной странице.** Цены, врачи, фото, акции, часы работы и маршрут — пациенту не нужно искать информацию по разным сайтам.
- **Понятная отдача.** Статистика просмотров карточки и заявок показывает, сколько пациентов приносит площадка.

**Почему стоит начать сейчас.** В городе {competitors_in_city} стоматологий, а в каталоге пока {platform.clinics_in_city} клиник: чем раньше клиника появится в каталоге, тем раньше начнёт собирать заявки и отзывы.

## Пробный период без риска

- **{trial_days} дней полного доступа** ко всем возможностям кабинета
- Без оплаты и без привязки карты — по окончании ничего не спишется автоматически
- Карточку уже заполнили мы, вам остаётся проверить данные — это несколько минут

## Как начать

**Шаг 1.** Откройте [демо-кабинет]({demo_link}) — в нём видно, как приходят заявки, записи и статистика.
**Шаг 2.** Посмотрите, [как страницу клиники увидят пациенты]({preview_link}).
**Шаг 3.** Оставьте заявку внизу страницы — включим пробный период и поможем всё настроить.

Остались вопросы — [подробнее о сервисе для клиник]({about_link}) или напишите нам.

{manager.name}, {manager.phone}
MD,
            'email_subject' => '{org.name}: карточка на МирКлиник готова — {trial_days} дней бесплатно',
            'email_body' => <<<'MD'
Здравствуйте!

Пишем из МирКлиник — каталога стоматологий {city.in}. Мы уже подготовили карточку «{org.name}» по открытым данным: адрес, контакты, часы работы, фото. Пациенты смогут находить клинику по услугам и ценам и сразу записываться онлайн.

## Что это даст клинике

- **Новые пациенты из каталога** — те, кто прямо сейчас выбирает стоматолога {city.in}
- **Онлайн-запись** — заявки приходят в личный кабинет, уведомления в MAX, на почту и в браузер
- **Ваш рейтинг {org.rating} и {org.reviews} отзывов** с Яндекс Карт работают на доверие и здесь
- **Ответы на отзывы, акции и статистика** — всё в одном кабинете

## Попробуйте бесплатно

**{trial_days} дней полного доступа** — без оплаты и без привязки карты. Если не подойдёт, ничего не спишется.

[Посмотреть предложение для «{org.name}»]({offer_link})

[Открыть демо-кабинет]({demo_link}) — заявки, записи и статистика на примере вашей клиники

{extra}

Чтобы подключиться, достаточно ответить на это письмо или позвонить — включим пробный период и поможем всё настроить.

{manager.name}
{manager.phone}
MD,
            'sms_text' => '{org.name}: карточка на МирКлиник готова, {trial_days} дней бесплатно {offer_link}',
            'messenger_text' => <<<'MD'
Здравствуйте! Пишем из МирКлиник — каталога стоматологий {city.in}.

Мы уже подготовили карточку «{org.name}»: пациенты смогут записываться онлайн, а заявки будут приходить вам в кабинет и в MAX.
Ваш рейтинг {org.rating} с Яндекс Карт тоже покажем.

Первые {trial_days} дней — бесплатно, без привязки карты.

Предложение: {offer_link}
Демо-кабинет: {demo_link}

{manager.name}, {manager.phone}
MD,
            'call_script' => <<<'MD'
1. Представиться: «{manager.name}, МирКлиник — каталог стоматологий {city.in}». Спросить, кто отвечает за запись пациентов или продвижение.
2. Повод: карточка «{org.name}» уже подготовлена по открытым данным.
   Рейтинг {org.rating}, {org.reviews} отзывов на Яндекс Картах — покажем их и в каталоге.
3. Выгода: пациенты находят клинику по услуге и цене и записываются онлайн; заявки приходят в кабинет и в MAX, ни одна не теряется.
4. Предложение: {trial_days} дней бесплатно, без оплаты и без привязки карты; по окончании ничего не списывается.
5. «Пациентов хватает»: каталог помогает заполнять свободные окна и не отнимает время — заявки сами приходят администратору.
6. «Дорого»: пробный период бесплатный, тарифы — на странице предложения; платить, только если понравится.
7. Отправить ссылку на предложение и демо-кабинет: {offer_link}. Договориться о звонке через 2–3 дня.
MD,
        ];
    }
}
