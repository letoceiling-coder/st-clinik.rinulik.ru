<?php

namespace App\Http\Controllers\Admin;

use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\ClinicDocument;
use App\Models\ClinicPhoto;
use App\Models\ClinicPromotion;
use App\Models\Doctor;
use App\Models\Lead;
use App\Models\Payment;
use App\Models\Review;
use App\Models\ReviewComplaint;
use App\Models\User;
use App\Services\Offers\DemoCabinetData;
use Inertia\Response;

class DashboardController extends AdminController
{
    public function index(): Response
    {
        $queue = [
            'clinics' => Clinic::where('status', 'pending')->count(),
            'doctors' => Doctor::where('status', 'pending')->count(),
            'photos' => ClinicPhoto::where('status', 'pending')->count(),
            'documents' => ClinicDocument::where('status', 'pending')->count(),
            'reviews' => Review::where('status', 'pending')->count(),
        ];

        $since30 = now()->subDays(30);
        $clinicsByStatus = Clinic::query()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return $this->render('Admin/Dashboard', 'Админ-панель', [
            'kpi' => [
                'users' => User::count(),
                'users_new_30d' => User::where('created_at', '>=', $since30)->count(),
                'clinics' => Clinic::where('status', 'published')->count(),
                'clinics_total' => Clinic::count(),
                'doctors' => Doctor::where('status', 'published')->count(),
                'reviews' => Review::where('status', 'published')->count(),
                'leads_30d' => Lead::where('created_at', '>=', $since30)->where('source', '!=', DemoCabinetData::LEAD_SOURCE)->count(),
                'complaints' => ReviewComplaint::where('status', 'open')->count(),
                'appointments_upcoming' => Appointment::query()
                    ->whereIn('status', Appointment::ACTIVE)
                    ->where('starts_at', '>=', now())
                    ->count(),
                'appointments_30d' => Appointment::where('created_at', '>=', $since30)->count(),
                'revenue_30d' => (int) Payment::query()
                    ->where('status', Payment::STATUS_PAID)
                    ->where('paid_at', '>=', $since30)
                    ->sum('amount'),
                'active_promotions' => ClinicPromotion::query()->active()->count(),
            ],
            'clinics_by_status' => collect(Clinic::STATUSES)->mapWithKeys(fn (string $s) => [
                $s => (int) ($clinicsByStatus[$s] ?? 0),
            ])->all(),
            'queue' => $queue + ['total' => array_sum($queue)],
            // Лента действий сотрудников — только тем, у кого есть доступ к журналу аудита.
            'audit' => ! request()->user()?->hasPermission('admin.audit') ? [] : AuditLog::with('user:id,name')->latest('id')->limit(8)->get()->map(fn ($a) => [
                'id' => $a->id, 'action' => $a->action, 'user' => $a->user?->name ?? 'система',
                'at' => $a->created_at?->format('d.m H:i'),
            ]),
        ]);
    }
}
