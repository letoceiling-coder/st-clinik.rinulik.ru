<?php

namespace App\Support;

use App\Models\Clinic;
use App\Services\ClinicCardBonusService;
use Illuminate\Support\Collection;

/** Короткие офферы для полоски акций на карточке клиники в каталоге. */
class ClinicCardPromos
{
    private const CONSULT_SLUG_MARKERS = ['konsult', 'consult', 'priem'];

    /**
     * @return list<array{id: string, code?: string, title: string, description?: string, slug: string|null, icon?: string}>
     */
    public static function forClinic(Clinic $clinic): array
    {
        return app(ClinicCardBonusService::class)->stripOffers($clinic);
    }

    public static function isPremium(Clinic $clinic): bool
    {
        return app(ClinicCardBonusService::class)->isPremiumCard($clinic);
    }

    /**
     * Fallback, если клиника ещё не настроила бонусы в ЛК.
     *
     * @return list<array{id: string, code: string, title: string, description: string, slug: string|null, icon: string}>
     */
    public static function legacyStripOffers(Clinic $clinic): array
    {
        /** @var Collection<int, array{id: string, code: string, title: string, description: string, slug: string|null, icon: string}> $offers */
        $offers = collect();
        $seen = [];

        $push = function (string $id, string $code, string $title, string $description, ?string $slug, string $icon) use (&$offers, &$seen): void {
            $key = mb_strtolower(trim($title));
            if ($key === '' || isset($seen[$key])) {
                return;
            }
            $seen[$key] = true;
            $offers->push([
                'id' => $id,
                'code' => $code,
                'title' => $title,
                'description' => $description,
                'slug' => $slug,
                'icon' => $icon,
            ]);
        };

        if ($clinic->relationLoaded('cardPromos')) {
            foreach ($clinic->cardPromos as $post) {
                $push(
                    'post-'.$post->id,
                    'post',
                    $post->title,
                    (string) ($post->excerpt ?: $post->body),
                    $post->slug,
                    'sparkle',
                );
            }
        }

        if ($clinic->relationLoaded('cardOfferServices')) {
            $rows = $clinic->cardOfferServices;

            if ($rows->contains(fn ($cs) => self::isFreeConsult($cs))) {
                $push('free-consult', 'free_consult', 'Бесплатная консультация', 'Консультация стоматолога без оплаты при записи через сайт.', 'besplatnaya-konsultaciya', 'user');
            }

            if ($rows->contains(fn ($cs) => (bool) $cs->is_promo)) {
                $push('treatment-discount', 'treatment_discount', 'Скидка на лечение', 'Специальные условия на план лечения — уточняйте у администратора.', 'skidka-na-lechenie', 'percent');
            }
        }

        if ($clinic->has_partial_payment) {
            $push('cashback', 'cashback', 'Кешбэк при первой оплате', 'Возврат части суммы на бонусный счёт после первого визита.', 'keshbek-pervaya-oplata', 'card');
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
