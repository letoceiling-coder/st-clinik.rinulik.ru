<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\ClinicDocument;
use App\Models\ClinicPhoto;
use App\Models\Doctor;
use App\Models\Review;
use App\Models\UserNotification;
use InvalidArgumentException;

/** Единая точка решений модерации: клиники, врачи, фото, документы, отзывы. */
class ModerationService
{
    public const TYPES = ['clinic', 'doctor', 'photo', 'document', 'review'];

    public function __construct(private readonly ProfileMetrics $metrics) {}

    public function decide(string $type, int $id, string $decision, ?string $note = null): void
    {
        if (! in_array($decision, ['approve', 'reject'], true)) {
            throw new InvalidArgumentException('Unknown decision');
        }
        $approve = $decision === 'approve';

        match ($type) {
            'clinic' => $this->clinic(Clinic::findOrFail($id), $approve, $note),
            'doctor' => $this->doctor(Doctor::with('clinic')->findOrFail($id), $approve, $note),
            'photo' => $this->photo(ClinicPhoto::with('clinic')->findOrFail($id), $approve),
            'document' => $this->document(ClinicDocument::with('clinic')->findOrFail($id), $approve, $note),
            'review' => $this->review(Review::with(['clinic', 'doctor'])->findOrFail($id), $approve, $note),
            default => throw new InvalidArgumentException('Unknown type'),
        };

        Audit::log("moderation.$type.$decision", null, ['id' => $id, 'note' => $note]);
    }

    private function clinic(Clinic $clinic, bool $approve, ?string $note): void
    {
        $clinic->update(['status' => $approve ? 'published' : 'rejected', 'moderation_note' => $approve ? null : $note]);
        $this->metrics->recalcClinic($clinic);
        $this->notifyOwner($clinic, $approve ? 'Филиал опубликован' : 'Филиал отклонён', $approve
            ? "«{$clinic->name}» прошёл модерацию и доступен в каталоге."
            : "«{$clinic->name}» не прошёл модерацию. ".($note ?? ''));
    }

    private function doctor(Doctor $doctor, bool $approve, ?string $note): void
    {
        $doctor->update(['status' => $approve ? 'published' : 'rejected', 'moderation_note' => $approve ? null : $note]);
        $this->metrics->recalcClinic($doctor->clinic);
        $this->notifyOwner($doctor->clinic, $approve ? 'Врач опубликован' : 'Врач отклонён', $approve
            ? "Профиль {$doctor->name} опубликован."
            : "Профиль {$doctor->name} отклонён. ".($note ?? ''));
    }

    private function photo(ClinicPhoto $photo, bool $approve): void
    {
        $photo->update(['status' => $approve ? 'approved' : 'rejected']);
        $this->metrics->recalcClinic($photo->clinic);
    }

    private function document(ClinicDocument $doc, bool $approve, ?string $note): void
    {
        $doc->update(['status' => $approve ? 'approved' : 'rejected', 'reviewer_note' => $note]);

        if ($doc->type === 'license' && $doc->clinic) {
            $doc->clinic->update(['is_verified' => $approve
                ? true
                : ClinicDocument::where('clinic_id', $doc->clinic_id)->where('type', 'license')->where('status', 'approved')->exists()]);
        }
        $this->metrics->recalcClinic($doc->clinic);
        $this->notifyOwner($doc->clinic, $approve ? 'Документ подтверждён' : 'Документ отклонён', "«{$doc->title}»: ".($approve ? 'проверка пройдена.' : ($note ?: 'проверка не пройдена.')));
    }

    private function review(Review $review, bool $approve, ?string $note): void
    {
        $review->update([
            'status' => $approve ? 'published' : 'rejected',
            'published_at' => $approve ? ($review->published_at ?? now()) : null,
            'moderation_note' => $approve ? null : $note,
        ]);
        $this->metrics->recalcClinic($review->clinic);
        if ($review->doctor) {
            $this->metrics->recalcDoctor($review->doctor);
        }

        if ($review->user_id) {
            UserNotification::create([
                'user_id' => $review->user_id, 'type' => 'review_moderated',
                'title' => $approve ? 'Отзыв опубликован' : 'Отзыв не прошёл модерацию',
                'body' => $approve ? 'Спасибо, ваш отзыв доступен на странице клиники.' : ($note ?: 'Отзыв нарушает правила публикации.'),
                'url' => $approve ? route('clinics.show', $review->clinic->slug) : '/account/reviews',
            ]);
        }
    }

    /** Скрыть опубликованный отзыв (по жалобе) либо вернуть. */
    public function hideReview(Review $review, bool $hide, ?string $note = null): void
    {
        $review->update(['status' => $hide ? 'hidden' : 'published', 'moderation_note' => $hide ? $note : null]);
        $this->metrics->recalcClinic($review->clinic);
        if ($review->doctor) {
            $this->metrics->recalcDoctor($review->doctor);
        }
    }

    private function notifyOwner(?Clinic $clinic, string $title, string $body): void
    {
        $ownerId = $clinic?->organization?->owner_id;
        if ($ownerId) {
            UserNotification::create(['user_id' => $ownerId, 'type' => 'moderation', 'title' => $title, 'body' => trim($body), 'url' => '/clinic-cabinet']);
        }
    }
}
