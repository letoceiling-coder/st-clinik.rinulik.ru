<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $r = $this->resource;

        return [
            'id' => $r->id,
            'rating' => (int) $r->rating,
            'title' => $r->title,
            'body' => $r->body,
            'author_name' => $r->author_name,
            'visit_date' => $r->visit_date?->toDateString(),
            'published_at' => $r->published_at?->toDateString(),
            'is_verified_visit' => (bool) $r->is_verified_visit,
            'helpful_count' => (int) $r->helpful_count,
            'reply' => $r->reply_text ? ['text' => $r->reply_text, 'at' => $r->reply_at?->toDateString()] : null,
            'doctor' => $r->relationLoaded('doctor') && $r->doctor ? ['name' => $r->doctor->name, 'slug' => $r->doctor->slug] : null,
            'service' => $r->relationLoaded('service') && $r->service ? ['name' => $r->service->name] : null,
            'clinic' => $r->relationLoaded('clinic') && $r->clinic ? ['name' => $r->clinic->name, 'slug' => $r->clinic->slug] : null,
        ];
    }
}
