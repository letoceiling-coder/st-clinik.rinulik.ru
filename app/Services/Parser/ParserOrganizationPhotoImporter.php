<?php

namespace App\Services\Parser;

use App\Models\Clinic;
use App\Models\ClinicPhoto;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ParserOrganizationPhotoImporter
{
    private const MAX_PHOTOS = 10;

    /**
     * @param  list<array{url: string, kind: string}>  $photos
     */
    public function import(Clinic $clinic, array $photos, bool $replaceExisting = false): int
    {
        if ($replaceExisting) {
            ClinicPhoto::query()
                ->where('clinic_id', $clinic->id)
                ->where('path', 'like', "clinic-photos/{$clinic->id}/yandex-%")
                ->each(function (ClinicPhoto $photo): void {
                    if ($photo->path) {
                        Storage::disk('public')->delete($photo->path);
                    }
                    $photo->delete();
                });
        }

        $existing = ClinicPhoto::query()->where('clinic_id', $clinic->id)->count();
        $slots = max(0, 30 - $existing);
        if ($slots === 0) {
            return 0;
        }

        $imported = 0;
        foreach (array_slice($photos, 0, min(self::MAX_PHOTOS, $slots)) as $index => $photo) {
            $url = $photo['url'] ?? '';
            if (! is_string($url) || $url === '') {
                continue;
            }

            $path = $this->download($clinic->id, $url);
            if ($path === null) {
                continue;
            }

            ClinicPhoto::create([
                'clinic_id' => $clinic->id,
                'kind' => in_array($photo['kind'] ?? '', ['exterior', 'interior', 'office', 'equipment', 'team'], true)
                    ? $photo['kind']
                    : ($index === 0 ? 'exterior' : 'interior'),
                'caption' => null,
                'path' => $path,
                'status' => 'approved',
                'sort' => ($index + 1) * 10,
            ]);
            $imported++;
        }

        return $imported;
    }

    private function download(int $clinicId, string $url): ?string
    {
        $response = $this->fetch($url, verify: ! config('services.parser_ai.insecure_http'));
        if ($response === null) {
            $response = $this->fetch($url, verify: false);
        }
        if ($response === null || ! $response->successful()) {
            return null;
        }

        $body = $response->body();
        if ($body === '') {
            return null;
        }

        $ext = $this->extension($response->header('Content-Type'), $url);
        $name = 'yandex-'.Str::lower(Str::random(12)).'.'.$ext;
        $path = "clinic-photos/{$clinicId}/{$name}";

        Storage::disk('public')->put($path, $body);

        return $path;
    }

    private function fetch(string $url, bool $verify): ?Response
    {
        try {
            return Http::timeout(90)
                ->withOptions(['verify' => $verify])
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (compatible; StomKlinikImporter/1.0)',
                    'Accept' => 'image/*,*/*;q=0.8',
                ])
                ->get($url);
        } catch (\Throwable $e) {
            if ($verify && str_contains($e->getMessage(), 'SSL certificate')) {
                return null;
            }

            return null;
        }
    }

    private function extension(?string $contentType, string $url): string
    {
        if (is_string($contentType)) {
            if (str_contains($contentType, 'webp')) {
                return 'webp';
            }
            if (str_contains($contentType, 'png')) {
                return 'png';
            }
        }

        $path = parse_url($url, PHP_URL_PATH);
        if (is_string($path) && preg_match('/\.(jpe?g|png|webp)$/i', $path, $m)) {
            return strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
        }

        return 'jpg';
    }
}
