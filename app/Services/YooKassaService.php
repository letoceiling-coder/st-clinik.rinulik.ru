<?php

namespace App\Services;

use App\Models\PromotionOrder;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class YooKassaService
{
    private const API = 'https://api.yookassa.ru/v3';

    public function configured(): bool
    {
        return filled(config('yookassa.shop_id')) && filled(config('yookassa.secret_key'));
    }

    /** @return array{payment_id: string, payment_url: string|null, meta: array<string,mixed>} */
    public function createPayment(PromotionOrder $order): array
    {
        if (! $this->configured()) {
            throw new \RuntimeException('ЮKassa не настроена. Укажите YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY.');
        }

        $returnUrl = config('yookassa.return_url') ?: route('cabinet.promotions.return', ['order' => $order->id]);

        $response = Http::withBasicAuth((string) config('yookassa.shop_id'), (string) config('yookassa.secret_key'))
            ->withHeaders(['Idempotence-Key' => (string) Str::uuid()])
            ->post(self::API.'/payments', [
                'amount' => [
                    'value' => number_format($order->amount / 100, 2, '.', ''),
                    'currency' => $order->currency,
                ],
                'confirmation' => [
                    'type' => 'redirect',
                    'return_url' => $returnUrl,
                ],
                'capture' => true,
                'description' => $this->description($order),
                'metadata' => ['order_id' => (string) $order->id],
            ])
            ->throw()
            ->json();

        return [
            'payment_id' => (string) $response['id'],
            'payment_url' => $response['confirmation']['confirmation_url'] ?? null,
            'meta' => $response,
        ];
    }

    /** @return array<string,mixed>|null */
    public function fetchPayment(string $paymentId): ?array
    {
        if (! $this->configured()) {
            return null;
        }

        try {
            return Http::withBasicAuth((string) config('yookassa.shop_id'), (string) config('yookassa.secret_key'))
                ->get(self::API.'/payments/'.$paymentId)
                ->throw()
                ->json();
        } catch (RequestException) {
            return null;
        }
    }

    private function description(PromotionOrder $order): string
    {
        $label = match ($order->priceable_type) {
            'product' => 'тариф',
            'package' => 'пакет',
            default => 'услуга',
        };

        return sprintf('Продвижение клиники #%d (%s #%d)', $order->clinic_id, $label, $order->priceable_id);
    }
}
