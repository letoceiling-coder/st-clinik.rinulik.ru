<?php

namespace App\Support;

use App\Models\Clinic;
use Illuminate\Support\Collection;

/** Короткие офферы для полоски акций на карточке клиники в каталоге. */
class ClinicCardPromos
{
    private const CONSULT_SLUG_MARKERS = ['konsult', 'consult', 'priem'];

    /**
     * @return list<array{id: string, title: string, slug: string|null}>
     */
    public static function forClinic(Clinic $clinic): array
    {
        /** @var Collection<int, array{id: string, title: string, slug: string|null}> $offers */
        $offers = collect();
        $seen = [];

        $push = function (string $id, string $title, ?string $slug = null) use (&$offers, &$seen): void {
            $key = mb_strtolower(trim($title));
            if ($key === '' || isset($seen[$key])) {
                return;
            }
            $seen[$key] = true;
            $offers->push(['id' => $id, 'title' => $title, 'slug' => $slug]);
        };

        if ($clinic->relationLoaded('cardPromos')) {
            foreach ($clinic->cardPromos as $post) {
                $push('post-'.$post->id, $post->title, $post->slug);
            }
        }

        if ($clinic->relationLoaded('cardOfferServices')) {
            $rows = $clinic->cardOfferServices;

            if ($rows->contains(fn ($cs) => self::isFreeConsult($cs))) {
                $push('free-consult', 'Бесплатная консультация', 'besplatnaya-konsultaciya');
            }

            if ($rows->contains(fn ($cs) => (bool) $cs->is_promo)) {
                $push('treatment-discount', 'Скидка на лечение', 'skidka-na-lechenie');
            }
        }

        if ($clinic->has_partial_payment) {
            $push('cashback', 'Кешбэк при первой оплате', 'keshbek-pervaya-oplata');
        }

        return $offers->take(3)->values()->all();
    }

    private static function isFreeConsult(object $clinicService): bool
    {
        if ((int) $clinicService->price_from !== 0) {
            return false;
        }

        if (! $clinicService->relationLoaded('service') || ! $clinicService->service) {
            return true;
        }

        $slug = mb_strtolower($clinicService->service->slug);

        foreach (self::CONSULT_SLUG_MARKERS as $marker) {
            if (str_contains($slug, $marker)) {
                return true;
            }
        }

        return false;
    }
}
