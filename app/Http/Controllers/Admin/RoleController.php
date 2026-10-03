<?php

namespace App\Http\Controllers\Admin;

use App\Models\Role;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class RoleController extends AdminController
{
    public function index(): Response
    {
        $counts = User::selectRaw('role, count(*) as c')->groupBy('role')->pluck('c', 'role');

        return $this->render('Admin/Roles', 'Роли и права', [
            'roles' => Role::orderBy('is_system', 'desc')->orderBy('name')->get()->map(fn (Role $r) => [
                'slug' => $r->slug, 'name' => $r->name, 'description' => $r->description,
                'permissions' => $r->permissions ?? [], 'is_system' => $r->is_system, 'users' => (int) ($counts[$r->slug] ?? 0),
            ]),
            'catalog' => collect(config('permissions.catalog'))->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values(),
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

        $role = Role::create($data + ['is_system' => false]);
        Audit::log('role.created', null, ['slug' => $role->slug]);

        return back()->with('success', 'Роль создана.');
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        abort_if($role->slug === 'superadmin', 422, 'Права суперадмина не редактируются.');
        $data = $request->validate([
            'name' => 'required|string|max:80',
            'description' => 'nullable|string|max:300',
            'permissions' => 'nullable|array',
            'permissions.*' => 'in:'.implode(',', array_keys(config('permissions.catalog'))),
        ]);

        $role->update($data);
        Audit::log('role.updated', null, ['slug' => $role->slug, 'permissions' => $data['permissions'] ?? []]);

        return back()->with('success', 'Права роли сохранены.');
    }

    public function destroy(Role $role): RedirectResponse
    {
        abort_if($role->is_system, 422, 'Системную роль удалить нельзя.');
        if (User::where('role', $role->slug)->exists()) {
            return back()->with('error', 'Есть пользователи с этой ролью — сначала переназначьте их.');
        }
        $role->delete();
        Audit::log('role.deleted', null, ['slug' => $role->slug]);

        return back()->with('success', 'Роль удалена.');
    }
}
