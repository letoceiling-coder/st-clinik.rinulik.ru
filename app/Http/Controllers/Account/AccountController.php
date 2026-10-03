<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\HistoryEntry;
use App\Models\Lead;
use App\Models\Review;
use App\Models\UserCollection;
use App\Models\UserNotification;
use App\Services\Audit;
use App\Services\ReviewService;
use App\Services\SensitiveTextGuard;
use App\Services\Seo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Response;

class AccountController extends Controller
{
    public function __construct(private readonly Seo $seo) {}

    private function render(string $component, string $title, array $props = []): Response
    {
        return $this->page($component, $props, $this->seo->private($title));
    }

    public function overview(Request $request): Response
    {
        $u = $request->user();

        return $this->render('Account/Overview', 'Личный кабинет', [
            'counts' => [
                'leads' => Lead::where('user_id', $u->id)->count(),
                'active_leads' => Lead::where('user_id', $u->id)->whereIn('status', ['new', 'confirmed'])->count(),
                'favorites' => UserCollection::where('user_id', $u->id)->where('kind', 'favorite')->count(),
                'compare' => UserCollection::where('user_id', $u->id)->where('kind', 'compare')->count(),
                'reviews' => Review::where('user_id', $u->id)->count(),
                'unread' => $u->notificationsList()->whereNull('read_at')->count(),
            ],
            'leads' => $this->leadRows(Lead::where('user_id', $u->id)->with($this->leadRelations())->latest()->limit(3)->get()),
            'notifications' => $u->notificationsList()->latest()->limit(4)->get(['id', 'title', 'body', 'url', 'read_at', 'created_at'])
                ->map(fn ($n) => $this->notificationRow($n)),
        ]);
    }

    // --- profile --------------------------------------------------------

    public function profile(Request $request, \App\Repositories\Contracts\CatalogRepository $catalog): Response
    {
        $u = $request->user();

        return $this->render('Account/Profile', 'Профиль', [
            'profile' => [
                'name' => $u->name, 'email' => $u->email, 'phone' => $u->phone, 'city_id' => $u->city_id,
                'notify_email' => $u->notify_email, 'notify_leads' => $u->notify_leads,
                'consent_at' => $u->consent_at?->toDateString(), 'consent_version' => $u->consent_version,
            ],
            'cities' => $catalog->cities()->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])->values(),
        ]);
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|min:2|max:80',
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9\s\-\(\)]{10,18}$/'],
            'city_id' => 'nullable|exists:cities,id',
            'notify_email' => 'boolean',
            'notify_leads' => 'boolean',
        ], ['phone.regex' => 'Введите телефон в формате +7 (900) 000-00-00.']);

        $request->user()->update($data);

        return back()->with('success', 'Профиль сохранён.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => 'required|current_password',
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ], ['current_password.current_password' => 'Текущий пароль указан неверно.', 'password.confirmed' => 'Пароли не совпадают.']);

        $request->user()->update(['password' => $data['password']]);
        Audit::log('account.password_changed', $request->user());

        return back()->with('success', 'Пароль изменён.');
    }

    /** Удаление аккаунта и персональных данных; отзывы и заявки обезличиваются. */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate(['password' => 'required|current_password'], ['password.current_password' => 'Пароль указан неверно.']);
        $user = $request->user();
        abort_if($user->role !== 'user', 403, 'Аккаунт сотрудника удаляется администратором.');

        Audit::log('account.deleted', $user, ['email_hash' => hash('sha256', $user->email)]);
        Lead::where('user_id', $user->id)->update(['name' => 'Удалено', 'phone' => '—', 'comment' => null, 'user_id' => null]);
        Review::where('user_id', $user->id)->update(['author_name' => 'Пациент', 'user_id' => null]);

        Auth::logout();
        $user->delete();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/')->with('success', 'Аккаунт и персональные данные удалены.');
    }

    // --- leads ----------------------------------------------------------

    public function leads(Request $request): Response
    {
        $status = $request->query('status');
        $leads = Lead::where('user_id', $request->user()->id)
            ->with($this->leadRelations())
            ->when($status && isset(Lead::STATUSES[$status]), fn ($q) => $q->where('status', $status))
            ->latest()->paginate(10)->withQueryString();

        return $this->render('Account/Leads', 'Заявки и записи', [
            'leads' => $leads->through(fn (Lead $l) => $this->mapLead($l))->toArray(),
            'statuses' => Lead::STATUSES,
            'filters' => array_filter(['status' => $status]),
        ]);
    }

    public function cancelLead(Request $request, Lead $lead): RedirectResponse
    {
        abort_unless($lead->user_id === $request->user()->id, 403);
        abort_unless(in_array($lead->status, ['new', 'confirmed'], true), 422);
        $lead->update(['status' => 'cancelled']);

        return back()->with('success', 'Заявка отменена.');
    }

    /** @return list<string> */
    private function leadRelations(): array
    {
        return ['clinic:id,name,slug,address,phone', 'doctor:id,name,slug', 'service:id,name'];
    }

    /** @return list<array<string,mixed>> */
    private function leadRows($leads): array
    {
        return $leads->map(fn (Lead $l) => $this->mapLead($l))->values()->all();
    }

    /** @return array<string,mixed> */
    private function mapLead(Lead $l): array
    {
        return [
            'id' => $l->id,
            'status' => $l->status,
            'status_label' => Lead::STATUSES[$l->status] ?? $l->status,
            'clinic' => $l->clinic ? ['name' => $l->clinic->name, 'slug' => $l->clinic->slug, 'address' => $l->clinic->address, 'phone' => $l->clinic->phone] : null,
            'doctor' => $l->doctor ? ['name' => $l->doctor->name, 'slug' => $l->doctor->slug] : null,
            'service' => $l->service?->name,
            'preferred_date' => $l->preferred_date?->toDateString(),
            'preferred_time' => $l->preferred_time,
            'created_at' => $l->created_at?->format('Y-m-d H:i'),
            'can_cancel' => in_array($l->status, ['new', 'confirmed'], true),
            'can_review' => in_array($l->status, ['confirmed', 'completed'], true),
        ];
    }

    // --- favorites / compare (ids; items загружаются через API) ----------

    public function favorites(Request $request): Response
    {
        return $this->render('Account/Favorites', 'Избранное');
    }

    public function compare(Request $request): Response
    {
        return $this->render('Account/Compare', 'Сравнение');
    }

    // --- history --------------------------------------------------------

    public function history(Request $request): Response
    {
        $entries = HistoryEntry::where('user_id', $request->user()->id)->latest('created_at')->latest('id')->limit(60)->get();

        $clinics = Clinic::whereIn('id', $entries->where('entity_type', 'clinic')->pluck('entity_id'))->get(['id', 'name', 'slug', 'address'])->keyBy('id');
        $doctors = Doctor::whereIn('id', $entries->where('entity_type', 'doctor')->pluck('entity_id'))->get(['id', 'name', 'slug', 'position'])->keyBy('id');

        $rows = $entries->map(function ($e) use ($clinics, $doctors) {
            $base = ['id' => $e->id, 'type' => $e->type, 'at' => $e->created_at?->format('Y-m-d H:i')];
            if ($e->type === 'search') {
                return $base + ['label' => $e->query, 'url' => '/search?q='.urlencode((string) $e->query), 'kind' => 'Поиск'];
            }
            if ($e->entity_type === 'clinic' && ($c = $clinics->get($e->entity_id))) {
                return $base + ['label' => $c->name, 'sub' => $c->address, 'url' => route('clinics.show', $c->slug), 'kind' => 'Клиника'];
            }
            if ($e->entity_type === 'doctor' && ($d = $doctors->get($e->entity_id))) {
                return $base + ['label' => $d->name, 'sub' => $d->position, 'url' => route('doctors.show', $d->slug), 'kind' => 'Врач'];
            }

            return null;
        })->filter()->values();

        return $this->render('Account/History', 'История', ['entries' => $rows]);
    }

    public function clearHistory(Request $request): RedirectResponse
    {
        HistoryEntry::where('user_id', $request->user()->id)->delete();

        return back()->with('success', 'История очищена.');
    }

    // --- reviews --------------------------------------------------------

    public function reviews(Request $request): Response
    {
        $rows = Review::where('user_id', $request->user()->id)->with(['clinic:id,name,slug', 'doctor:id,name'])->latest()->get()
            ->map(fn (Review $r) => [
                'id' => $r->id, 'rating' => $r->rating, 'title' => $r->title, 'body' => $r->body,
                'status' => $r->status, 'moderation_note' => $r->moderation_note,
                'is_verified_visit' => $r->is_verified_visit, 'visit_date' => $r->visit_date?->toDateString(),
                'created_at' => $r->created_at?->toDateString(),
                'clinic' => $r->clinic ? ['name' => $r->clinic->name, 'slug' => $r->clinic->slug] : null,
                'reply' => $r->reply_text,
            ]);

        return $this->render('Account/Reviews', 'Мои отзывы', ['reviews' => $rows]);
    }

    public function updateReview(Request $request, Review $review, SensitiveTextGuard $guard): RedirectResponse
    {
        abort_unless($review->user_id === $request->user()->id, 403);
        abort_unless(in_array($review->status, ['pending', 'rejected'], true), 422, 'Опубликованный отзыв нельзя редактировать — удалите его и напишите новый.');

        $data = $request->validate([
            'rating' => 'required|integer|between:1,5',
            'title' => 'nullable|string|max:100',
            'body' => 'required|string|min:40|max:3000',
        ], ['body.min' => 'Отзыв слишком короткий — опишите визит подробнее (от 40 символов).']);

        $review->update($data + [
            'status' => 'pending',
            'moderation_note' => null,
            'flags' => $guard->reviewFlags(($data['title'] ?? '').' '.$data['body']) ?: null,
        ]);

        return back()->with('success', 'Отзыв отправлен на повторную проверку.');
    }

    public function deleteReview(Request $request, Review $review, \App\Services\ProfileMetrics $metrics): RedirectResponse
    {
        abort_unless($review->user_id === $request->user()->id, 403);
        $clinic = $review->clinic;
        $doctor = $review->doctor;
        $review->delete();
        $metrics->recalcClinic($clinic);
        if ($doctor) {
            $metrics->recalcDoctor($doctor);
        }

        return back()->with('success', 'Отзыв удалён.');
    }

    // --- notifications --------------------------------------------------

    public function notifications(Request $request): Response
    {
        $items = $request->user()->notificationsList()->latest()->paginate(15)->withQueryString();

        return $this->render('Account/Notifications', 'Уведомления', [
            'notifications' => $items->through(fn ($n) => $this->notificationRow($n))->toArray(),
        ]);
    }

    public function readNotification(Request $request, UserNotification $notification): RedirectResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403);
        $notification->update(['read_at' => now()]);

        return back();
    }

    public function readAllNotifications(Request $request): RedirectResponse
    {
        $request->user()->notificationsList()->whereNull('read_at')->update(['read_at' => now()]);

        return back()->with('success', 'Все уведомления прочитаны.');
    }

    private function notificationRow($n): array
    {
        return [
            'id' => $n->id, 'title' => $n->title, 'body' => $n->body, 'url' => $n->url,
            'read' => $n->read_at !== null, 'at' => $n->created_at?->format('Y-m-d H:i'),
        ];
    }
}
