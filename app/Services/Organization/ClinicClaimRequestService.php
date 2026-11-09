<?php

namespace App\Services\Organization;

use App\Models\Clinic;
use App\Models\ClinicClaimRequest;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\Audit;
use App\Services\Monetization\ClinicTrialService;
use App\Services\PlatformStaffNotifier;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * «Это ваша клиника?»: представитель забирает карточку без владельца.
 * SMS-код на номер из карточки передаёт права сразу; иначе заявку с документом проверяет модератор.
 */
class ClinicClaimRequestService
{
    public function __construct(
        private readonly OrganizationClaimService $claims,
        private readonly ClinicTrialService $trials,
        private readonly PlatformStaffNotifier $staff,
    ) {}

    public function pendingFor(Clinic $clinic, User $user): ?ClinicClaimRequest
    {
        return ClinicClaimRequest::query()->pending()
            ->where('clinic_id', $clinic->id)->where('user_id', $user->id)->latest('id')->first();
    }

    /**
     * @param  array{position: string, phone: string, comment?: string|null}  $data
     */
    public function submit(Clinic $clinic, User $user, array $data, ?UploadedFile $document): ClinicClaimRequest
    {
        $reason = $this->claims->reasonFor($clinic, $user);
        if ($reason !== null) {
            throw new RuntimeException($reason);
        }

        $previous = $this->pendingFor($clinic, $user);
        $path = $document?->store("claim-requests/{$clinic->id}", 'local');

        $request = DB::transaction(function () use ($clinic, $user, $data, $path, $previous): ClinicClaimRequest {
            // Повторная отправка обновляет ту же заявку, а не плодит дубли в очереди модерации.
            if ($previous !== null) {
                if ($path !== null && $previous->document_path) {
                    Storage::disk('local')->delete($previous->document_path);
                }
                $previous->update([
                    'position' => $data['position'],
                    'phone' => $data['phone'],
                    'comment' => $data['comment'] ?? null,
                    'document_path' => $path ?? $previous->document_path,
                    'agreement_version' => $this->trials->agreementVersion(),
                    'consent_at' => now(),
                ]);

                return $previous;
            }

            return ClinicClaimRequest::query()->create([
                'clinic_id' => $clinic->id,
                'user_id' => $user->id,
                'position' => $data['position'],
                'phone' => $data['phone'],
                'comment' => $data['comment'] ?? null,
                'document_path' => $path,
                'status' => ClinicClaimRequest::STATUS_PENDING,
                'agreement_version' => $this->trials->agreementVersion(),
                'consent_at' => now(),
            ]);
        });

        Audit::log('clinic.claim_requested', $clinic, ['user_id' => $user->id, 'request_id' => $request->id]);
        if ($previous === null) {
            $this->staff->notify(
                'admin.moderation',
                'clinic_claim',
                'Заявка на права на клинику',
                "Представитель просит доступ к карточке «{$clinic->name}». Проверьте документ и решите в очереди модерации.",
                '/admin/moderation',
            );
        }

        return $request;
    }

    /** Код из SMS на номер карточки подтверждает, что заявитель — сама клиника: права передаются без модератора. */
    public function claimBySms(Clinic $clinic, User $user): void
    {
        $this->claims->claimClinic($clinic, $user);
        $this->afterTransfer($clinic->fresh(['organization']), $user);
        $this->closeOthers($clinic, null, 'Права на карточку подтверждены по SMS.');
        Audit::log('clinic.claimed_by_sms', $clinic, ['user_id' => $user->id]);
    }

    public function approve(ClinicClaimRequest $request, ?User $reviewer): void
    {
        $this->assertPending($request);
        $clinic = $request->clinic()->with('organization')->firstOrFail();
        $user = $request->user()->firstOrFail();

        $reason = $this->claims->reasonFor($clinic, $user);
        if ($reason !== null) {
            throw new RuntimeException('Права передать нельзя: '.$reason);
        }

        $this->claims->claimClinic($clinic, $user);
        $request->update([
            'status' => ClinicClaimRequest::STATUS_APPROVED,
            'reviewed_by' => $reviewer?->id,
            'reviewed_at' => now(),
            'moderation_note' => null,
        ]);
        $this->afterTransfer($clinic->fresh(['organization']), $user);
        $this->closeOthers($clinic, $request, 'Права на карточку переданы другому представителю клиники.');

        UserNotification::query()->create([
            'user_id' => $user->id,
            'type' => 'clinic_claim',
            'title' => 'Доступ к клинике открыт',
            'body' => "Теперь вы управляете карточкой «{$clinic->name}». Изменения публикуются после проверки модератором.",
            'url' => '/clinic-cabinet',
        ]);
        Audit::log('clinic.claim_approved', $clinic, ['request_id' => $request->id, 'user_id' => $user->id]);
    }

    public function reject(ClinicClaimRequest $request, ?User $reviewer, string $note): void
    {
        $this->assertPending($request);
        $request->update([
            'status' => ClinicClaimRequest::STATUS_REJECTED,
            'reviewed_by' => $reviewer?->id,
            'reviewed_at' => now(),
            'moderation_note' => $note,
        ]);
        $this->notifyRejected($request, $note);
        Audit::log('clinic.claim_rejected', $request->clinic, ['request_id' => $request->id]);
    }

    /** Соглашение принято в форме заявки: фиксируем его и запрашиваем пробный период; для карточки на сайте он включается сразу. */
    private function afterTransfer(Clinic $clinic, User $user): void
    {
        $organization = $clinic->organization;
        if ($organization === null) {
            return;
        }
        $requested = $this->trials->request($organization, $clinic, $user);
        if ($requested && in_array($clinic->status, ['approved', 'published', 'hidden'], true)) {
            $this->trials->activateIfRequested($clinic);
        }
    }

    /** Остальные заявки на ту же карточку закрываются с понятной причиной. */
    private function closeOthers(Clinic $clinic, ?ClinicClaimRequest $except, string $note): void
    {
        ClinicClaimRequest::query()->pending()->where('clinic_id', $clinic->id)
            ->when($except, fn ($q) => $q->whereKeyNot($except->id))
            ->get()
            ->each(function (ClinicClaimRequest $other) use ($note): void {
                $other->update(['status' => ClinicClaimRequest::STATUS_REJECTED, 'reviewed_at' => now(), 'moderation_note' => $note]);
                $this->notifyRejected($other, $note);
            });
    }

    private function notifyRejected(ClinicClaimRequest $request, string $note): void
    {
        UserNotification::query()->create([
            'user_id' => $request->user_id,
            'type' => 'clinic_claim',
            'title' => 'Заявка на клинику отклонена',
            'body' => 'Причина: '.$note,
            'url' => $request->clinic ? '/clinics/'.$request->clinic->slug.'/claim' : '/',
        ]);
    }

    private function assertPending(ClinicClaimRequest $request): void
    {
        if ($request->status !== ClinicClaimRequest::STATUS_PENDING) {
            throw new RuntimeException('Заявка уже рассмотрена.');
        }
    }
}
