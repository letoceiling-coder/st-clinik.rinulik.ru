<?php

namespace App\Services;

use App\Jobs\NotifyClinicOwnerMaxJob;
use App\Models\AnalyticsEvent;
use App\Models\Appointment;
use App\Models\AppointmentStatusChange;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Lead;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\Analytics\AnalyticsTracker;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Organization\ClinicStaffNotifier;
use App\Support\ClinicNotificationEvents;
use Carbon\Carbon;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Создание и изменение записей. Защита от двойной записи: блокировка слота врача,
 * повторная проверка в транзакции и ограничение EXCLUDE в PostgreSQL.
 */
class AppointmentBookingService
{
    public const DEFAULT_DURATION_MINUTES = 30;

    public const CONSENT_VERSION = '2026-10';

    public const SLOT_TAKEN = 'Это время только что заняли. Выберите другое — список слотов обновлён.';

    /** @var array<string, string> */
    private const LEAD_TIME_SLOTS = [
        'утро' => '10:00',
        'день' => '14:00',
        'вечер' => '18:00',
    ];

    public function __construct(private readonly SlotAvailabilityService $slots) {}

    /**
     * Онлайн-запись пациента на свободный слот.
     *
     * @param  array{starts_at: string, doctor_id?: int|null, service_id?: int|null, patient_name: string, patient_phone: string, is_child?: bool, notes?: string|null}  $data
     */
    public function book(Clinic $clinic, array $data, ?User $user = null): Appointment
    {
        $startsAt = Carbon::parse($data['starts_at'])->seconds(0);
        $serviceId = $data['service_id'] ?? null;
        $doctorId = $data['doctor_id'] ?? null;
        $this->ensureBelongsToClinic($clinic, $doctorId, $serviceId);
        $duration = $this->slots->durationFor($clinic, $serviceId);

        if ($doctorId) {
            $candidates = collect([Doctor::query()->findOrFail($doctorId)]);
        } elseif ($this->slots->usesDoctors($clinic)) {
            $candidates = $this->slots->freeDoctorsAt($clinic, $startsAt, $duration);
        } else {
            $candidates = collect([null]);
        }

        foreach ($candidates as $doctor) {
            $appointment = $this->withSlotLock($clinic, $doctor, $startsAt, function () use ($clinic, $doctor, $startsAt, $duration, $data, $serviceId, $user) {
                if (! $this->slots->isAvailable($clinic, $doctor, $startsAt, $duration)) {
                    return null;
                }

                $appointment = Appointment::create([
                    'clinic_id' => $clinic->id,
                    'doctor_id' => $doctor?->id,
                    'service_id' => $serviceId,
                    'user_id' => $user?->id,
                    'patient_name' => trim($data['patient_name']),
                    'patient_phone' => preg_replace('/\s+/', ' ', trim($data['patient_phone'])),
                    'is_child' => (bool) ($data['is_child'] ?? false),
                    'starts_at' => $startsAt,
                    'ends_at' => $startsAt->copy()->addMinutes($duration),
                    'status' => 'new',
                    'source' => 'online',
                    'notes' => $data['notes'] ?? null,
                    'consent_at' => now(),
                    'consent_version' => self::CONSENT_VERSION,
                    'ip_hash' => hash('sha256', (request()->ip() ?? '').config('app.key')),
                ]);
                $this->record($appointment, null, 'new', $user, 'patient');

                return $appointment;
            });

            if ($appointment) {
                $this->notifyClinic($appointment);
                $clinic->loadMissing('city:id,slug');
                app(AnalyticsTracker::class)->track(
                    AnalyticsEvent::EVENT_BOOKING_SUCCESS,
                    ['appointment_id' => $appointment->id, 'clinic_id' => $clinic->id],
                    $clinic->city?->slug,
                );

                return $appointment;
            }
        }

        throw ValidationException::withMessages(['starts_at' => self::SLOT_TAKEN]);
    }

    /** Создать запись по заявке «перезвоните мне» — вручную из кабинета клиники. */
    public function createFromLead(Lead $lead, ?User $creator = null): ?Appointment
    {
        if ($lead->preferred_date === null) {
            return null;
        }

        if ($lead->appointment()->exists()) {
            return $lead->appointment;
        }

        $startsAt = $this->resolveStartFromLead($lead);
        if ($startsAt === null) {
            return null;
        }

        $startsAt = $this->findAvailableSlot($lead->clinic_id, $startsAt, $lead->doctor_id);
        if ($startsAt === null) {
            return null;
        }

        $appointment = Appointment::create([
            'clinic_id' => $lead->clinic_id,
            'doctor_id' => $lead->doctor_id,
            'service_id' => $lead->service_id,
            'lead_id' => $lead->id,
            'user_id' => $lead->user_id,
            'created_by' => $creator?->id,
            'patient_name' => $lead->name,
            'patient_phone' => $lead->phone,
            'is_child' => (bool) $lead->is_child,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->copy()->addMinutes(self::DEFAULT_DURATION_MINUTES),
            'status' => 'new',
            'source' => 'lead',
            'notes' => $lead->comment,
        ]);
        $this->record($appointment, null, 'new', $creator, $creator ? 'clinic' : 'system');

        return $appointment;
    }

    /**
     * Запись, созданная клиникой (телефон, ресепшен). Время — любое, без привязки к сетке слотов.
     *
     * @param  array<string, mixed>  $data
     */
    public function createManual(Clinic $clinic, array $data, ?User $creator = null): Appointment
    {
        $startsAt = Carbon::parse($data['starts_at'])->seconds(0);
        $duration = (int) ($data['duration_minutes'] ?? self::DEFAULT_DURATION_MINUTES);
        $endsAt = $startsAt->copy()->addMinutes(max(15, min($duration, 240)));
        $status = $data['status'] ?? 'confirmed';

        $doctorId = $data['doctor_id'] ?? null;
        $this->ensureBelongsToClinic($clinic, $doctorId, $data['service_id'] ?? null);
        $doctor = $doctorId ? Doctor::query()->find($doctorId) : null;

        $appointment = $this->withSlotLock($clinic, $doctor, $startsAt, function () use ($clinic, $data, $creator, $startsAt, $endsAt, $doctorId, $status) {
            if (in_array($status, Appointment::ACTIVE, true) && $this->hasConflict($clinic->id, $startsAt, $endsAt, $doctorId)) {
                return null;
            }

            $appointment = Appointment::create([
                'clinic_id' => $clinic->id,
                'doctor_id' => $doctorId,
                'service_id' => $data['service_id'] ?? null,
                'lead_id' => null,
                'created_by' => $creator?->id,
                'patient_name' => trim((string) $data['patient_name']),
                'patient_phone' => preg_replace('/\s+/', ' ', trim((string) $data['patient_phone'])),
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'status' => $status,
                'source' => 'manual',
                'notes' => $data['notes'] ?? null,
            ]);
            $this->record($appointment, null, $status, $creator, 'clinic');

            return $appointment;
        });

        return $appointment ?? throw ValidationException::withMessages(['starts_at' => 'На это время уже есть запись. Выберите другое время.']);
    }

    /**
     * Редактирование записи клиникой. Смена времени активной записи — это перенос.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Appointment $appointment, array $data, ?User $actor = null): Appointment
    {
        $startsAt = isset($data['starts_at']) ? Carbon::parse($data['starts_at'])->seconds(0) : $appointment->starts_at;
        $duration = (int) ($data['duration_minutes'] ?? $appointment->starts_at->diffInMinutes($appointment->ends_at));
        $endsAt = $startsAt->copy()->addMinutes(max(15, min($duration, 240)));

        $doctorId = array_key_exists('doctor_id', $data) ? $data['doctor_id'] : $appointment->doctor_id;
        $this->ensureBelongsToClinic(
            $appointment->clinic,
            $doctorId !== $appointment->doctor_id ? $doctorId : null,
            ($data['service_id'] ?? null) !== $appointment->service_id ? ($data['service_id'] ?? null) : null,
        );

        $from = $appointment->status;
        $moved = ! $startsAt->equalTo($appointment->starts_at) || $doctorId !== $appointment->doctor_id;
        $to = $data['status'] ?? $from;
        if ($moved && $to === $from && in_array($from, ['new', 'confirmed', 'pending', 'rescheduled'], true)) {
            $to = 'rescheduled';
        }
        if ($to !== $from && ! $appointment->canTransitionTo($to)) {
            throw ValidationException::withMessages(['status' => $this->transitionError($from, $to)]);
        }

        $doctor = $doctorId ? Doctor::query()->find($doctorId) : null;
        $saved = $this->withSlotLock($appointment->clinic, $doctor, $startsAt, function () use ($appointment, $data, $actor, $startsAt, $endsAt, $doctorId, $from, $to, $moved) {
            if (in_array($to, Appointment::ACTIVE, true) && $this->hasConflict($appointment->clinic_id, $startsAt, $endsAt, $doctorId, $appointment->id)) {
                return false;
            }

            $previousStart = $appointment->starts_at->format('Y-m-d H:i');
            $appointment->update([
                'doctor_id' => $doctorId,
                'service_id' => $data['service_id'] ?? $appointment->service_id,
                'patient_name' => $data['patient_name'] ?? $appointment->patient_name,
                'patient_phone' => $data['patient_phone'] ?? $appointment->patient_phone,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'status' => $to,
                'notes' => array_key_exists('notes', $data) ? $data['notes'] : $appointment->notes,
                'requested_starts_at' => $to === 'pending' ? $appointment->requested_starts_at : null,
                'requested_ends_at' => $to === 'pending' ? $appointment->requested_ends_at : null,
            ]);

            if ($to !== $from || $moved) {
                $this->record($appointment, $from, $to, $actor, 'clinic', null, $moved ? ['from' => $previousStart, 'to' => $startsAt->format('Y-m-d H:i')] : null);
            }

            return true;
        });

        if (! $saved) {
            throw ValidationException::withMessages(['starts_at' => 'На это время уже есть запись.']);
        }

        if ($to !== $from) {
            $this->notifyPatient($appointment);
        }

        return $appointment->fresh();
    }

    /** Смена статуса без изменения времени (подтвердить, отменить, отметить приём). */
    public function changeStatus(Appointment $appointment, string $to, ?User $actor, string $actorType, ?string $comment = null): Appointment
    {
        $from = $appointment->status;
        if (! $appointment->canTransitionTo($to)) {
            throw ValidationException::withMessages(['status' => $this->transitionError($from, $to)]);
        }

        DB::transaction(function () use ($appointment, $from, $to, $actor, $actorType, $comment) {
            $appointment->update([
                'status' => $to,
                'cancel_reason' => $to === 'cancelled' ? $comment : $appointment->cancel_reason,
                'requested_starts_at' => null,
                'requested_ends_at' => null,
            ]);
            $this->record($appointment, $from, $to, $actor, $actorType, $comment);
        });

        if ($actorType === 'patient') {
            $this->notifyClinic($appointment, $to === 'cancelled' ? 'Пациент отменил запись' : null);
        } else {
            $this->notifyPatient($appointment);
        }

        return $appointment->fresh();
    }

    /** Пациент просит перенести запись; клиника подтверждает новое время. */
    public function requestReschedule(Appointment $appointment, Carbon $startsAt, ?User $actor, ?string $comment = null): Appointment
    {
        if (! $appointment->canBeRescheduledByPatient()) {
            throw ValidationException::withMessages(['starts_at' => 'Эту запись уже нельзя перенести.']);
        }

        $startsAt = $startsAt->copy()->seconds(0);
        $duration = (int) $appointment->starts_at->diffInMinutes($appointment->ends_at);
        if (! $this->slots->isAvailable($appointment->clinic, $appointment->doctor, $startsAt, $duration, $appointment->id)) {
            throw ValidationException::withMessages(['starts_at' => self::SLOT_TAKEN]);
        }

        $from = $appointment->status;
        DB::transaction(function () use ($appointment, $startsAt, $duration, $from, $actor, $comment) {
            $appointment->update([
                'status' => 'pending',
                'requested_starts_at' => $startsAt,
                'requested_ends_at' => $startsAt->copy()->addMinutes($duration),
            ]);
            $this->record($appointment, $from, 'pending', $actor, 'patient', $comment, ['requested' => $startsAt->format('Y-m-d H:i')]);
        });

        $this->notifyClinic($appointment, 'Пациент просит перенести запись');

        return $appointment->fresh();
    }

    public function approveReschedule(Appointment $appointment, ?User $actor): Appointment
    {
        if ($appointment->status !== 'pending' || ! $appointment->requested_starts_at) {
            throw ValidationException::withMessages(['status' => 'Запрос на перенос не найден.']);
        }

        $startsAt = $appointment->requested_starts_at->copy();
        $endsAt = $appointment->requested_ends_at ?? $startsAt->copy()->addMinutes(self::DEFAULT_DURATION_MINUTES);

        $saved = $this->withSlotLock($appointment->clinic, $appointment->doctor, $startsAt, function () use ($appointment, $startsAt, $endsAt, $actor) {
            if ($this->hasConflict($appointment->clinic_id, $startsAt, $endsAt, $appointment->doctor_id, $appointment->id)) {
                return false;
            }

            $previous = $appointment->starts_at->format('Y-m-d H:i');
            $appointment->update([
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'status' => 'rescheduled',
                'requested_starts_at' => null,
                'requested_ends_at' => null,
            ]);
            $this->record($appointment, 'pending', 'rescheduled', $actor, 'clinic', null, ['from' => $previous, 'to' => $startsAt->format('Y-m-d H:i')]);

            return true;
        });

        if (! $saved) {
            throw ValidationException::withMessages(['status' => 'Запрошенное время уже занято. Предложите пациенту другое.']);
        }

        $this->notifyPatient($appointment);

        return $appointment->fresh();
    }

    public function rejectReschedule(Appointment $appointment, ?User $actor, ?string $comment = null): Appointment
    {
        if ($appointment->status !== 'pending') {
            throw ValidationException::withMessages(['status' => 'Запрос на перенос не найден.']);
        }

        $previous = $appointment->history()->where('to_status', 'pending')->latest('id')->value('from_status');
        $to = in_array($previous, ['new', 'confirmed', 'rescheduled'], true) ? $previous : 'confirmed';

        DB::transaction(function () use ($appointment, $to, $actor, $comment) {
            $appointment->update(['status' => $to, 'requested_starts_at' => null, 'requested_ends_at' => null]);
            $this->record($appointment, 'pending', $to, $actor, 'clinic', $comment ?: 'Перенос отклонён');
        });

        $this->notifyPatient($appointment);

        return $appointment->fresh();
    }

    public function resolveStartFromLead(Lead $lead): ?Carbon
    {
        if ($lead->preferred_date === null) {
            return null;
        }

        $time = self::LEAD_TIME_SLOTS[$lead->preferred_time ?? ''] ?? '10:00';

        return Carbon::parse($lead->preferred_date->format('Y-m-d').' '.$time);
    }

    public function hasConflict(int $clinicId, Carbon $startsAt, Carbon $endsAt, ?int $doctorId = null, ?int $exceptId = null): bool
    {
        return Appointment::query()
            ->active()
            ->when(
                $doctorId,
                fn ($q) => $q->where('doctor_id', $doctorId),
                fn ($q) => $q->where('clinic_id', $clinicId)->whereNull('doctor_id'),
            )
            ->when($exceptId, fn ($q) => $q->whereKeyNot($exceptId))
            ->where('starts_at', '<', $endsAt)
            ->where('ends_at', '>', $startsAt)
            ->exists();
    }

    /**
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T|null
     */
    private function withSlotLock(Clinic $clinic, ?Doctor $doctor, Carbon $startsAt, callable $callback): mixed
    {
        $key = $doctor
            ? "slot:{$doctor->id}:{$startsAt->toDateString()}"
            : "slot:clinic:{$clinic->id}:{$startsAt->toDateString()}";

        try {
            return Cache::lock($key, 10)->block(5, fn () => DB::transaction($callback));
        } catch (LockTimeoutException) {
            throw ValidationException::withMessages(['starts_at' => 'Слишком много одновременных записей. Попробуйте ещё раз.']);
        } catch (QueryException $e) {
            if (in_array($e->getCode(), ['23P01', '23505'], true)) {
                return null;
            }

            throw $e;
        }
    }

    /** @param  array<string, mixed>|null  $meta */
    private function record(Appointment $appointment, ?string $from, string $to, ?User $user, string $actor, ?string $comment = null, ?array $meta = null): void
    {
        AppointmentStatusChange::create([
            'appointment_id' => $appointment->id,
            'from_status' => $from,
            'to_status' => $to,
            'user_id' => $user?->id,
            'actor' => $actor,
            'comment' => $comment,
            'meta' => $meta,
        ]);

        app(NotificationDispatcher::class)->appointmentStatusChanged($appointment->fresh(), $from, $to);
    }

    private function ensureBelongsToClinic(Clinic $clinic, ?int $doctorId, ?int $serviceId): void
    {
        if ($doctorId && ! $this->slots->doctorWorksAt($clinic, $doctorId) && ! $clinic->doctors()->whereKey($doctorId)->exists()) {
            throw ValidationException::withMessages(['doctor_id' => 'Врач не принимает в этом филиале.']);
        }

        if ($serviceId && ! $clinic->clinicServices()->where('service_id', $serviceId)->exists()) {
            throw ValidationException::withMessages(['service_id' => 'Услуга не оказывается в этом филиале.']);
        }
    }

    private function findAvailableSlot(int $clinicId, Carbon $startsAt, ?int $doctorId): ?Carbon
    {
        $candidate = $startsAt->copy();

        for ($i = 0; $i < 16; $i++) {
            $end = $candidate->copy()->addMinutes(self::DEFAULT_DURATION_MINUTES);
            if (! $this->hasConflict($clinicId, $candidate, $end, $doctorId)) {
                return $candidate;
            }
            $candidate->addMinutes(self::DEFAULT_DURATION_MINUTES);
        }

        return null;
    }

    private function transitionError(string $from, string $to): string
    {
        return sprintf(
            'Нельзя перевести запись из статуса «%s» в «%s».',
            Appointment::STATUSES[$from] ?? $from,
            Appointment::STATUSES[$to] ?? $to,
        );
    }

    private function notifyClinic(Appointment $appointment, ?string $title = null): void
    {
        $clinic = $appointment->clinic;
        $organization = $clinic?->organization;
        if ($organization === null) {
            return;
        }

        app(ClinicStaffNotifier::class)->notify(
            $organization,
            ClinicNotificationEvents::APPOINTMENT,
            'appointment',
            $title ?? 'Новая онлайн-запись',
            sprintf('«%s», %s — %s.', $clinic->name, $appointment->starts_at->format('d.m H:i'), $appointment->patient_name),
            '/clinic-cabinet/calendar?branch='.$clinic->id.'&day='.$appointment->starts_at->toDateString(),
        );

        NotifyClinicOwnerMaxJob::dispatch($appointment->id);
    }

    private function notifyPatient(Appointment $appointment): void
    {
        if (! $appointment->user_id) {
            return;
        }

        UserNotification::create([
            'user_id' => $appointment->user_id,
            'type' => 'appointment',
            'title' => 'Запись: '.mb_strtolower($appointment->statusLabel()),
            'body' => sprintf('«%s», %s.', $appointment->clinic->name, $appointment->starts_at->format('d.m.Y H:i')),
            'url' => '/account/appointments',
        ]);
    }
}
