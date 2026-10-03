<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\Lead;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Заявка на запись. Принимаем минимум: имя, телефон, пожелания по времени.
 * Диагнозы и мед. документы не принимаются (SensitiveTextGuard).
 */
class LeadService
{
    public function __construct(private readonly SensitiveTextGuard $guard) {}

    /** @param array<string,mixed> $input */
    public function validate(array $input): array
    {
        $validator = Validator::make($input, [
            'clinic' => ['required', 'string', Rule::exists('clinics', 'slug')->where('status', 'published')],
            'doctor_id' => ['nullable', 'integer', 'exists:doctors,id'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'concern_id' => ['nullable', 'integer', 'exists:concerns,id'],
            'name' => ['required', 'string', 'min:2', 'max:60', "regex:/^[\p{L}\s'\-\.]+$/u"],
            'phone' => ['required', 'string', 'regex:/^\+?[0-9\s\-\(\)]{10,18}$/'],
            'preferred_date' => ['nullable', 'date', 'after_or_equal:today', 'before:+60 days'],
            'preferred_time' => ['nullable', Rule::in(['утро', 'день', 'вечер'])],
            'comment' => ['nullable', 'string', 'max:300'],
            'is_child' => ['boolean'],
            'consent' => ['accepted'],
            'website' => ['prohibited'],
        ], [
            'clinic.required' => 'Выберите клинику.',
            'name.required' => 'Укажите имя.',
            'name.regex' => 'Имя может содержать только буквы.',
            'phone.required' => 'Укажите телефон.',
            'phone.regex' => 'Введите телефон в формате +7 (900) 000-00-00.',
            'preferred_date.after_or_equal' => 'Дата не может быть в прошлом.',
            'preferred_date.before' => 'Запись доступна не далее чем на 60 дней вперёд.',
            'consent.accepted' => 'Необходимо согласие на обработку персональных данных.',
            'comment.max' => 'Комментарий — не более 300 символов.',
        ]);

        $validator->after(function ($v) use ($input) {
            foreach (['comment', 'name'] as $field) {
                if (! empty($input[$field]) && ($message = $this->guard->blockingMessage((string) $input[$field]))) {
                    $v->errors()->add($field, $message);
                }
            }
        });

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $validator->validated();
    }

    /** @param array<string,mixed> $data validated */
    public function create(array $data, ?User $user, string $source = 'clinic_page'): Lead
    {
        $clinic = Clinic::where('slug', $data['clinic'])->firstOrFail();

        $lead = Lead::create([
            'user_id' => $user?->id,
            'clinic_id' => $clinic->id,
            'doctor_id' => $this->doctorBelongs($data['doctor_id'] ?? null, $clinic) ? $data['doctor_id'] : null,
            'service_id' => $data['service_id'] ?? null,
            'concern_id' => $data['concern_id'] ?? null,
            'name' => trim($data['name']),
            'phone' => preg_replace('/\s+/', ' ', trim($data['phone'])),
            'preferred_date' => $data['preferred_date'] ?? null,
            'preferred_time' => $data['preferred_time'] ?? null,
            'comment' => $data['comment'] ?? null,
            'is_child' => (bool) ($data['is_child'] ?? false),
            'source' => $source,
            'status' => 'new',
            'consent_at' => now(),
            'consent_version' => '2026-10',
            'ip_hash' => hash('sha256', (request()->ip() ?? '').config('app.key')),
        ]);

        $owner = $clinic->organization?->owner;
        if ($owner) {
            UserNotification::create([
                'user_id' => $owner->id, 'type' => 'lead_new', 'title' => 'Новая заявка',
                'body' => "Заявка в «{$clinic->name}» от {$lead->name}.", 'url' => '/clinic-cabinet/leads',
            ]);
        }
        if ($user) {
            UserNotification::create([
                'user_id' => $user->id, 'type' => 'lead_status', 'title' => 'Заявка отправлена',
                'body' => "Клиника «{$clinic->name}» свяжется с вами для подтверждения записи.", 'url' => '/account/leads',
            ]);
        }

        return $lead;
    }

    private function doctorBelongs(mixed $doctorId, Clinic $clinic): bool
    {
        return $doctorId && $clinic->doctors()->whereKey($doctorId)->exists();
    }
}
