<?php

namespace App\Http\Controllers\Admin;

use App\Models\Appointment;
use App\Models\City;
use App\Models\Clinic;
use Illuminate\Http\Request;
use Inertia\Response;

class AppointmentController extends AdminController
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q'));
        $status = $request->query('status');
        $cityId = $request->query('city');
        $clinicId = $request->query('clinic');
        $from = $request->query('from');
        $to = $request->query('to');

        $page = Appointment::query()
            ->with(['clinic:id,name,city_id', 'clinic.city:id,name', 'doctor:id,name', 'user:id,name,email'])
            ->when($q !== '', fn ($b) => $b->where(fn ($w) => $w
                ->whereLike('patient_name', "%$q%")
                ->orWhereLike('patient_phone', "%$q%")))
            ->when($status, fn ($b) => $b->where('status', $status))
            ->when($clinicId, fn ($b) => $b->where('clinic_id', $clinicId))
            ->when($cityId, fn ($b) => $b->whereHas('clinic', fn ($c) => $c->where('city_id', $cityId)))
            ->when($from, fn ($b) => $b->whereDate('starts_at', '>=', $from))
            ->when($to, fn ($b) => $b->whereDate('starts_at', '<=', $to))
            ->orderByDesc('starts_at')
            ->paginate(25)
            ->withQueryString();

        return $this->render('Admin/Appointments', 'Записи', [
            'appointments' => $page->through(fn (Appointment $a) => [
                'id' => $a->id,
                'starts_at' => $a->starts_at?->format('d.m.Y H:i'),
                'status' => $a->status,
                'status_label' => Appointment::STATUSES[$a->status] ?? $a->status,
                'patient_name' => $a->patient_name,
                'patient_phone' => $a->patient_phone,
                'clinic' => $a->clinic?->name,
                'city' => $a->clinic?->city?->name,
                'doctor' => $a->doctor?->name,
                'source' => Appointment::SOURCES[$a->source] ?? $a->source,
                'user' => $a->user?->email,
            ])->toArray(),
            'statuses' => Appointment::STATUSES,
            'cities' => City::orderBy('name')->get(['id', 'name']),
            'clinics' => Clinic::query()->orderBy('name')->limit(500)->get(['id', 'name']),
            'filters' => array_filter([
                'q' => $q,
                'status' => $status,
                'city' => $cityId,
                'clinic' => $clinicId,
                'from' => $from,
                'to' => $to,
            ]),
        ]);
    }
}
