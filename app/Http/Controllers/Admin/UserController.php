<?php

namespace App\Http\Controllers\Admin;

use App\Models\Role;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class UserController extends AdminController
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q'));
        $role = $request->query('role');
        $status = $request->query('status');

        $users = User::query()
            ->when($q !== '', fn ($b) => $b->where(fn ($w) => $w->where('name', 'like', "%$q%")->orWhere('email', 'like', "%$q%")))
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

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_if($user->id === $request->user()->id, 422, 'Нельзя изменить собственную роль или статус.');
        $data = $request->validate([
            'role' => 'required|exists:roles,slug',
            'status' => 'required|in:active,blocked',
        ]);

        $user->forceFill($data)->save();
        Audit::log('user.updated', $user, $data);

        return back()->with('success', 'Пользователь обновлён.');
    }
}
