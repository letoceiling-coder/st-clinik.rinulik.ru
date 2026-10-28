<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Разделение прав админки: записи, отчёты и аналитика больше не входят во «Вход в админ-панель»,
 * а финансы, тарифы и карта сайта — в «Продвижение». Системные роли получают новые права по умолчанию,
 * пользовательские роли сохраняют прежний доступ. Добавляются роли менеджера, оператора и финансиста.
 */
return new class extends Migration
{
    /** Старое право → права, на которые оно разделилось (для сохранения доступа пользовательских ролей). */
    private const SPLITS = [
        'admin.dashboard' => ['admin.appointments', 'admin.reports', 'admin.analytics'],
        'admin.promotions' => ['admin.tariffs', 'admin.finance', 'admin.site_display'],
    ];

    public function up(): void
    {
        $defaults = config('permissions.defaults');
        $now = now();

        foreach (DB::table('roles')->get() as $role) {
            if (isset($defaults[$role->slug])) {
                DB::table('roles')->where('slug', $role->slug)->update([
                    'name' => $defaults[$role->slug]['name'],
                    'description' => $defaults[$role->slug]['description'],
                    'permissions' => json_encode($defaults[$role->slug]['permissions']),
                    'updated_at' => $now,
                ]);

                continue;
            }

            $permissions = json_decode((string) $role->permissions, true) ?: [];
            foreach (self::SPLITS as $old => $new) {
                if (in_array($old, $permissions, true)) {
                    $permissions = array_values(array_unique(array_merge($permissions, $new)));
                }
            }
            DB::table('roles')->where('slug', $role->slug)->update(['permissions' => json_encode($permissions), 'updated_at' => $now]);
        }

        foreach ($defaults as $slug => $def) {
            if (DB::table('roles')->where('slug', $slug)->exists()) {
                continue;
            }
            DB::table('roles')->insert([
                'slug' => $slug,
                'name' => $def['name'],
                'description' => $def['description'],
                'permissions' => json_encode($def['permissions']),
                'is_system' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('roles')->whereIn('slug', ['sales_manager', 'support_operator', 'finance_manager'])
            ->whereNotIn('slug', DB::table('users')->select('role'))
            ->delete();
    }
};
