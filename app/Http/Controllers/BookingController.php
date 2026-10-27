<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AppointmentStatusChange;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Rules\RussianPhone;
use App\Services\AppointmentBookingService;
use App\Services\SensitiveTextGuard;
use App\Services\Seo;
use App\Services\SlotAvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;
use Inertia\Response;

/**
 * Пошаговая онлайн-запись: филиал → услуга → врач → дата → время → контакты.
 * Гость управляет записью по подписанной ссылке, пользователь — ещё и в личном кабинете.
 */
class BookingController extends Controller
{
    public function __construct(
        private readonly SlotAvailabilityService $slots,
        private readonly AppointmentBookingService $booking,
        private readonly Seo $seo,
    ) {}

    public function create(Request $request, string $slug): Response
    {
        $clinic = $this->publishedClinic($slug);
        $clinic->load(['city:id,name,slug', 'clinicServices' => fn ($q) => $q->with('service:id,name,duration_min')->orderBy('price_from')]);
        $user = $request->user();

        $branches = $clinic->organization_id
            ? Clinic::query()->published()->where('organization_id', $clinic->organization_id)->orderBy('name')->get(['id', 'slug', 'name', 'address'])
            : collect([$clinic]);

        $doctors = $this->slots->doctorsFor($clinic)->load('specialties:id,name');

        return $this->page('Booking/Create', [
            'clinic' => [
                'id' => $clinic->id,
                'slug' => $clinic->slug,
                'name' => $clinic->name,
                'address' => $clinic->address,
                'phone' => $clinic->phone,
                'city' => $clinic->city ? ['name' => $clinic->city->name, 'slug' => $clinic->city->slug] : null,
            ],
            'branches' => $branches->map(fn (Clinic $b) => ['slug' => $b->slug, 'name' => $b->name, 'address' => $b->address])->values(),
            'services' => $clinic->clinicServices->filter(fn ($cs) => $cs->service)->map(fn ($cs) => [
                'id' => $cs->service_id,
                'name' => $cs->service->name,
                'price_from' => $cs->price_from,
                'price_to' => $cs->price_to,
                'duration' => $cs->duration_min ?: $cs->service->duration_min ?: SlotAvailabilityService::DEFAULT_DURATION,
            ])->values(),
            'doctors' => $doctors->map(fn (Doctor $d) => [
                'id' => $d->id,
                'name' => $d->name,
                'position' => $d->position ?: $d->specialties->pluck('name')->take(2)->implode(', '),
                'experience_years' => (int) $d->experience_years,
                'photo_url' => $d->photo_path ? Storage::disk('public')->url($d->photo_path) : null,
                'art_seed' => $d->art_seed,
            ])->values(),
            'uses_doctors' => $doctors->isNotEmpty(),
            'initial' => [
                'doctor_id' => $doctors->contains('id', $request->integer('doctor')) ? $request->integer('doctor') : null,
                'service_id' => $clinic->clinicServices->contains('service_id', $request->integer('service')) ? $request->integer('service') : null,
            ],
            'patient' => $user ? ['name' => $user->name, 'phone' => $user->phone ?? ''] : null,
            'horizon_days' => SlotAvailabilityService::HORIZON_DAYS,
        ], $this->seo->private('Запись в «'.$clinic->name.'»'));
    }

    public function store(Request $request, string $slug, SensitiveTextGuard $guard): RedirectResponse
    {
        $clinic = $this->publishedClinic($slug);

        $data = $request->validate([
            'service_id' => ['nullable', 'integer'],
            'doctor_id' => ['nullable', 'integer'],
            'starts_at' => ['required', 'date_format:Y-m-d H:i', 'after:now'],
            'patient_name' => ['required', 'string', 'min:2', 'max:60', "regex:/^[\p{L}\s'\-\.]+$/u"],
            'patient_phone' => ['required', 'string', 'max:32', new RussianPhone],
            'is_child' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:300'],
            'consent' => ['accepted'],
            'website' => ['prohibited'],
        ], [
            'starts_at.required' => 'Выберите время приёма.',
            'starts_at.after' => 'Это время уже прошло. Выберите другое.',
            'patient_name.required' => 'Укажите имя.',
            'patient_name.regex' => 'Имя может содержать только буквы.',
            'patient_phone.required' => 'Укажите телефон.',
            'patient_phone.regex' => 'Введите телефон в формате +7 (900) 000-00-00.',
            'notes.max' => 'Комментарий — не более 300 символов.',
            'consent.accepted' => 'Необходимо согласие на обработку персональных данных.',
        ]);

        foreach (['notes', 'patient_name'] as $field) {
            if (! empty($data[$field]) && ($message = $guard->blockingMessage((string) $data[$field]))) {
                throw ValidationException::withMessages([$field => $message]);
            }
        }

        $appointment = $this->booking->book($clinic, $data, $request->user());

        return redirect()->to($this->manageUrl($appointment))
            ->with('success', 'Вы записаны. Клиника подтвердит запись — статус виден на этой странице.');
    }

    public function show(Appointment $appointment): Response
    {
        $appointment->load(['clinic:id,slug,name,address,phone', 'doctor:id,slug,name,position', 'service:id,name', 'history']);

        return $this->page('Booking/Show', [
            'appointment' => self::payload($appointment),
            'history' => $appointment->history->map(fn (AppointmentStatusChange $h) => self::historyRow($h))->values(),
            'cancel_url' => URL::signedRoute('appointments.cancel', $appointment),
            'reschedule_url' => URL::signedRoute('appointments.reschedule', $appointment),
        ], $this->seo->private('Ваша запись'));
    }

    public function cancel(Request $request, Appointment $appointment): RedirectResponse
    {
        abort_unless($appointment->canBeCancelledByPatient(), 422, 'Эту запись уже нельзя отменить.');
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:300']]);

        $this->booking->changeStatus($appointment, 'cancelled', $request->user(), 'patient', $data['reason'] ?? null);

        return back()->with('success', 'Запись отменена.');
    }

    public function reschedule(Request $request, Appointment $appointment): RedirectResponse
    {
        $data = $request->validate([
            'starts_at' => ['required', 'date_format:Y-m-d H:i', 'after:now'],
            'comment' => ['nullable', 'string', 'max:300'],
        ], ['starts_at.required' => 'Выберите новое время.']);

        $this->booking->requestReschedule($appointment, Carbon::parse($data['starts_at']), $request->user(), $data['comment'] ?? null);

        return back()->with('success', 'Запрос на перенос отправлен. Клиника подтвердит новое время.');
    }

    public function manageUrl(Appointment $appointment): string
    {
        return URL::signedRoute('appointments.show', $appointment);
    }

    /** @return array<string, mixed> */
    public static function payload(Appointment $a): array
    {
        return [
            'id' => $a->id,
            'status' => $a->status,
            'status_label' => $a->statusLabel(),
            'starts_at' => $a->starts_at->format('Y-m-d H:i'),
            'ends_at' => $a->ends_at->format('Y-m-d H:i'),
            'requested_starts_at' => $a->requested_starts_at?->format('Y-m-d H:i'),
            'patient_name' => $a->patient_name,
            'patient_phone' => $a->patient_phone,
            'is_child' => (bool) $a->is_child,
            'notes' => $a->notes,
            'cancel_reason' => $a->cancel_reason,
            'can_cancel' => $a->canBeCancelledByPatient(),
            'can_reschedule' => $a->canBeRescheduledByPatient(),
            'clinic' => $a->clinic ? ['slug' => $a->clinic->slug, 'name' => $a->clinic->name, 'address' => $a->clinic->address, 'phone' => $a->clinic->phone] : null,
            'doctor' => $a->doctor ? ['id' => $a->doctor->id, 'slug' => $a->doctor->slug, 'name' => $a->doctor->name, 'position' => $a->doctor->position] : null,
            'service' => $a->service ? ['id' => $a->service->id, 'name' => $a->service->name] : null,
        ];
    }

    /** @return array<string, mixed> */
    public static function historyRow(AppointmentStatusChange $h): array
    {
        return [
            'id' => $h->id,
            'from' => $h->from_status,
            'to' => $h->to_status,
            'to_label' => Appointment::STATUSES[$h->to_status] ?? $h->to_status,
            'actor' => AppointmentStatusChange::ACTORS[$h->actor] ?? $h->actor,
            'comment' => $h->comment,
            'meta' => $h->meta,
            'at' => $h->created_at?->format('d.m.Y H:i'),
        ];
    }

    private function publishedClinic(string $slug): Clinic
    {
        return Clinic::query()->published()->where('slug', $slug)->firstOrFail();
    }
}
