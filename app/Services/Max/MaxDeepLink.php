<?php

namespace App\Services\Max;

use App\Models\Clinic;

/** Deep-link из start_param бота / Mini App → URL внутри /max. */
class MaxDeepLink
{
    public function url(?string $startParam): ?string
    {
        $startParam = trim((string) $startParam);
        if ($startParam === '') {
            return null;
        }

        if (str_starts_with($startParam, 'login_')) {
            return null;
        }

        if (str_starts_with($startParam, 'clinic_')) {
            $slug = substr($startParam, 7);

            return $slug !== '' ? route('max.clinic', ['slug' => $slug]) : null;
        }

        if (str_starts_with($startParam, 'follow_')) {
            $slug = substr($startParam, 7);

            return $slug !== '' ? route('max.clinic', ['slug' => $slug]) : null;
        }

        if (str_starts_with($startParam, 'city_')) {
            $slug = substr($startParam, 5);

            return $slug !== '' ? route('max.clinics', ['city' => $slug]) : null;
        }

        if (str_starts_with($startParam, 'book_')) {
            $rest = substr($startParam, 5);
            $parts = explode('_', $rest, 2);
            $clinicSlug = $parts[0] ?? '';

            return $clinicSlug !== '' ? route('booking.create', ['slug' => $clinicSlug]) : null;
        }

        if (str_starts_with($startParam, 'offer_')) {
            $token = substr($startParam, 6);

            return $token !== '' ? route('offer.show', ['token' => $token]) : null;
        }

        if (str_starts_with($startParam, 'doctor_')) {
            $slug = substr($startParam, 7);

            return $slug !== '' ? url('/doctors/'.$slug) : null;
        }

        return null;
    }

    public function clinicSlugFromFollow(?string $startParam): ?string
    {
        $startParam = trim((string) $startParam);
        if ($startParam === '') {
            return null;
        }

        if (str_starts_with($startParam, 'follow_')) {
            $slug = substr($startParam, 7);

            return $slug !== '' ? $slug : null;
        }

        if (str_starts_with($startParam, 'clinic_')) {
            $slug = substr($startParam, 7);

            return $slug !== '' ? $slug : null;
        }

        return null;
    }

    public function findPublishedClinic(string $slug): ?Clinic
    {
        return Clinic::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->first();
    }
}
