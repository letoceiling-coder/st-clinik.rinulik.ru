<?php

namespace App\Jobs;

use App\Models\Clinic;
use App\Services\Parser\ParserOrganizationPhotoImporter;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ImportParsedOrganizationPhotos implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 600;

    /**
     * @param  list<array{url: string, kind: string}>  $photos
     */
    public function __construct(public int $clinicId, public array $photos)
    {
        $this->afterCommit();
    }

    public function handle(ParserOrganizationPhotoImporter $importer): void
    {
        $clinic = Clinic::query()->find($this->clinicId);
        if ($clinic === null) {
            return;
        }

        $importer->import($clinic, $this->photos, replaceExisting: true);
    }
}
