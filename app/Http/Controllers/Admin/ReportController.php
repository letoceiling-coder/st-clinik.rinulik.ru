<?php

namespace App\Http\Controllers\Admin;

use App\Jobs\GenerateAdminReportJob;
use App\Models\AdminReportExport;
use App\Services\Admin\AdminReportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends AdminController
{
    public function index(Request $request): Response
    {
        $exports = AdminReportExport::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (AdminReportExport $e) => [
                'id' => $e->id,
                'report_type' => $e->report_type,
                'label' => AdminReportService::TYPES[$e->report_type] ?? $e->report_type,
                'status' => $e->status,
                'ready_at' => $e->ready_at?->format('d.m.Y H:i'),
                'created_at' => $e->created_at?->format('d.m.Y H:i'),
                'error' => $e->error,
                'format' => $e->format ?? AdminReportExport::FORMAT_CSV,
                'download_url' => $e->isReady() ? route('admin.reports.download', $e) : null,
            ]);

        return $this->render('Admin/Reports', 'Отчёты', [
            'types' => AdminReportService::TYPES,
            'formats' => [
                AdminReportExport::FORMAT_CSV => 'CSV (Excel, UTF-8)',
                AdminReportExport::FORMAT_XLSX => 'XLSX',
            ],
            'exports' => $exports,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'report_type' => ['required', Rule::in(array_keys(AdminReportService::TYPES))],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'status' => ['nullable', 'string', 'max:32'],
            'format' => ['nullable', Rule::in(AdminReportExport::FORMATS)],
        ]);

        $filters = array_filter([
            'from' => $data['from'] ?? null,
            'to' => $data['to'] ?? null,
            'status' => $data['status'] ?? null,
        ]);

        $export = AdminReportExport::query()->create([
            'user_id' => $request->user()->id,
            'report_type' => $data['report_type'],
            'format' => $data['format'] ?? AdminReportExport::FORMAT_CSV,
            'status' => AdminReportExport::STATUS_PENDING,
            'filters' => $filters ?: null,
        ]);

        GenerateAdminReportJob::dispatch($export->id);

        return back()->with('success', 'Отчёт поставлен в очередь — уведомим, когда файл будет готов.');
    }

    public function download(Request $request, AdminReportExport $export): StreamedResponse
    {
        abort_unless(
            (int) $export->user_id === (int) $request->user()->id || $request->user()->role === 'superadmin',
            403,
        );
        abort_unless($export->isReady() && $export->file_path, 404);
        abort_unless(Storage::disk('local')->exists($export->file_path), 404);

        $ext = str_ends_with((string) $export->file_path, '.xlsx') ? 'xlsx' : 'csv';
        $filename = $export->report_type.'-'.$export->id.'.'.$ext;

        return Storage::disk('local')->download($export->file_path, $filename);
    }
}
