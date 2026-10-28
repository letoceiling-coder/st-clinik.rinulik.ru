<?php

namespace App\Services\Organization;

use App\Models\Offer;
use App\Models\User;
use App\Services\Offers\CampaignService;
use App\Services\Offers\SmsSender;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/**
 * Дополнительная проверка при подключении клиники по КП: SMS-код на мобильный номер клиники из её карточки.
 * Требуется, только если подключён SMS-шлюз и у клиники есть мобильный номер; иначе достаточно подтверждённого email.
 */
class ClaimVerification
{
    private const TTL_MINUTES = 10;

    private const VERIFIED_MINUTES = 30;

    private const MAX_ATTEMPTS = 5;

    public function __construct(
        private readonly SmsSender $sms,
        private readonly CampaignService $campaigns,
    ) {}

    public function phone(Offer $offer): ?string
    {
        $offer->loadMissing('clinic');

        return $offer->clinic ? $this->campaigns->contactFor($offer->clinic, 'sms') : null;
    }

    public function required(Offer $offer): bool
    {
        return $this->sms->configured() && $this->phone($offer) !== null;
    }

    /** Номер для подсказки на экране: +7 ••• •••-••-25. */
    public function maskedPhone(Offer $offer): ?string
    {
        $phone = $this->phone($offer);

        return $phone ? '+7 ••• •••-••-'.substr($phone, -2) : null;
    }

    public function send(Offer $offer, User $user): void
    {
        $phone = $this->phone($offer) ?? throw new RuntimeException('У клиники нет мобильного номера для подтверждения.');
        $code = (string) random_int(100000, 999999);
        Cache::put($this->key($offer, $user), ['hash' => hash('sha256', $code), 'attempts' => 0], now()->addMinutes(self::TTL_MINUTES));
        $this->sms->send($phone, "МирКлиник: код подтверждения {$code}. Никому его не сообщайте.");
    }

    public function verify(Offer $offer, User $user, string $code): bool
    {
        $state = Cache::get($this->key($offer, $user));
        if (! is_array($state)) {
            throw new RuntimeException('Код устарел — запросите новый.');
        }
        if ($state['attempts'] >= self::MAX_ATTEMPTS) {
            Cache::forget($this->key($offer, $user));
            throw new RuntimeException('Слишком много попыток — запросите новый код.');
        }
        if (! hash_equals($state['hash'], hash('sha256', trim($code)))) {
            $state['attempts']++;
            Cache::put($this->key($offer, $user), $state, now()->addMinutes(self::TTL_MINUTES));

            return false;
        }
        Cache::forget($this->key($offer, $user));
        Cache::put($this->verifiedKey($offer, $user), true, now()->addMinutes(self::VERIFIED_MINUTES));

        return true;
    }

    public function verified(Offer $offer, User $user): bool
    {
        return (bool) Cache::get($this->verifiedKey($offer, $user), false);
    }

    private function key(Offer $offer, User $user): string
    {
        return "claim-code:{$offer->id}:{$user->id}";
    }

    private function verifiedKey(Offer $offer, User $user): string
    {
        return "claim-verified:{$offer->id}:{$user->id}";
    }
}
