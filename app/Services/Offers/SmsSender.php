<?php

namespace App\Services\Offers;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/** Отправка SMS через провайдера из центра интеграций (SMS.ru, SMSC, SMS Aero). */
class SmsSender
{
    public function configured(): bool
    {
        return filled(config('services.sms.provider')) && filled(config('services.sms.api_key'));
    }

    /** @return string идентификатор сообщения у провайдера */
    public function send(string $phone, string $text): string
    {
        if (! $this->configured()) {
            throw new RuntimeException('SMS-провайдер не настроен в центре интеграций.');
        }

        $number = preg_replace('/\D+/', '', $phone) ?? '';
        $login = (string) config('services.sms.login');
        $key = (string) config('services.sms.api_key');
        $sender = config('services.sms.sender');

        return match ((string) config('services.sms.provider')) {
            'smsru' => $this->smsRu($key, $number, $text, $sender),
            'smsc' => $this->smsc($login, $key, $number, $text, $sender),
            'smsaero' => $this->smsAero($login, $key, $number, $text, $sender),
            default => throw new RuntimeException('Неизвестный SMS-провайдер.'),
        };
    }

    private function smsRu(string $key, string $number, string $text, ?string $sender): string
    {
        $json = $this->http()->asForm()->post('https://sms.ru/sms/send', array_filter([
            'api_id' => $key, 'to' => $number, 'msg' => $text, 'json' => 1, 'from' => $sender,
        ]))->json();
        $sms = $json['sms'][$number] ?? [];
        if (($json['status'] ?? null) !== 'OK' || ($sms['status'] ?? null) !== 'OK') {
            throw new RuntimeException('SMS.ru: '.($sms['status_text'] ?? $json['status_text'] ?? 'не отправлено'));
        }

        return (string) $sms['sms_id'];
    }

    private function smsc(string $login, string $password, string $number, string $text, ?string $sender): string
    {
        $json = $this->http()->asForm()->post('https://smsc.ru/sys/send.php', array_filter([
            'login' => $login, 'psw' => $password, 'phones' => $number, 'mes' => $text, 'fmt' => 3, 'charset' => 'utf-8', 'sender' => $sender,
        ]))->json();
        if (! isset($json['id'])) {
            throw new RuntimeException('SMSC: '.($json['error'] ?? 'не отправлено'));
        }

        return (string) $json['id'];
    }

    private function smsAero(string $email, string $key, string $number, string $text, ?string $sender): string
    {
        $json = $this->http()->withBasicAuth($email, $key)->post('https://gate.smsaero.ru/v2/sms/send', [
            'number' => $number, 'text' => $text, 'sign' => $sender ?: 'SMS Aero',
        ])->json();
        if (! ($json['success'] ?? false)) {
            throw new RuntimeException('SMS Aero: '.($json['message'] ?? 'не отправлено'));
        }

        return (string) ($json['data']['id'] ?? '');
    }

    private function http(): PendingRequest
    {
        return Http::timeout(15)->acceptJson();
    }
}
