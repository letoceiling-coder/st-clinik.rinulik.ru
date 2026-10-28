<?php

namespace App\Http\Controllers\Admin;

use App\Models\Role;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Response;

class RoleController extends AdminController
{
    public function index(Request $request): Response
    {
        $actor = $request->user();
        $counts = User::selectRaw('role, count(*) as c')->groupBy('role')->pluck('c', 'role');
        $siteRoles = config('permissions.site_roles', []);

        return $this->render('Admin/Roles', 'Роли и права', [
            'roles' => Role::orderBy('is_system', 'desc')->orderBy('name')->get()->map(fn (Role $r) => [
                'slug' => $r->slug,
                'name' => $r->name,
                'description' => $r->description,
                'permissions' => $r->permissions ?? [],
                'is_system' => $r->is_system,
                'is_site' => in_array($r->slug, $siteRoles, true),
                'users' => (int) ($counts[$r->slug] ?? 0),
                'editable' => $this->canManage($actor, $r),
                'is_own' => $actor->role === $r->slug,
            ]),
            'catalog' => collect(config('permissions.catalog'))->map(fn (array $p, string $key) => [
                'key' => $key,
                'label' => $p['label'],
                'group' => $p['group'],
                'hint' => $p['hint'] ?? null,
                'sensitive' => $p['sensitive'] ?? null,
                'grantable' => $actor->canGrant([$key]),
            ])->values(),
            'groups' => config('permissions.groups'),
            'sensitiveLabels' => config('permissions.sensitive'),
            'isSuperadmin' => $actor->isSuperadmin(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'slug' => 'required|string|max:40|regex:/^[a-z][a-z0-9_]*$/|unique:roles,slug',
            'name' => 'required|string|max:80',
            'description' => 'nullable|string|max:300',
            'permissions' => 'nullable|array',
            'permissions.*' => 'in:'.implode(',', array_keys(config('permissions.catalog'))),
        ], ['slug.regex' => 'Латиница, цифры и «_», начинается с буквы.', 'slug.unique' => 'Роль с таким ключом уже есть.']);

        $this->assertCanGrant($request->user(), $data['permissions'] ?? []);

        $role = Role::create($data + ['is_system' => false]);
        Audit::log('role.created', null, ['slug' => $role->slug, 'permissions' => $data['permissions'] ?? []]);

        return back()->with('success', 'Роль создана.');
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        abort_if($role->slug === 'superadmin', 422, 'Права суперадмина не редактируются.');
        abort_unless($this->canManage($request->user(), $role), 403, 'Эту роль может менять только суперадмин: у неё больше прав, чем у вас, или это ваша роль.');

        $data = $request->validate([
            'name' => 'required|string|max:80',
            'description' => 'nullable|string|max:300',
            'permissions' => 'nullable|array',
            'permissions.*' => 'in:'.implode(',', array_keys(config('permissions.catalog'))),
        ]);

        // Роли сайта (пациент, представитель клиники) в админку не пускают.
        if (in_array($role->slug, config('permissions.site_roles', []), true)) {
            $data['permissions'] = [];
        }

        $this->assertCanGrant($request->user(), $data['permissions'] ?? []);

        $role->update($data);
        Audit::log('role.updated', null, ['slug' => $role->slug, 'permissions' => $data['permissions'] ?? []]);

        return back()->with('success', 'Права роли сохранены.');
    }

    public function destroy(Request $request, Role $role): RedirectResponse
    {
        abort_if($role->is_system, 422, 'Системную роль удалить нельзя.');
        abort_unless($this->canManage($request->user(), $role), 403);
        if (User::where('role', $role->slug)->exists()) {
            return back()->with('error', 'Есть пользователи с этой ролью — сначала переназначьте их.');
        }
        $role->delete();
        Audit::log('role.deleted', null, ['slug' => $role->slug]);

        return back()->with('success', 'Роль удалена.');
    }

    /** Суперадмин управляет любыми ролями; остальные — только чужими ролями не шире собственных прав. */
    private function canManage(User $actor, Role $role): bool
    {
        if ($role->slug === 'superadmin') {
            return false;
        }
        if ($actor->isSuperadmin()) {
            return true;
        }

        return $actor->role !== $role->slug && $actor->canGrant($role->permissions ?? []);
    }

    /** @param  list<string>  $permissions */
    private function assertCanGrant(User $actor, array $permissions): void
    {
        if (! $actor->canGrant($permissions)) {
            throw ValidationException::withMessages([
                'permissions' => 'Можно выдавать только те права, которые есть у вас самих.',
            ]);
        }
    }
}
