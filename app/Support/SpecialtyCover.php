<?php

namespace App\Support;

use App\Models\Specialty;
use Illuminate\Support\Facades\Storage;

class SpecialtyCover
{
    /** @var array<string, list<string>> */
    private const DEMO_POOLS = [
        'interior' => [
            'images/demo/clinic-interior-01.jpg',
            'images/demo/clinic-interior-02.jpg',
            'images/demo/clinic-interior-03.jpg',
        ],
        'exterior' => [
            'images/demo/clinic-exterior-01.jpg',
            'images/demo/clinic-exterior-02.jpg',
        ],
        'office' => [
            'images/demo/clinic-interior-02.jpg',
            'images/demo/clinic-interior-03.jpg',
        ],
        'equipment' => [
            'images/demo/clinic-equipment-01.jpg',
            'images/demo/clinic-equipment-02.jpg',
        ],
        'team' => [
            'images/demo/clinic-team-01.jpg',
            'images/demo/procedure-01.jpg',
        ],
    ];

    /** @var list<string> */
    private const KINDS = ['interior', 'exterior', 'office', 'equipment', 'team'];

    public static function url(?string $coverPath): ?string
    {
        return $coverPath ? Storage::disk('public')->url($coverPath) : null;
    }

    /**
     * @return array<string, mixed>
     */
    public static function toCard(Specialty $specialty, ?int $clinics = null, ?int $priceFrom = null): array
    {
        return [
            'slug' => $specialty->slug,
            'name' => $specialty->name,
            'short' => $specialty->short,
            'icon' => $specialty->icon,
            'cover_url' => self::url($specialty->cover_path),
            'clinics' => $clinics,
            'price_from' => $priceFrom,
        ];
    }

    public static function seedDemoCover(Specialty $specialty, int $index): ?string
    {
        if ($specialty->cover_path) {
            return $specialty->cover_path;
        }

        $kind = self::KINDS[$index % count(self::KINDS)];
        $pool = self::DEMO_POOLS[$kind] ?? self::DEMO_POOLS['interior'];
        $seed = array_reduce(str_split($specialty->slug), fn (int $acc, string $char) => $acc + ord($char), $index);
        $relative = $pool[abs($seed) % count($pool)];
        $source = public_path($relative);

        if (! is_readable($source)) {
            return null;
        }

        $extension = pathinfo($relative, PATHINFO_EXTENSION) ?: 'jpg';
        $dest = "specialty-covers/{$specialty->slug}.{$extension}";

        Storage::disk('public')->put($dest, (string) file_get_contents($source));

        return $dest;
    }
}
