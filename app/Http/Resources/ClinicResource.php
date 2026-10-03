<?php

namespace App\Http\Resources;

use App\Support\Schedule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Карточка клиники для списков, избранного, сравнения и API. */
class ClinicResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $c = $this->resource;
        $services = $c->relationLoaded('clinicServices') ? $c->clinicServices : collect();
        $popular = $services->filter(fn ($s) => $s->relationLoaded('service') && $s->service?->is_popular && $s->price_from > 0)->take(3);
        $top = $popular->count() >= 3 ? $popular : $services->where('price_from', '>', 0)->take(3);

        return [
            'id' => $c->id,
            'slug' => $c->slug,
            'name' => $c->name,
            'tagline' => $c->tagline,
            'address' => $c->address,
            'district' => $c->district?->name,
            'metro' => $c->metro,
            'city' => $c->relationLoaded('city') && $c->city ? ['slug' => $c->city->slug, 'name' => $c->city->name, 'name_in' => $c->city->name_in] : null,
            'phone' => $c->phone,
            'rating' => (float) $c->rating,
            'reviews_count' => (int) $c->reviews_count,
            'doctors_count' => (int) $c->doctors_count,
            'min_price' => $c->min_price,
            'is_verified' => (bool) $c->is_verified,
            'is_24_7' => (bool) $c->is_24_7,
            'accepts_children' => (bool) $c->accepts_children,
            'children_age_from' => $c->children_age_from,
            'same_day' => (bool) $c->same_day,
            'has_installment' => (bool) $c->has_installment,
            'installment_months' => $c->installment_months,
            'accepts_dms' => (bool) $c->accepts_dms,
            'has_sedation' => (bool) $c->has_sedation,
            'has_anesthesia' => (bool) $c->has_anesthesia,
            'has_microscope' => (bool) $c->has_microscope,
            'has_ct' => (bool) $c->has_ct,
            'art_seed' => $c->art_seed,
            'achievements' => array_slice($c->achievements ?? [], 0, 2),
            'license' => [
                'number' => $c->license_number,
                'confirmed' => $c->relationLoaded('documents')
                    ? $c->documents->where('type', 'license')->where('status', 'approved')->isNotEmpty()
                    : (bool) $c->is_verified,
            ],
            'payment_methods' => $c->payment_methods ?? [],
            'today' => Schedule::today($c->schedule, (bool) $c->is_24_7),
            'specialties' => $c->relationLoaded('specialties') ? $c->specialties->take(4)->map(fn ($s) => ['name' => $s->name, 'slug' => $s->slug])->values() : [],
            'top_services' => $top->map(fn ($s) => ['name' => $s->service?->name, 'slug' => $s->service?->slug, 'price_from' => $s->price_from])->values(),
            'doctors_preview' => $c->relationLoaded('doctors') ? $c->doctors->take(3)->map(fn ($d) => [
                'slug' => $d->slug, 'name' => $d->name, 'position' => $d->position, 'art_seed' => $d->art_seed, 'rating' => (float) $d->rating,
            ])->values() : [],
            'photos' => $c->relationLoaded('photos') ? $c->photos->take(3)->map(fn ($p) => [
                'kind' => $p->kind, 'caption' => $p->caption, 'art_seed' => $p->art_seed, 'url' => $p->path ? asset('storage/'.$p->path) : null,
            ])->values() : [],
        ];
    }
}
