<?php

namespace App\Http\Controllers\Admin;

use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Review;
use App\Models\Role;
use App\Models\User;
use App\Services\Audit;
use App\Support\AuditActions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Response;

class UserController extends AdminController
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q'));
        $role = $request->query('role');
        $status = $request->query('status');

        $users = User::query()
            ->when($q !== '', fn ($b) => $b->where(fn ($w) => $w->whereLike('name', "%$q%")->orWhereLike('email', "%$q%")))
            ->when($role, fn ($b) => $b->where('role', $role))
            ->when($status, fn ($b) => $b->where('status', $status))
            ->orderByDesc('id')->paginate(20)->withQueryString();

        return $this->render('Admin/Users', 'Пользователи', [
            'users' => $users->through(fn (User $u) => [
                'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'role' => $u->role, 'status' => $u->status,
                'last_login_at' => $u->last_login_at?->format('d.m.Y H:i'), 'created_at' => $u->created_at?->format('d.m.Y'),
            ])->toArray(),
            'roles' => Role::orderBy('name')->get(['slug', 'name']),
            'filters' => array_filter(['q' => $q, 'role' => $role, 'status' => $status]),
        ]);
    }

    public function show(User $user): Response
    {
        return $this->render('Admin/UserShow', $user->name, [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'status' => $user->status,
                'created_at' => $user->created_at?->format('d.m.Y H:i'),
                'last_login_at' => $user->last_login_at?->format('d.m.Y H:i'),
            ],
            'stats' => [
                'reviews' => Review::where('user_id', $user->id)->count(),
                'appointments' => Appointment::where('user_id', $user->id)->count(),
            ],
            'reviews' => Review::where('user_id', $user->id)->latest()->limit(10)->get()->map(fn (Review $r) => [
                'id' => $r->id,
                'rating' => $r->rating,
                'status' => $r->status,
                'created_at' => $r->created_at?->format('d.m.Y'),
            ]),
            'appointments' => Appointment::where('user_id', $user->id)->with('clinic:id,name')->latest('starts_at')->limit(10)->get()->map(fn (Appointment $a) => [
                'id' => $a->id,
                'starts_at' => $a->starts_at?->format('d.m.Y H:i'),
                'status' => $a->status,
                'clinic' => $a->clinic?->name,
            ]),
            'audit' => AuditLog::where('user_id', $user->id)->latest('id')->limit(15)->get()->map(fn (AuditLog $a) => [
                'action' => AuditActions::label($a->action),
                'at' => $a->created_at?->format('d.m.Y H:i'),
            ]),
            // Только роли, которые этот сотрудник вправе назначить.
            'roles' => Role::orderBy('name')->get(['slug', 'name', 'permissions'])
                ->filter(fn (Role $r) => request()->user()->canGrant($r->permissions ?? []))
                ->map(fn (Role $r) => ['slug' => $r->slug, 'name' => $r->name])
                ->values(),
            'canEdit' => request()->user()->canGrant($user->permissions()) && request()->user()->id !== $user->id,
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_if($user->id === $request->user()->id, 422, 'Нельзя изменить собственную роль или статус.');
        $data = $request->validate([
            'role' => 'required|exists:roles,slug',
            'status' => 'required|in:active,blocked',
        ]);

        // Нельзя назначить роль шире собственных прав и нельзя трогать сотрудника с правами шире своих (например, суперадмина).
        $actor = $request->user();
        $newRole = Role::query()->find($data['role']);
        abort_unless($actor->canGrant($user->permissions()), 403, 'Изменить этого пользователя может только сотрудник с не меньшими правами.');
        if (! $actor->canGrant($newRole?->permissions ?? [])) {
            throw ValidationException::withMessages(['role' => 'Можно назначать только роли, права которых есть у вас самих.']);
        }

        $user->forceFill($data)->save();
        Audit::log('user.updated', $user, $data);

        return back()->with('success', 'Пользователь обновлён.');
    }
}
