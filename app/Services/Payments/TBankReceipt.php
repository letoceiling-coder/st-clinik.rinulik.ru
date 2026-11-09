<?php

namespace App\Services\Payments;

use App\Models\Organization;
use App\Models\User;
use App\Services\Monetization\MonetizationSettings;
use Illuminate\Support\Str;

/**
 * Чек 54-ФЗ для онлайн-кассы Т‑Банка: одна позиция «услуга», полная оплата.
 * Тот же состав отправляется и при возврате — банк формирует чек возврата.
 * Если чеки выключены или не указано налогообложение, возвращается null и платёж идёт без чека.
 */
class TBankReceipt
{
    public function __construct(private readonly MonetizationSettings $settings) {}

    public function enabled(): bool
    {
        return $this->settings->receiptsEnabled();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function make(string $name, int $amount, ?User $buyer, ?Organization $organization = null): ?array
    {
        if (! $this->enabled() || $amount <= 0) {
            return null;
        }

        $contact = $this->contact($buyer) ?? $this->contact($organization?->owner);
        if ($contact === null) {
            return null;
        }

        return [
            ...$contact,
            'Taxation' => $this->settings->receiptTaxation(),
            'Items' => [[
                'Name' => Str::limit(trim($name) ?: 'Услуги размещения на сайте', 125, ''),
                'Price' => $amount,
                'Quantity' => 1,
                'Amount' => $amount,
                'Tax' => $this->settings->receiptVat(),
                'PaymentMethod' => 'full_payment',
                'PaymentObject' => 'service',
            ]],
        ];
    }

    /** Куда отправить чек: e-mail, а если его нет — телефон. */
    private function contact(?User $user): ?array
    {
        if ($user === null) {
            return null;
        }
        if (filled($user->email) && ! $user->usesPlaceholderEmail() && filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
            return ['Email' => (string) $user->email];
        }
        $digits = preg_replace('/\D+/', '', (string) $user->phone) ?? '';
        if (strlen($digits) === 11) {
            return ['Phone' => '+7'.substr($digits, 1)];
        }

        return null;
    }
}
