<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\ClinicDocument;
use App\Models\ClinicPhoto;
use App\Models\Doctor;
use App\Models\Review;
use App\Models\UserNotification;
use App\Services\Organization\ClinicStaffNotifier;
use App\Support\ClinicNotificationEvents;
use InvalidArgumentException;

/** Единая точка решений модерации: клиники, врачи, фото, документы, отзывы. */
class ModerationService
{
    public const TYPES = ['clinic', 'doctor', 'photo', 'document', 'review', 'review_reply'];

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
            'review_reply' => $this->reviewReply(Review::with(['clinic', 'user'])->findOrFail($id), $approve, $note),
            default => throw new InvalidArgumentException('Unknown type'),
        };

        Audit::log("moderation.$type.$decision", null, ['id' => $id, 'note' => $note]);
    }

    private function clinic(Clinic $clinic, bool $approve, ?string $note): void
    {
        abort_unless(in_array($clinic->status, ['pending', 'draft'], true), 422, 'Модерация доступна только для черновика или заявки на проверку.');

        $clinic->update(['status' => $approve ? 'approved' : 'rejected', 'moderation_note' => $approve ? null : $note]);
        $this->metrics->recalcClinic($clinic);
        $this->notifyOwner($clinic, $approve ? 'Филиал одобрен' : 'Филиал отклонён', $approve
            ? "«{$clinic->name}» прошёл модерацию. Опубликуйте карточку в кабинете, когда будете готовы."
            : "«{$clinic->name}» не прошёл модерацию. ".($note ?? ''));
    }

    /** Публикация в каталоге после одобления модерации. */
    public function publishClinic(Clinic $clinic): void
    {
        abort_unless(in_array($clinic->status, ['approved', 'hidden'], true), 422, 'Опубликовать можно только одобренный или скрытый филиал.');

        $clinic->update(['status' => 'published', 'moderation_note' => null]);
        $this->metrics->recalcClinic($clinic);
        $this->notifyOwner($clinic, 'Филиал опубликован', "«{$clinic->name}» доступен в каталоге.");
        Audit::log('moderation.clinic.published', $clinic);
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

        if ($approve && $review->clinic?->organization) {
            app(ClinicStaffNotifier::class)->notify(
                $review->clinic->organization,
                ClinicNotificationEvents::REVIEW,
                'review_published',
                'Отзыв опубликован',
                "{$review->author_name} · {$review->rating}★ — можно ответить в кабинете.",
                '/clinic-cabinet/reviews?branch='.$review->clinic_id,
            );
        }
    }

    private function reviewReply(Review $review, bool $approve, ?string $note): void
    {
        abort_unless($review->reply_status === 'pending', 422, 'Ответ не ожидает модерации.');

        if ($approve) {
            $review->update([
                'reply_status' => 'published',
                'reply_at' => $review->reply_at ?? now(),
                'reply_moderation_note' => null,
            ]);

            if ($review->user_id) {
                UserNotification::create([
                    'user_id' => $review->user_id,
                    'type' => 'review_reply',
                    'title' => 'Клиника ответила на ваш отзыв',
                    'body' => 'Клиника «'.$review->clinic->name.'» опубликовала ответ.',
                    'url' => route('clinics.show', $review->clinic->slug),
                ]);
            }

            return;
        }

        $review->update([
            'reply_status' => 'rejected',
            'reply_moderation_note' => $note,
        ]);

        $this->notifyOwner(
            $review->clinic,
            'Ответ на отзыв отклонён',
            'Модератор не опубликовал ответ. '.($note ?? 'Исправьте текст и отправьте снова.'),
        );
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
        $organization = $clinic?->organization;
        if ($organization === null) {
            return;
        }

        app(ClinicStaffNotifier::class)->notify(
            $organization,
            ClinicNotificationEvents::MODERATION,
            'moderation',
            $title,
            $body,
            '/clinic-cabinet/branches'.($clinic ? '?branch='.$clinic->id : ''),
        );
    }
}
