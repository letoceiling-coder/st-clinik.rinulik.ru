<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\BookingController;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\AppointmentBookingService;
use App\Services\Seo;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class AppointmentController extends Controller
{
    public function __construct(
        private readonly AppointmentBookingService $booking,
        private readonly Seo $seo,
    ) {}

    public function index(Request $request): Response
    {
        $scope = $request->query('scope') === 'past' ? 'past' : 'upcoming';

        $appointments = Appointment::query()
            ->where('user_id', $request->user()->id)
            ->with(['clinic:id,slug,name,address,phone', 'doctor:id,slug,name,position', 'service:id,name'])
            ->when(
                $scope === 'upcoming',
                fn ($q) => $q->where('starts_at', '>=', now()->startOfDay())->whereIn('status', Appointment::ACTIVE)->orderBy('starts_at'),
                fn ($q) => $q->where(fn ($w) => $w->where('starts_at', '<', now()->startOfDay())->orWhereNotIn('status', Appointment::ACTIVE))->orderByDesc('starts_at'),
            )
            ->paginate(10)
            ->withQueryString();

        return $this->page('Account/Appointments', [
            'appointments' => $appointments->through(fn (Appointment $a) => BookingController::payload($a))->toArray(),
            'scope' => $scope,
            'counts' => [
                'upcoming' => Appointment::query()->where('user_id', $request->user()->id)->where('starts_at', '>=', now()->startOfDay())->active()->count(),
            ],
        ], $this->seo->private('Мои записи'));
    }

    public function cancel(Request $request, Appointment $appointment): RedirectResponse
    {
        $this->authorizePatient($request, $appointment);
        abort_unless($appointment->canBeCancelledByPatient(), 422, 'Эту запись уже нельзя отменить.');
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:300']]);

        $this->booking->changeStatus($appointment, 'cancelled', $request->user(), 'patient', $data['reason'] ?? null);

        return back()->with('success', 'Запись отменена.');
    }

    public function reschedule(Request $request, Appointment $appointment): RedirectResponse
    {
        $this->authorizePatient($request, $appointment);
        $data = $request->validate([
            'starts_at' => ['required', 'date_format:Y-m-d H:i', 'after:now'],
            'comment' => ['nullable', 'string', 'max:300'],
        ], ['starts_at.required' => 'Выберите новое время.']);

        $this->booking->requestReschedule($appointment, Carbon::parse($data['starts_at']), $request->user(), $data['comment'] ?? null);

        return back()->with('success', 'Запрос на перенос отправлен. Клиника подтвердит новое время.');
    }

    private function authorizePatient(Request $request, Appointment $appointment): void
    {
        abort_unless($appointment->user_id === $request->user()->id, 403);
    }
}
