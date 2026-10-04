<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class DoctorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $d = $this->resource;

        return [
            'id' => $d->id,
            'slug' => $d->slug,
            'name' => $d->name,
            'position' => $d->position,
            'experience_years' => (int) $d->experience_years,
            'rating' => (float) $d->rating,
            'reviews_count' => (int) $d->reviews_count,
            'is_verified' => (bool) $d->is_verified,
            'accepts_children' => (bool) $d->accepts_children,
            'children_age_from' => $d->children_age_from,
            'consult_price' => $d->consult_price,
            'art_seed' => $d->art_seed,
            'photo_url' => $d->photo_path ? Storage::disk('public')->url($d->photo_path) : null,
            'achievements' => array_slice($d->achievements ?? [], 0, 2),
            'specialties' => $d->relationLoaded('specialties') ? $d->specialties->map(fn ($s) => ['name' => $s->name, 'slug' => $s->slug])->values() : [],
            'clinic' => $d->relationLoaded('clinic') && $d->clinic ? [
                'id' => $d->clinic->id,
                'slug' => $d->clinic->slug,
                'name' => $d->clinic->name,
                'address' => $d->clinic->address,
                'phone' => $d->clinic->phone,
                'city' => $d->clinic->relationLoaded('city') && $d->clinic->city ? ['slug' => $d->clinic->city->slug, 'name' => $d->clinic->city->name] : null,
                'rating' => (float) $d->clinic->rating,
                'is_verified' => (bool) $d->clinic->is_verified,
                'same_day' => (bool) $d->clinic->same_day,
            ] : null,
        ];
    }
}
