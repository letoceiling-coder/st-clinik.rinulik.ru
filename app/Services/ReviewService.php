<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\Lead;
use App\Models\Review;
use App\Models\ReviewComplaint;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ReviewService
{
    public function __construct(private readonly SensitiveTextGuard $guard) {}

    /** @param array<string,mixed> $input */
    public function validate(Clinic $clinic, User $user, array $input): array
    {
        $validator = Validator::make($input, [
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['nullable', 'string', 'max:100'],
            'body' => ['required', 'string', 'min:40', 'max:3000'],
            'visit_date' => ['required', 'date', 'before_or_equal:today', 'after:-3 years'],
            'doctor_id' => ['nullable', 'integer', Rule::exists('doctors', 'id')->where('clinic_id', $clinic->id)],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'rules' => ['accepted'],
            'consent' => ['accepted'],
        ], [
            'rating.required' => 'Поставьте оценку.',
            'body.required' => 'Расскажите о визите.',
            'body.min' => 'Отзыв слишком короткий — опишите визит подробнее (от 40 символов).',
            'visit_date.required' => 'Укажите примерную дату визита.',
            'visit_date.before_or_equal' => 'Дата визита не может быть в будущем.',
            'rules.accepted' => 'Подтвердите, что вы ознакомились с правилами публикации отзывов.',
            'consent.accepted' => 'Необходимо согласие на обработку персональных данных.',
        ]);

        $validator->after(function ($v) use ($clinic, $user) {
            $recent = Review::where('user_id', $user->id)->where('clinic_id', $clinic->id)
                ->where('created_at', '>=', now()->subDays(30))->whereIn('status', ['pending', 'published'])->exists();
            if ($recent) {
                $v->errors()->add('body', 'Вы уже оставляли отзыв об этой клинике за последние 30 дней.');
            }
        });

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $validator->validated();
    }

    /** @param array<string,mixed> $data validated */
    public function create(Clinic $clinic, User $user, array $data): Review
    {
        $text = ($data['title'] ?? '').' '.$data['body'];
        $verified = Lead::where('user_id', $user->id)->where('clinic_id', $clinic->id)->whereIn('status', ['confirmed', 'completed'])->exists();

        $review = Review::create([
            'user_id' => $user->id,
            'clinic_id' => $clinic->id,
            'doctor_id' => $data['doctor_id'] ?? null,
            'service_id' => $data['service_id'] ?? null,
            'rating' => $data['rating'],
            'title' => $data['title'] ?? null,
            'body' => $data['body'],
            'visit_date' => $data['visit_date'],
            'is_verified_visit' => $verified,
            'author_name' => $this->displayName($user->name),
            'status' => 'pending',
            'flags' => $this->guard->reviewFlags($text) ?: null,
            'consent_at' => now(),
        ]);

        UserNotification::create([
            'user_id' => $user->id, 'type' => 'review_pending', 'title' => 'Отзыв на проверке',
            'body' => 'Модератор проверит отзыв в течение 48 часов.', 'url' => '/account/reviews',
        ]);

        return $review;
    }

    public function displayName(string $name): string
    {
        $parts = preg_split('/\s+/u', trim($name)) ?: [];
        $first = $parts[0] ?? 'Пациент';
        $initial = isset($parts[1]) ? ' '.mb_strtoupper(mb_substr($parts[1], 0, 1)).'.' : '';

        return mb_substr($first, 0, 40).$initial;
    }

    public function complain(Review $review, ?User $user, string $role, array $data): ReviewComplaint
    {
        return ReviewComplaint::create([
            'review_id' => $review->id,
            'reporter_id' => $user?->id,
            'reporter_role' => $role,
            'reason' => $data['reason'],
            'comment' => $data['comment'] ?? null,
            'status' => 'open',
        ]);
    }
}
