<?php

namespace App\Http\Resources;

use App\Models\ClinicPromotion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin ClinicPromotion */
class PromotionBannerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->banner_title,
            'clinic_name' => $this->clinic?->name,
            'image_url' => $this->banner_image_path ? Storage::disk('public')->url($this->banner_image_path) : null,
            'click_url' => route('promotions.click', $this->id),
            'impression_url' => route('promotions.impression', $this->id),
        ];
    }
}
