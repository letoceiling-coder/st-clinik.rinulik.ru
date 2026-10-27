<?php

namespace App\Services\Parser;

use App\Jobs\ImportParsedOrganizationPhotos;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\OrganizationContact;
use App\Models\ParsedOrganization;
use App\Models\Specialty;
use App\Models\User;
use App\Services\Audit;
use App\Services\ProfileMetrics;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Импорт карточки из промежуточной таблицы в черновик клиники (status=draft, без владельца).
 * Рейтинг и отзывы Яндекса в клинику не переносятся — они остаются в промежуточной таблице.
 */
class ParsedOrganizationImporter
{
    public function __construct(
        private readonly ParserOrganizationMapper $mapper,
        private readonly ProfileMetrics $metrics,
    ) {}

    public function import(ParsedOrganization $parsed, ?User $by = null, bool $withPhotos = true): Clinic
    {
        if (! $parsed->isImportable()) {
            throw new RuntimeException('Карточка уже обработана: «'.ParsedOrganization::STATUSES[$parsed->status].'».');
        }
        if ($parsed->city_id === null) {
            throw new RuntimeException("Город «{$parsed->city_name}» не найден в справочнике. Добавьте город и повторите синхронизацию.");
        }
        if (Clinic::query()->where('yandex_org_id', $parsed->external_id)->exists()) {
            throw new RuntimeException('Клиника с таким id Яндекса уже есть на сайте — отметьте карточку как дубль.');
        }

        $row = $this->mapper->map($parsed->raw ?? []);
        $photos = $row['photos'] !== [] ? $row['photos'] : $this->flatPhotos($parsed->raw ?? []);

        $clinic = DB::transaction(function () use ($parsed, $row, $by): Clinic {
            $clinicData = $row['clinic'];
            unset($clinicData['city_slug'], $clinicData['city_name']);

            $organizationId = $this->networkOrganizationId($parsed) ?? Organization::create([
                'owner_id' => null,
                'name' => $row['organization']['name'],
                'legal_name' => $row['organization']['legal_name'],
                'inn' => $row['organization']['inn'],
                'status' => 'active',
            ])->id;

            $clinic = Clinic::create([
                ...$clinicData,
                'organization_id' => $organizationId,
                'city_id' => $parsed->city_id,
                'slug' => $this->uniqueSlug($clinicData['slug']),
                'address' => $parsed->address ?? $clinicData['address'],
                'phone' => $parsed->phones[0] ?? $clinicData['phone'],
                'website' => $parsed->website,
                'rating' => 0,
                'reviews_count' => 0,
                'status' => 'draft',
                'is_verified' => false,
            ]);

            $specialtyIds = Specialty::query()->whereIn('slug', $row['specialty_slugs'])->pluck('id')->all();
            if ($specialtyIds !== []) {
                $clinic->specialties()->syncWithoutDetaching($specialtyIds);
            }

            OrganizationContact::query()->where('parsed_organization_id', $parsed->id)->update(['clinic_id' => $clinic->id]);

            $parsed->forceFill([
                'status' => 'imported',
                'clinic_id' => $clinic->id,
                'match_clinic_id' => null,
                'match_reason' => null,
                'imported_at' => now(),
                'imported_by' => $by?->id,
            ])->save();

            return $clinic;
        });

        $this->metrics->recalcClinic($clinic);
        if ($withPhotos && $photos !== []) {
            ImportParsedOrganizationPhotos::dispatch($clinic->id, $photos);
        }
        Audit::log('parser.imported', $clinic, ['parsed_organization_id' => $parsed->id, 'name' => $parsed->name]);

        return $clinic;
    }

    /** Если карточка из сети и другой филиал уже импортирован — новая клиника становится филиалом той же организации. */
    private function networkOrganizationId(ParsedOrganization $parsed): ?int
    {
        if ($parsed->group_key === null) {
            return null;
        }

        return ParsedOrganization::query()
            ->where('group_key', $parsed->group_key)
            ->whereKeyNot($parsed->id)
            ->whereNotNull('clinic_id')
            ->with('clinic:id,organization_id')
            ->get()
            ->map(fn (ParsedOrganization $p) => $p->clinic?->organization_id)
            ->filter()
            ->first();
    }

    private function uniqueSlug(string $slug): string
    {
        $base = Str::limit($slug, 180, '');
        $candidate = $base;
        $i = 2;
        while (Clinic::query()->where('slug', $candidate)->exists()) {
            $candidate = "{$base}-{$i}";
            $i++;
        }

        return $candidate;
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return list<array{url: string, kind: string}>
     */
    private function flatPhotos(array $raw): array
    {
        return collect($raw['photoUrls'] ?? [])
            ->filter(fn ($url) => is_string($url) && str_starts_with($url, 'https://'))
            ->reject(fn (string $url) => str_ends_with($url, '/S'))
            ->values()
            ->map(fn (string $url, int $i) => ['url' => $url, 'kind' => $i === 0 ? 'exterior' : 'interior'])
            ->take(10)
            ->all();
    }
}
