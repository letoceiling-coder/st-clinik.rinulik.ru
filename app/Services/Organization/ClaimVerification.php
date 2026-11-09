<?php

namespace App\Services\Organization;

use App\Models\Clinic;
use App\Models\Offer;
use App\Models\User;
use App\Services\Offers\CampaignService;
use App\Services\Offers\SmsSender;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/**
 * Проверка, что карточку забирает сама клиника: SMS-код на мобильный номер из её карточки.
 * Работает и для подключения по КП, и для заявки «Это ваша клиника?».
 * Доступна, только если подключён SMS-шлюз и у клиники есть мобильный номер.
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

    public function phone(Offer|Clinic $target): ?string
    {
        $clinic = $this->clinic($target);

        return $clinic ? $this->campaigns->contactFor($clinic, 'sms') : null;
    }

    public function required(Offer|Clinic $target): bool
    {
        return $this->sms->configured() && $this->phone($target) !== null;
    }

    /** Номер для подсказки на экране: +7 ••• •••-••-25. */
    public function maskedPhone(Offer|Clinic $target): ?string
    {
        $phone = $this->phone($target);

        return $phone ? '+7 ••• •••-••-'.substr($phone, -2) : null;
    }

    public function send(Offer|Clinic $target, User $user): void
    {
        $phone = $this->phone($target) ?? throw new RuntimeException('У клиники нет мобильного номера для подтверждения.');
        $code = (string) random_int(100000, 999999);
        Cache::put($this->key($target, $user), ['hash' => hash('sha256', $code), 'attempts' => 0], now()->addMinutes(self::TTL_MINUTES));
        $this->sms->send($phone, "МирКлиник: код подтверждения {$code}. Никому его не сообщайте.");
    }

    public function verify(Offer|Clinic $target, User $user, string $code): bool
    {
        $state = Cache::get($this->key($target, $user));
        if (! is_array($state)) {
            throw new RuntimeException('Код устарел — запросите новый.');
        }
        if ($state['attempts'] >= self::MAX_ATTEMPTS) {
            Cache::forget($this->key($target, $user));
            throw new RuntimeException('Слишком много попыток — запросите новый код.');
        }
        if (! hash_equals($state['hash'], hash('sha256', trim($code)))) {
            $state['attempts']++;
            Cache::put($this->key($target, $user), $state, now()->addMinutes(self::TTL_MINUTES));

            return false;
        }
        Cache::forget($this->key($target, $user));
        Cache::put($this->verifiedKey($target, $user), true, now()->addMinutes(self::VERIFIED_MINUTES));

        return true;
    }

    public function verified(Offer|Clinic $target, User $user): bool
    {
        return (bool) Cache::get($this->verifiedKey($target, $user), false);
    }

    private function clinic(Offer|Clinic $target): ?Clinic
    {
        if ($target instanceof Clinic) {
            return $target;
        }
        $target->loadMissing('clinic');

        return $target->clinic;
    }

    private function key(Offer|Clinic $target, User $user): string
    {
        return $target instanceof Offer ? "claim-code:{$target->id}:{$user->id}" : "clinic-claim-code:{$target->id}:{$user->id}";
    }

    private function verifiedKey(Offer|Clinic $target, User $user): string
    {
        return $target instanceof Offer ? "claim-verified:{$target->id}:{$user->id}" : "clinic-claim-verified:{$target->id}:{$user->id}";
    }
}
