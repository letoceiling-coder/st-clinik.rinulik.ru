<?php

namespace App\Http\Controllers\Admin;

use App\Models\Clinic;
use App\Models\DuplicateFlag;
use App\Services\Audit;
use App\Services\ProfileMetrics;
use App\Support\Text;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Response;

class DuplicateController extends AdminController
{
    public function index(): Response
    {
        $clinics = Clinic::whereIn('status', ['published', 'pending', 'draft'])->with('city:id,name')->get();
        $dismissed = DuplicateFlag::where('status', 'dismissed')->get()
            ->map(fn ($f) => min($f->clinic_a_id, $f->clinic_b_id).'-'.max($f->clinic_a_id, $f->clinic_b_id))->flip();

        $pairs = [];
        $buckets = [
            'Совпадает телефон' => fn (Clinic $c) => preg_replace('/\D+/', '', (string) $c->phone) ?: null,
            'Совпадает адрес' => fn (Clinic $c) => $c->address ? $c->city_id.'|'.Text::normalize($c->address) : null,
            'Совпадает название в городе' => fn (Clinic $c) => $c->city_id.'|'.Text::normalize($c->name),
        ];

        foreach ($buckets as $reason => $keyFn) {
            foreach ($clinics->groupBy($keyFn) as $key => $group) {
                if ($key === '' || $group->count() < 2) {
                    continue;
                }
                $items = $group->values();
                for ($i = 0; $i < $items->count(); $i++) {
                    for ($j = $i + 1; $j < $items->count(); $j++) {
                        $a = $items[$i];
                        $b = $items[$j];
                        $id = min($a->id, $b->id).'-'.max($a->id, $b->id);
                        if (isset($dismissed[$id])) {
                            continue;
                        }
                        $pairs[$id]['a'] = $a;
                        $pairs[$id]['b'] = $b;
                        $pairs[$id]['reasons'][] = $reason;
                    }
                }
            }
        }

        $card = fn (Clinic $c) => [
            'id' => $c->id, 'name' => $c->name, 'address' => $c->address, 'phone' => $c->phone, 'city' => $c->city?->name,
            'status' => $c->status, 'reviews_count' => $c->reviews_count, 'doctors_count' => $c->doctors_count, 'slug' => $c->slug,
        ];

        return $this->render('Admin/Duplicates', 'Дубликаты', [
            'pairs' => collect($pairs)->map(fn ($p, $id) => [
                'key' => $id, 'a' => $card($p['a']), 'b' => $card($p['b']), 'reasons' => array_values(array_unique($p['reasons'])),
            ])->values(),
        ]);
    }

    public function dismiss(Request $request): RedirectResponse
    {
        $data = $request->validate(['a' => 'required|exists:clinics,id', 'b' => 'required|exists:clinics,id|different:a']);
        DuplicateFlag::create([
            'clinic_a_id' => min($data['a'], $data['b']), 'clinic_b_id' => max($data['a'], $data['b']),
            'status' => 'dismissed', 'decided_by' => $request->user()->id,
        ]);
        Audit::log('duplicate.dismissed', null, $data);

        return back()->with('success', 'Пара помечена как разные клиники.');
    }

    /** Переносит данные из `remove` в `keep` и удаляет вторую запись. */
    public function merge(Request $request, ProfileMetrics $metrics): RedirectResponse
    {
        $data = $request->validate(['keep' => 'required|exists:clinics,id', 'remove' => 'required|exists:clinics,id|different:keep']);
        $keep = Clinic::findOrFail($data['keep']);
        $remove = Clinic::findOrFail($data['remove']);

        DB::transaction(function () use ($keep, $remove) {
            $existing = $keep->clinicServices()->pluck('service_id')->all();
            $remove->clinicServices()->whereNotIn('service_id', $existing)->update(['clinic_id' => $keep->id]);
            $remove->doctors()->update(['clinic_id' => $keep->id]);
            $remove->photos()->update(['clinic_id' => $keep->id]);
            $remove->documents()->update(['clinic_id' => $keep->id]);
            $remove->reviews()->update(['clinic_id' => $keep->id]);
            $remove->leads()->update(['clinic_id' => $keep->id]);
            $keep->specialties()->syncWithoutDetaching($remove->specialties()->pluck('specialties.id')->all());
            $remove->refresh()->delete();
        });

        $metrics->recalcClinic($keep->refresh());
        Audit::log('duplicate.merged', $keep, ['removed' => $remove->name]);

        return back()->with('success', 'Клиники объединены: данные перенесены в «'.$keep->name.'».');
    }
}
