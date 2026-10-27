<?php

namespace App\Services\Max;

use App\Models\Appointment;
use App\Models\User;
use App\Services\AppointmentBookingService;
use App\Services\Auth\SocialAuthService;
use Illuminate\Validation\ValidationException;

class MaxBotAppointmentActions
{
    public function __construct(
        private readonly MaxBotClient $client,
        private readonly SocialAuthService $social,
        private readonly AppointmentBookingService $booking,
        private readonly MaxBotPatientMenu $patientMenu,
    ) {}

    public function handle(int $maxUserId, string $payload): bool
    {
        if (! preg_match('/^appt:(confirm|approve_reschedule|patient_cancel):(\d+)$/', $payload, $matches)) {
            return false;
        }

        $action = $matches[1];
        $appointmentId = (int) $matches[2];

        $user = $this->linkedUser($maxUserId);
        if ($user === null) {
            $this->patientMenu->sendLinkAccountHint($maxUserId);

            return true;
        }

        $appointment = Appointment::query()
            ->with(['clinic.organization'])
            ->find($appointmentId);

        if ($appointment === null) {
            $this->client->sendToUser($maxUserId, 'Запись не найдена.');

            return true;
        }

        try {
            match ($action) {
                'confirm' => $this->confirm($maxUserId, $user, $appointment),
                'approve_reschedule' => $this->approveReschedule($maxUserId, $user, $appointment),
                'patient_cancel' => $this->patientCancel($maxUserId, $user, $appointment),
            };
        } catch (ValidationException $e) {
            $message = collect($e->errors())->flatten()->first() ?? 'Не удалось выполнить действие.';
            $this->client->sendToUser($maxUserId, (string) $message);
        }

        return true;
    }

    private function confirm(int $maxUserId, User $user, Appointment $appointment): void
    {
        if (! $this->ownsClinic($user, $appointment)) {
            $this->client->sendToUser($maxUserId, 'Нет доступа к этой записи.');

            return;
        }

        if ($appointment->status === 'pending' && $appointment->requested_starts_at) {
            $this->approveReschedule($maxUserId, $user, $appointment);

            return;
        }

        if ($appointment->status === 'new') {
            $this->booking->changeStatus($appointment, 'confirmed', $user, 'clinic', 'Подтверждено из MAX');
            $this->client->sendToUser(
                $maxUserId,
                sprintf(
                    "Запись подтверждена.\n\n%s\n%s\n%s",
                    $appointment->clinic->name,
                    $appointment->starts_at->format('d.m.Y H:i'),
                    $appointment->patient_name,
                ),
            );

            return;
        }

        $this->client->sendToUser($maxUserId, 'Эту запись уже нельзя подтвердить в текущем статусе.');
    }

    private function approveReschedule(int $maxUserId, User $user, Appointment $appointment): void
    {
        if (! $this->ownsClinic($user, $appointment)) {
            $this->client->sendToUser($maxUserId, 'Нет доступа к этой записи.');

            return;
        }

        $this->booking->approveReschedule($appointment, $user);

        $appointment->refresh();

        $this->client->sendToUser(
            $maxUserId,
            sprintf(
                "Перенос подтверждён.\n\n%s\nНовое время: %s",
                $appointment->clinic->name,
                $appointment->starts_at->format('d.m.Y H:i'),
            ),
        );
    }

    private function patientCancel(int $maxUserId, User $user, Appointment $appointment): void
    {
        if ($appointment->user_id !== $user->id) {
            $this->client->sendToUser($maxUserId, 'Это не ваша запись.');

            return;
        }

        if (! $appointment->canBeCancelledByPatient()) {
            $this->client->sendToUser($maxUserId, 'Эту запись уже нельзя отменить.');

            return;
        }

        $this->booking->changeStatus($appointment, 'cancelled', $user, 'patient', 'Отменено из MAX');

        $this->client->sendToUser(
            $maxUserId,
            sprintf(
                "Запись отменена.\n\n%s\n%s",
                $appointment->clinic->name,
                $appointment->starts_at->format('d.m.Y H:i'),
            ),
            $this->patientMenu->mainMenuRows(),
        );
    }

    private function linkedUser(int $maxUserId): ?User
    {
        return $this->social->findAccount('max', (string) $maxUserId)?->user;
    }

    private function ownsClinic(User $user, Appointment $appointment): bool
    {
        if ($user->isSuperadmin()) {
            return true;
        }

        $ownerId = $appointment->clinic?->organization?->owner_id;

        return $ownerId !== null && $ownerId === $user->id;
    }
}
