<?php

namespace App\Jobs;

use App\Models\AdminReportExport;
use App\Services\Admin\AdminReportService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class GenerateAdminReportJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $exportId) {}

    public function handle(AdminReportService $reports): void
    {
        $export = AdminReportExport::query()->find($this->exportId);
        if ($export === null || $export->status !== AdminReportExport::STATUS_PENDING) {
            return;
        }

        $reports->generate($export);
    }
}
