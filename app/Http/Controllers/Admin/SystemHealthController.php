<?php

namespace App\Http\Controllers\Admin;

use App\Services\System\SystemHealth;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Response;

class SystemHealthController extends AdminController
{
    public function index(SystemHealth $health): Response
    {
        $checks = $health->checks();

        return $this->render('Admin/SystemHealth', 'Состояние системы', [
            'checks' => $checks,
            'overall' => SystemHealth::overall($checks),
            'checkedAt' => now()->format('d.m.Y H:i:s'),
            'failedJobs' => DB::table('failed_jobs')->latest('failed_at')->limit(10)->get(['id', 'queue', 'failed_at', 'exception'])
                ->map(fn ($job) => [
                    'id' => $job->id,
                    'queue' => $job->queue,
                    'failed_at' => (string) $job->failed_at,
                    'error' => mb_substr(strtok((string) $job->exception, "\n") ?: '', 0, 240),
                ]),
        ]);
    }

    /** Повторить все проверки сразу, без кеша внешних сервисов. */
    public function refresh(SystemHealth $health): RedirectResponse
    {
        $health->checks(fresh: true);

        return back()->with('success', 'Проверки выполнены заново.');
    }
}
