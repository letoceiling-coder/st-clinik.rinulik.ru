<?php

namespace App\Http\Resources;

use App\Support\Schedule;
use Illuminate\Http\Request;

/** Полная карточка клиники (страница клиники). */
class ClinicDetailResource extends ClinicResource
{
    public function toArray(Request $request): array
    {
        $c = $this->resource;
        $base = parent::toArray($request);

        $prices = $c->clinicServices->groupBy(fn ($cs) => $cs->service->specialty?->name ?? 'Прочее')
            ->map(fn ($items, $group) => [
                'group' => $group,
                'items' => $items->sortBy('price_from')->map(fn ($cs) => [
                    'id' => $cs->service_id,
                    'name' => $cs->service->name,
                    'slug' => $cs->service->slug,
                    'description' => $cs->service->description,
                    'duration_min' => $cs->service->duration_min,
                    'price_from' => $cs->price_from,
                    'price_to' => $cs->price_to,
                    'is_promo' => (bool) $cs->is_promo,
                ])->values(),
            ])->values();

        return array_merge($base, [
            'description' => $c->description,
            'email' => $c->email,
            'website' => $c->website,
            'founded_year' => $c->founded_year,
            'lat' => $c->lat,
            'lng' => $c->lng,
            'restrictions' => $c->restrictions,
            'achievements' => $c->achievements ?? [],
            'specialties' => $c->specialties->map(fn ($s) => ['name' => $s->name, 'slug' => $s->slug])->values(),
            'organization' => $c->organization ? ['name' => $c->organization->name, 'legal_name' => $c->organization->legal_name] : null,
            'license' => [
                'number' => $c->license_number,
                'issuer' => $c->license_issuer,
                'date' => $c->license_date?->toDateString(),
                'confirmed' => $c->documents->where('type', 'license')->where('status', 'approved')->isNotEmpty(),
            ],
            'documents' => $c->documents->map(fn ($d) => [
                'type' => $d->type, 'title' => $d->title, 'number' => $d->number, 'issued_at' => $d->issued_at?->toDateString(),
            ])->values(),
            'week' => Schedule::week($c->schedule),
            'photos' => $c->photos->map(fn ($p) => [
                'kind' => $p->kind, 'caption' => $p->caption, 'art_seed' => $p->art_seed, 'url' => $p->path ? asset('storage/'.$p->path) : null,
            ])->values(),
            'doctors' => $c->doctors->map(fn ($d) => DoctorResource::make($d)->resolve($request))->values(),
            'prices' => $prices,
            'payment_methods' => $c->payment_methods ?? [],
        ]);
    }
}
