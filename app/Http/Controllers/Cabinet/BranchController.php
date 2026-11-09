<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\Clinic;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\Audit;
use App\Services\Clinics\AddressGeocoder;
use App\Services\Clinics\ClinicProfileForm;
use App\Services\Clinics\OwnerlessClinicMatcher;
use App\Services\ContentRevisionService;
use App\Services\ModerationService;
use App\Services\Monetization\ClinicSubscriptionService;
use App\Services\ProfileMetrics;
use App\Support\Schedule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Response;

class BranchController extends CabinetController
{
    public const PAYMENTS = ClinicProfileForm::PAYMENTS;

    public function index(Request $request, ProfileMetrics $metrics): Response
    {
        $branches = $request->attributes->get('branches');

        return $this->render($request, 'Cabinet/Branches', 'Филиалы', [
            'branches' => $branches->map(fn (Clinic $b) => [
                'id' => $b->id, 'name' => $b->name, 'slug' => $b->slug, 'address' => $b->address, 'status' => $b->status,
                'moderation_note' => $b->moderation_note, 'completeness' => $metrics->completeness($b)['percent'],
                'rating' => $b->rating, 'reviews_count' => $b->reviews_count, 'city' => $b->city?->name,
            ])->values(),
        ]);
    }

    public function create(Request $request): Response
    {
        return $this->form($request, null);
    }

    public function edit(Request $request, Clinic $clinic): Response
    {
        $this->authorizeBranch($request, $clinic);

        return $this->form($request, $clinic);
    }

    private function form(Request $request, ?Clinic $clinic): Response
    {
        $props = app(ClinicProfileForm::class)->props($clinic);
        if ($clinic) {
            $revisions = app(ContentRevisionService::class);
            $props['branchForm'] = $revisions->overlay($clinic, $props['branchForm']);
            $props['pendingRevision'] = $revisions->pendingSummary($clinic);
        }

        return $this->render($request, 'Cabinet/BranchForm', $clinic ? 'Редактирование филиала' : 'Новый филиал', $props);
    }

    public function store(Request $request): RedirectResponse
    {
        $org = $request->attributes->get('org');
        $branchCount = Clinic::query()->where('organization_id', $org->id)->count();
        $reference = Clinic::query()->where('organization_id', $org->id)->first();
        if ($reference) {
            $limitCheck = app(ClinicSubscriptionService::class)
                ->canAddBranch($reference, $branchCount);
            if (! $limitCheck['ok']) {
                return back()->with('error', $limitCheck['message']);
            }
        }

        $profile = app(ClinicProfileForm::class);
        $data = $profile->validate($request);

        $clinic = new Clinic($profile->attributes($data));
        $clinic->organization_id = $org->id;
        $clinic->slug = $profile->uniqueSlug($data['name']);
        $clinic->status = 'draft';
        $clinic->art_seed = random_int(1, 12);
        app(AddressGeocoder::class)->fillCoordinates($clinic);

        // Карточка этой клиники уже может быть в каталоге (собрана из открытых источников) — предлагаем забрать её, а не плодить дубль.
        if (! $request->boolean('not_duplicate')) {
            $duplicates = app(OwnerlessClinicMatcher::class)->find($clinic);
            if ($duplicates !== []) {
                Audit::log('branch.duplicate_suggested', null, ['organization_id' => $org->id, 'clinic_ids' => array_column($duplicates, 'id')]);

                return back()->withInput()->with('duplicates', array_map(fn (array $d) => [
                    'slug' => $d['slug'],
                    'name' => $d['name'],
                    'address' => $d['address'],
                    'reason' => $d['reason'],
                    'claim_url' => route('clinics.claim.show', $d['slug']),
                ], $duplicates));
            }
        }

        $clinic->save();
        $clinic->specialties()->sync($data['specialty_ids'] ?? []);
        app(ClinicSubscriptionService::class)->assignDefaultIfNeeded($clinic);
        app(ProfileMetrics::class)->recalcClinic($clinic);

        Audit::log('branch.created', $clinic);
        $request->session()->put('cabinet_branch', $clinic->id);

        return redirect()->route('cabinet.branches')->with('success', 'Филиал создан как черновик. Заполните профиль и отправьте на модерацию.');
    }

    public function update(Request $request, Clinic $clinic): RedirectResponse
    {
        $this->authorizeBranch($request, $clinic);
        $profile = app(ClinicProfileForm::class);
        $data = $profile->validate($request);

        // Одобренный филиал меняется только через модерацию: на сайте остаётся проверенная версия.
        $revisions = app(ContentRevisionService::class);
        if ($revisions->requiresModeration($clinic)) {
            $revision = $revisions->propose($clinic, 'profile', $profile->attributes($data), $request->user(), $data['specialty_ids'] ?? []);
            Audit::log('branch.update_proposed', $clinic);

            return back()->with('success', $revision
                ? 'Изменения отправлены на модерацию. До проверки на сайте показывается прежняя версия.'
                : 'Изменений нет — на сайте актуальные данные.');
        }

        $clinic->fill($profile->attributes($data));
        if ($clinic->status === 'rejected') {
            $clinic->status = 'draft';
        }
        app(AddressGeocoder::class)->fillCoordinates($clinic);
        $clinic->save();
        $clinic->specialties()->sync($data['specialty_ids'] ?? []);
        app(ProfileMetrics::class)->recalcClinic($clinic);
        Audit::log('branch.updated', $clinic);

        return back()->with('success', 'Изменения сохранены.');
    }

    public function submit(Request $request, Clinic $clinic, ProfileMetrics $metrics): RedirectResponse
    {
        $this->authorizeBranch($request, $clinic);
        abort_unless(in_array($clinic->status, ['draft', 'rejected'], true), 422);

        $readiness = $metrics->moderationReadiness($clinic);
        if (! $readiness['ready']) {
            return back()->with('error', $this->readinessHint($readiness));
        }

        $clinic->update(['status' => 'pending', 'moderation_note' => null]);
        Audit::log('branch.submitted', $clinic);
        $this->notifyModerators($clinic);

        return back()->with('success', 'Филиал отправлен на модерацию. Обычно проверка занимает до 2 рабочих дней.');
    }

    /** Колокольчик в админке у всех, кто может модерировать: новая заявка не ждёт, пока её случайно заметят. */
    private function notifyModerators(Clinic $clinic): void
    {
        User::query()
            ->where('status', 'active')
            ->whereNotIn('role', ['user', 'clinic_owner'])
            ->get()
            ->filter(fn (User $user) => $user->hasPermission('admin.moderation'))
            ->each(fn (User $user) => UserNotification::query()->create([
                'user_id' => $user->id,
                'type' => 'moderation_request',
                'title' => 'Филиал ждёт модерации',
                'body' => "«{$clinic->name}» отправлен на проверку.",
                'url' => route('admin.moderation', ['type' => 'clinic']),
            ]));
    }

    /**
     * Подсказка, каких пунктов хватит, чтобы дотянуть профиль до порога модерации.
     *
     * @param  array{percent: int, missing: list<array{label: string, weight: int}>}  $readiness
     */
    private function readinessHint(array $readiness): string
    {
        $needed = [];
        $percent = $readiness['percent'];
        foreach ($readiness['missing'] as $item) {
            if ($percent >= ProfileMetrics::MODERATION_MIN_PERCENT) {
                break;
            }
            $needed[] = Str::lcfirst($item['label'])." (+{$item['weight']}%)";
            $percent += $item['weight'];
        }

        return "Профиль заполнен на {$readiness['percent']}%, для модерации нужно ".ProfileMetrics::MODERATION_MIN_PERCENT.'%. Добавьте: '.implode(', ', $needed).'.';
    }

    /**
     * Публикация одобренного модератором филиала в каталоге.
     * Скрытый модерацией филиал возвращает только админка; скрытый из-за тарифа — владелец после продления.
     */
    public function publish(Request $request, Clinic $clinic, ModerationService $moderation, ClinicSubscriptionService $subscriptions): RedirectResponse
    {
        $this->authorizeBranch($request, $clinic);
        if ($clinic->status === 'hidden') {
            if ($clinic->hidden_reason !== Clinic::HIDDEN_BY_SUBSCRIPTION) {
                return back()->with('error', 'Филиал скрыт модератором. Вернуть его в каталог может только администрация сайта.');
            }
            if ($subscriptions->activeSubscription($clinic) === null) {
                return back()->with('error', 'Филиал скрыт из-за окончания тарифа. Продлите тариф, чтобы снова опубликовать его.');
            }
        } elseif ($clinic->status !== 'approved') {
            return back()->with('error', 'Опубликовать можно только филиал, одобренный модератором.');
        }

        $moderation->publishClinic($clinic);

        return back()->with('success', 'Филиал опубликован в каталоге.');
    }

    // --- график ---------------------------------------------------------

    public function schedule(Request $request): Response
    {
        $branch = $this->branch($request);
        $schedule = $branch->schedule ?? [];

        return $this->render($request, 'Cabinet/Schedule', 'График работы', [
            'days' => collect(Schedule::DAYS)->map(fn ($label, $key) => [
                'key' => $key, 'label' => $label,
                'open' => $schedule[$key]['open'] ?? null, 'close' => $schedule[$key]['close'] ?? null,
                'enabled' => isset($schedule[$key]),
            ])->values(),
            'is_24_7' => $branch->is_24_7,
            'same_day' => $branch->same_day,
        ]);
    }

    public function updateSchedule(Request $request): RedirectResponse
    {
        $branch = $this->branch($request);
        $data = $request->validate([
            'is_24_7' => 'boolean',
            'same_day' => 'boolean',
            'days' => 'required|array',
            'days.*.enabled' => 'boolean',
            'days.*.open' => ['nullable', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'days.*.close' => ['nullable', 'regex:/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/'],
        ], ['days.*.open.regex' => 'Время — в формате ЧЧ:ММ.', 'days.*.close.regex' => 'Время — в формате ЧЧ:ММ.']);

        app(ContentRevisionService::class)->trackPostModeration($branch, 'schedule', $request->user());

        $schedule = [];
        foreach (array_keys(Schedule::DAYS) as $key) {
            $d = $data['days'][$key] ?? [];
            if (! empty($data['is_24_7'])) {
                $schedule[$key] = ['open' => '00:00', 'close' => '24:00'];
            } elseif (! empty($d['enabled'])) {
                if (empty($d['open']) || empty($d['close']) || $d['open'] >= $d['close']) {
                    return back()->withErrors(["days.$key.open" => 'Укажите корректное время: открытие раньше закрытия.']);
                }
                $schedule[$key] = ['open' => $d['open'], 'close' => $d['close']];
            }
        }

        $branch->update(['schedule' => $schedule ?: null, 'is_24_7' => (bool) ($data['is_24_7'] ?? false), 'same_day' => (bool) ($data['same_day'] ?? false)]);
        app(ProfileMetrics::class)->recalcClinic($branch);

        return back()->with('success', 'График сохранён.');
    }

    // --------------------------------------------------------------------

    private function authorizeBranch(Request $request, Clinic $clinic): void
    {
        abort_unless($request->attributes->get('branches')->contains('id', $clinic->id), 404);
        $request->session()->put('cabinet_branch', $clinic->id);
        $request->attributes->set('branch', $clinic);
    }
}
