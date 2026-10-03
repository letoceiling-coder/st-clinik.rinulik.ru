<?php

namespace App\Http\Controllers;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\UserCollection;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;

class CollectionController extends Controller
{
    private const LIMIT_COMPARE = 4;

    public function toggle(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'kind' => 'required|in:favorite,compare',
            'entity_type' => 'required|in:clinic,doctor',
            'entity_id' => 'required|integer',
        ]);

        $exists = $this->exists($data['entity_type'], (int) $data['entity_id']);
        abort_unless($exists, 404);

        $key = ['user_id' => $request->user()->id, 'kind' => $data['kind'], 'entity_type' => $data['entity_type'], 'entity_id' => $data['entity_id']];
        $row = UserCollection::where($key)->first();

        if ($row) {
            $row->delete();
        } else {
            if ($data['kind'] === 'compare') {
                $count = UserCollection::where('user_id', $key['user_id'])->where('kind', 'compare')->where('entity_type', $data['entity_type'])->count();
                if ($count >= self::LIMIT_COMPARE) {
                    return back()->with('error', 'В сравнение можно добавить не более '.self::LIMIT_COMPARE.' позиций.');
                }
            }
            UserCollection::create($key);
        }

        return back();
    }

    /** Переносит локальные (гостевые) избранное и сравнение в аккаунт после входа. */
    public function sync(Request $request): RedirectResponse
    {
        $payload = $request->validate([
            'favorite.clinic' => 'array|max:50', 'favorite.clinic.*' => 'integer',
            'favorite.doctor' => 'array|max:50', 'favorite.doctor.*' => 'integer',
            'compare.clinic' => 'array|max:'.self::LIMIT_COMPARE, 'compare.clinic.*' => 'integer',
            'compare.doctor' => 'array|max:'.self::LIMIT_COMPARE, 'compare.doctor.*' => 'integer',
        ]);

        foreach (['favorite', 'compare'] as $kind) {
            foreach (['clinic', 'doctor'] as $type) {
                foreach (($payload[$kind][$type] ?? []) as $id) {
                    if ($this->exists($type, (int) $id)) {
                        UserCollection::firstOrCreate(['user_id' => $request->user()->id, 'kind' => $kind, 'entity_type' => $type, 'entity_id' => $id]);
                    }
                }
            }
        }

        return back();
    }

    private function exists(string $type, int $id): bool
    {
        return $type === 'clinic' ? Clinic::published()->whereKey($id)->exists() : Doctor::published()->whereKey($id)->exists();
    }
}
