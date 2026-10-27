<?php

namespace App\Console\Commands;

use App\Models\Specialty;
use App\Support\SpecialtyCover;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class SeedSpecialtyCovers extends Command
{
    protected $signature = 'specialties:seed-covers {--force : Replace existing cover files}';

    protected $description = 'Copy demo cover images into storage for specialties without a cover';

    public function handle(): int
    {
        $force = (bool) $this->option('force');
        $updated = 0;

        foreach (Specialty::query()->orderBy('sort')->orderBy('id')->get() as $index => $specialty) {
            if ($specialty->cover_path && ! $force) {
                continue;
            }

            if ($force && $specialty->cover_path) {
                Storage::disk('public')->delete($specialty->cover_path);
                $specialty->cover_path = null;
            }

            $path = SpecialtyCover::seedDemoCover($specialty, $index);
            if ($path === null) {
                $this->warn("Skip {$specialty->slug}: demo source missing");

                continue;
            }

            $specialty->update(['cover_path' => $path]);
            $updated++;
        }

        $this->info("Specialty covers updated: {$updated}");

        return self::SUCCESS;
    }
}
