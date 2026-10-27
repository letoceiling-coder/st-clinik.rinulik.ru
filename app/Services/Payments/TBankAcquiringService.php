<?php

namespace App\Services\Payments;

use App\Models\PromotionOrder;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

class TBankAcquiringService
{
    /**
     * @param  array<string, string>  $metadata
     * @return array{payment_id: string, payment_url: string|null, meta: array<string, mixed>}
     */
    public function initPayment(
        int $amount,
        string $orderId,
        string $description,
        array $metadata,
        string $successUrl,
        string $failUrl,
        bool $saveRecurrent = false,
        ?string $customerKey = null,
    ): array {
        if (! $this->configured()) {
            throw new \RuntimeException('Т‑Банк не настроен. Укажите TerminalKey и пароль терминала в центре интеграций.');
        }

        $payload = [
            'TerminalKey' => (string) config('tbank.terminal_key'),
            'Amount' => $amount,
            'OrderId' => $orderId,
            'Description' => $description,
            'NotificationURL' => route('payments.tbank.webhook'),
            'SuccessURL' => $successUrl,
            'FailURL' => $failUrl,
            'DATA' => $metadata,
        ];
        if ($saveRecurrent) {
            $payload['Recurrent'] = 'Y';
            $payload['CustomerKey'] = $customerKey ?: $orderId;
        }
        $payload['Token'] = $this->sign($payload);

        $response = $this->client()->post($this->endpoint('Init'), $payload)->throw()->json();

        if (! ($response['Success'] ?? false)) {
            throw new \RuntimeException('Т‑Банк отклонил платёж: '.($response['Message'] ?? $response['Details'] ?? 'неизвестная ошибка'));
        }

        return [
            'payment_id' => (string) ($response['PaymentId'] ?? ''),
            'payment_url' => $response['PaymentURL'] ?? null,
            'meta' => $response,
        ];
    }

    /** @return array{payment_id: string, payment_url: string|null, meta: array<string, mixed>} */
    public function createPayment(PromotionOrder $order): array
    {
        return $this->initPayment(
            amount: (int) $order->amount,
            orderId: sprintf('promo-%d-%d', $order->id, now()->timestamp),
            description: $this->description($order),
            metadata: ['order_id' => (string) $order->id],
            successUrl: $this->successUrl($order),
            failUrl: $this->failUrl($order),
        );
    }

    /** @return array<string, mixed>|null */
    public function fetchPayment(string $paymentId): ?array
    {
        if (! $this->configured() || $paymentId === '') {
            return null;
        }

        $payload = [
            'TerminalKey' => (string) config('tbank.terminal_key'),
            'PaymentId' => (int) $paymentId,
        ];
        $payload['Token'] = $this->sign($payload);

        try {
            $response = $this->client()->post($this->endpoint('GetState'), $payload)->throw()->json();
        } catch (RequestException) {
            return null;
        }

        return is_array($response) ? $response : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function verifyNotification(array $payload): bool
    {
        if (! $this->configured()) {
            return false;
        }

        $token = $payload['Token'] ?? null;
        if (! is_string($token) || $token === '') {
            return false;
        }

        $expected = $this->sign($payload);

        return hash_equals($expected, $token);
    }

    /**
     * @return array<string, mixed>
     */
    public function chargeWithRebill(int $amount, string $orderId, string $description, string $rebillId, array $metadata): array
    {
        $init = $this->initPayment(
            amount: $amount,
            orderId: $orderId,
            description: $description,
            metadata: $metadata,
            successUrl: url('/'),
            failUrl: url('/'),
        );

        $payload = [
            'TerminalKey' => (string) config('tbank.terminal_key'),
            'PaymentId' => (int) $init['payment_id'],
            'RebillId' => $rebillId,
        ];
        $payload['Token'] = $this->sign($payload);

        $response = $this->client()->post($this->endpoint('Charge'), $payload)->throw()->json();
        if (! ($response['Success'] ?? false)) {
            throw new \RuntimeException('Т‑Банк отклонил автосписание: '.($response['Message'] ?? $response['Details'] ?? 'неизвестная ошибка'));
        }

        return [
            'payment_id' => (string) ($init['payment_id'] ?? ''),
            'meta' => $response,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function cancelPayment(string $paymentId): array
    {
        $payload = [
            'TerminalKey' => (string) config('tbank.terminal_key'),
            'PaymentId' => (int) $paymentId,
        ];
        $payload['Token'] = $this->sign($payload);

        return $this->client()->post($this->endpoint('Cancel'), $payload)->throw()->json();
    }

    /**
     * @return array<string, mixed>
     */
    public function refundPayment(string $paymentId, ?int $amount = null): array
    {
        $payload = [
            'TerminalKey' => (string) config('tbank.terminal_key'),
            'PaymentId' => (int) $paymentId,
        ];
        if ($amount !== null) {
            $payload['Amount'] = $amount;
        }
        $payload['Token'] = $this->sign($payload);

        return $this->client()->post($this->endpoint('Cancel'), $payload)->throw()->json();
    }

    public function configured(): bool
    {
        return filled(config('tbank.terminal_key')) && filled(config('tbank.password'));
    }

    /**
     * @param  array<string, mixed>  $params
     */
    public function sign(array $params): string
    {
        $password = (string) config('tbank.password');
        $copy = $params;
        unset($copy['Token']);
        $copy['Password'] = $password;
        ksort($copy);

        $concat = '';
        foreach ($copy as $value) {
            if (is_array($value)) {
                continue;
            }
            if (is_bool($value)) {
                $concat .= $value ? 'true' : 'false';

                continue;
            }
            $concat .= (string) $value;
        }

        return hash('sha256', $concat);
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

    private function successUrl(PromotionOrder $order): string
    {
        $configured = config('tbank.success_url');

        return filled($configured)
            ? (string) $configured
            : route('cabinet.promotions.return', ['order' => $order->id]);
    }

    private function failUrl(PromotionOrder $order): string
    {
        $configured = config('tbank.fail_url');

        return filled($configured)
            ? (string) $configured
            : route('cabinet.promotions.index');
    }

    private function endpoint(string $method): string
    {
        return rtrim((string) config('tbank.api_url'), '/').'/'.$method;
    }

    private function client(): PendingRequest
    {
        return Http::acceptJson()->asJson()->timeout(20);
    }
}
