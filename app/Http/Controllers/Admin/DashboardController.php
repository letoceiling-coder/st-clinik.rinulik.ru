<?php

namespace App\Http\Controllers\Admin;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\ClinicDocument;
use App\Models\ClinicPhoto;
use App\Models\Doctor;
use App\Models\Lead;
use App\Models\Review;
use App\Models\ReviewComplaint;
use App\Models\User;
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

        return $this->render('Admin/Dashboard', 'Админ-панель', [
            'kpi' => [
                'users' => User::count(),
                'clinics' => Clinic::where('status', 'published')->count(),
                'doctors' => Doctor::where('status', 'published')->count(),
                'reviews' => Review::where('status', 'published')->count(),
                'leads_30d' => Lead::where('created_at', '>=', now()->subDays(30))->count(),
                'complaints' => ReviewComplaint::where('status', 'open')->count(),
            ],
            'queue' => $queue + ['total' => array_sum($queue)],
            'audit' => AuditLog::with('user:id,name')->latest('id')->limit(8)->get()->map(fn ($a) => [
                'id' => $a->id, 'action' => $a->action, 'user' => $a->user?->name ?? 'система',
                'at' => $a->created_at?->format('d.m H:i'),
            ]),
        ]);
    }
}
