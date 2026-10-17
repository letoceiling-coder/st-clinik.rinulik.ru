<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\ClinicPhoto;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/** Проставляет файлы демо-фото клиникам, у которых в БД только art_seed без path. */
class ClinicPhotoPathBackfillSeeder extends Seeder
{
    /** @var list<string> */
    private const FILES = [
        'clinic-exterior-01.jpg',
        'clinic-exterior-02.jpg',
        'clinic-interior-01.jpg',
        'clinic-interior-02.jpg',
        'clinic-interior-03.jpg',
        'clinic-equipment-01.jpg',
        'clinic-team-01.jpg',
    ];

    public function run(): void
    {
        Clinic::query()->published()->orderBy('id')->each(function (Clinic $clinic): void {
            $photos = ClinicPhoto::query()
                ->where('clinic_id', $clinic->id)
                ->where('status', 'approved')
                ->orderBy('sort')
                ->get();

            if ($photos->isEmpty()) {
                $this->seedPhotos($clinic);

                return;
            }

            foreach ($photos as $index => $photo) {
                if ($photo->path) {
                    continue;
                }

                $file = self::FILES[$index % count(self::FILES)];
                $path = $this->copyDemoImage($clinic->id, $file);
                if ($path) {
                    $photo->update(['path' => $path]);
                }
            }
        });
    }

    private function seedPhotos(Clinic $clinic): void
    {
        $captions = [
            ['exterior', 'Фасад клиники'],
            ['interior', 'Кабинет'],
            ['interior', 'Зона ожидания'],
            ['equipment', 'Оборудование'],
        ];

        foreach (array_slice(self::FILES, 0, 4) as $i => $file) {
            [$kind, $caption] = $captions[$i] ?? ['interior', 'Фото клиники'];
            ClinicPhoto::query()->create([
                'clinic_id' => $clinic->id,
                'kind' => $kind,
                'caption' => $caption,
                'path' => $this->copyDemoImage($clinic->id, $file),
                'art_seed' => ($i + 1) * 4,
                'status' => 'approved',
                'sort' => ($i + 1) * 10,
            ]);
        }
    }

    private function copyDemoImage(int $clinicId, string $file): ?string
    {
        $source = public_path('images/demo/'.$file);
        if (! is_file($source) || ! $this->isValidImageFile($source)) {
            return null;
        }

        $path = "clinic-photos/{$clinicId}/{$file}";
        Storage::disk('public')->makeDirectory("clinic-photos/{$clinicId}");
        if (! Storage::disk('public')->exists($path)) {
            Storage::disk('public')->put($path, (string) file_get_contents($source));
        }

        return $path;
    }

    private function isValidImageFile(string $path): bool
    {
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($path);

        return in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true);
    }
}
