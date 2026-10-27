<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Контакт, на который КП не отправляются (отписка, жалоба, ручная блокировка). */
class StopListEntry extends Model
{
    public const REASONS = [
        'unsubscribed' => 'Отписался',
        'complaint' => 'Жалоба',
        'bounced' => 'Адрес не существует',
        'manual' => 'Добавлен вручную',
    ];

    protected $guarded = ['id'];

    public static function normalize(string $channel, string $value): string
    {
        $value = trim($value);

        return match ($channel) {
            'email' => mb_strtolower($value),
            'sms', 'phone', 'whatsapp' => '+'.preg_replace('/\D+/', '', $value),
            default => mb_strtolower(rtrim($value, '/')),
        };
    }

    /** SMS, звонок и WhatsApp — один номер: блокировка любого канала блокирует номер целиком. */
    public static function blocks(string $channel, string $value): bool
    {
        $channels = in_array($channel, ['sms', 'phone', 'whatsapp'], true) ? ['sms', 'phone', 'whatsapp'] : [$channel];
        $normalized = self::normalize($channel, $value);

        return self::query()->whereIn('channel', $channels)->where('value', $normalized)->exists();
    }

    public static function add(string $channel, string $value, string $reason, ?int $userId = null, ?string $note = null): self
    {
        return self::query()->firstOrCreate(
            ['channel' => $channel, 'value' => self::normalize($channel, $value)],
            ['reason' => $reason, 'note' => $note, 'created_by' => $userId],
        );
    }
}
