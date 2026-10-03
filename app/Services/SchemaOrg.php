<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Review;
use App\Support\Schedule;
use Illuminate\Support\Collection;

/**
 * JSON-LD: MedicalClinic / Physician / Review / BreadcrumbList / WebSite.
 * Цена указывается «от» (minPrice) — окончательная стоимость определяется после осмотра.
 */
class SchemaOrg
{
    public function website(): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'WebSite',
            'name' => config('app.name'),
            'url' => url('/'),
            'inLanguage' => 'ru-RU',
            'potentialAction' => [
                '@type' => 'SearchAction',
                'target' => url('/search').'?q={search_term_string}',
                'query-input' => 'required name=search_term_string',
            ],
        ];
    }

    /** @param list<array{0:string,1:string}> $crumbs */
    public function breadcrumbs(array $crumbs): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => collect($crumbs)->values()->map(fn ($c, $i) => [
                '@type' => 'ListItem', 'position' => $i + 1, 'name' => $c[0], 'item' => $c[1],
            ])->all(),
        ];
    }

    /** @param Collection<int,Review> $reviews */
    public function review(Review $r, ?string $itemName = null): array
    {
        return array_filter([
            '@type' => 'Review',
            'name' => $r->title,
            'author' => ['@type' => 'Person', 'name' => $r->author_name],
            'datePublished' => $r->published_at?->toDateString(),
            'reviewBody' => $r->body,
            'reviewRating' => ['@type' => 'Rating', 'ratingValue' => $r->rating, 'bestRating' => 5, 'worstRating' => 1],
            'itemReviewed' => $itemName ? ['@type' => 'MedicalClinic', 'name' => $itemName] : null,
        ]);
    }

    private function aggregate(float $rating, int $count): ?array
    {
        if ($count < 1) {
            return null;
        }

        return ['@type' => 'AggregateRating', 'ratingValue' => round($rating, 1), 'reviewCount' => $count, 'bestRating' => 5, 'worstRating' => 1];
    }

    /** @param Collection<int,Review> $reviews */
    public function clinic(Clinic $c, Collection $reviews): array
    {
        $offers = $c->clinicServices->where('price_from', '>', 0)->take(10)->map(fn ($cs) => [
            '@type' => 'Offer',
            'itemOffered' => ['@type' => 'MedicalProcedure', 'name' => $cs->service->name],
            'priceSpecification' => ['@type' => 'PriceSpecification', 'minPrice' => $cs->price_from, 'priceCurrency' => 'RUB'],
        ])->values()->all();

        return array_filter([
            '@context' => 'https://schema.org',
            '@type' => ['MedicalClinic', 'Dentist'],
            '@id' => route('clinics.show', $c->slug).'#clinic',
            'name' => $c->name,
            'url' => route('clinics.show', $c->slug),
            'description' => $c->tagline,
            'telephone' => $c->phone,
            'medicalSpecialty' => 'https://schema.org/Dentistry',
            'isAcceptingNewPatients' => true,
            'address' => [
                '@type' => 'PostalAddress',
                'streetAddress' => $c->address,
                'addressLocality' => $c->city?->name,
                'addressRegion' => $c->city?->region,
                'addressCountry' => 'RU',
            ],
            'geo' => $c->lat && $c->lng ? ['@type' => 'GeoCoordinates', 'latitude' => $c->lat, 'longitude' => $c->lng] : null,
            'openingHoursSpecification' => $c->is_24_7
                ? [['@type' => 'OpeningHoursSpecification', 'dayOfWeek' => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], 'opens' => '00:00', 'closes' => '23:59']]
                : Schedule::openingSpec($c->schedule),
            'priceRange' => $c->min_price ? 'от '.$c->min_price.' ₽' : null,
            'paymentAccepted' => implode(', ', $c->payment_methods ?? []),
            'makesOffer' => $offers ?: null,
            'employee' => $c->doctors->take(6)->map(fn ($d) => ['@type' => 'Physician', 'name' => $d->name, 'url' => route('doctors.show', $d->slug)])->values()->all() ?: null,
            'aggregateRating' => $this->aggregate((float) $c->rating, (int) $c->reviews_count),
            'review' => $reviews->take(5)->map(fn ($r) => $this->review($r))->values()->all() ?: null,
        ]);
    }

    /** @param Collection<int,Review> $reviews */
    public function doctor(Doctor $d, Collection $reviews): array
    {
        return array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'Physician',
            '@id' => route('doctors.show', $d->slug).'#physician',
            'name' => $d->name,
            'url' => route('doctors.show', $d->slug),
            'jobTitle' => $d->position,
            'description' => $d->bio,
            'medicalSpecialty' => 'https://schema.org/Dentistry',
            'knowsAbout' => $d->specialties->pluck('name')->all() ?: null,
            'telephone' => $d->clinic?->phone,
            'worksFor' => $d->clinic ? [
                '@type' => 'MedicalClinic', 'name' => $d->clinic->name, 'url' => route('clinics.show', $d->clinic->slug),
                'address' => ['@type' => 'PostalAddress', 'streetAddress' => $d->clinic->address, 'addressLocality' => $d->clinic->city?->name, 'addressCountry' => 'RU'],
            ] : null,
            'aggregateRating' => $this->aggregate((float) $d->rating, (int) $d->reviews_count),
            'review' => $reviews->take(5)->map(fn ($r) => $this->review($r))->values()->all() ?: null,
        ]);
    }

    /** @param list<array{name:string,url:string}> $items */
    public function itemList(array $items): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'ItemList',
            'itemListElement' => collect($items)->values()->map(fn ($it, $i) => [
                '@type' => 'ListItem', 'position' => $i + 1, 'name' => $it['name'], 'url' => $it['url'],
            ])->all(),
        ];
    }
}
