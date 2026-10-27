<?php

namespace App\Services\Offers;

use App\Jobs\NotifyManagerAboutDemoVisit;
use App\Models\DemoLink;
use App\Models\DemoVisit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Анонимный демо-доступ к кабинету: проверка лимитов ссылки, учёт устройств и визитов.
 * Устройство определяется по долгоживущей cookie, а не по IP (IP хранится только маскированным).
 */
class DemoSession
{
    public const SESSION_KEY = 'demo_link';

    public const DEVICE_COOKIE = 'demo_device';

    public function __construct(private readonly OfferService $offers) {}

    /**
     * Открывает демо по ссылке: создаёт визит или продолжает текущий на этом устройстве.
     *
     * @return array{link: DemoLink, device: string}
     */
    public function open(Request $request, string $token): array
    {
        $link = DemoLink::findByToken($token) ?? throw new RuntimeException('Ссылка на демо-кабинет не найдена.');
        if ($reason = $link->unavailableReason()) {
            throw new RuntimeException($reason);
        }

        $device = $this->deviceId($request);
        $deviceHash = hash('sha256', $device);
        $current = $request->session()->get(self::SESSION_KEY);
        $continuing = is_array($current) && (int) ($current['id'] ?? 0) === $link->id;

        if (! $continuing) {
            if ($link->max_opens !== null && $link->opens_count >= $link->max_opens) {
                throw new RuntimeException('Ссылку на демо-кабинет открывали максимальное число раз. Попросите менеджера прислать новую.');
            }
            $knownDevice = $link->visits()->where('device_hash', $deviceHash)->exists();
            $devices = $link->visits()->distinct()->count('device_hash');
            if (! $knownDevice && $link->max_devices !== null && $devices >= $link->max_devices) {
                throw new RuntimeException('Демо-кабинет уже открыт на максимальном числе устройств. Откройте его на том же устройстве или попросите новую ссылку.');
            }

            $visit = $link->visits()->create([
                'device_hash' => $deviceHash,
                'ip_masked' => $this->maskIp((string) $request->ip()),
                'device' => Str::limit($this->deviceLabel((string) $request->userAgent()), 110, ''),
                'sections' => [],
                'started_at' => now(),
                'last_seen_at' => now(),
            ]);
            $link->forceFill(['opens_count' => $link->opens_count + 1, 'last_opened_at' => now()])->save();
            $request->session()->put(self::SESSION_KEY, ['id' => $link->id, 'visit' => $visit->id]);

            if ($link->offer) {
                $this->offers->advanceRecipients($link->offer, 'demo_opened');
            }
            if ($link->notify_manager) {
                NotifyManagerAboutDemoVisit::dispatch($visit->id);
            }
        }

        return ['link' => $link, 'device' => $device];
    }

    /** Действующая демо-ссылка текущей сессии; при истечении или отзыве сессия очищается. */
    public function current(Request $request): ?DemoLink
    {
        $state = $request->session()->get(self::SESSION_KEY);
        if (! is_array($state)) {
            return null;
        }

        $link = DemoLink::query()->with('clinic.organization', 'offer')->find((int) ($state['id'] ?? 0));
        if ($link === null || $link->unavailableReason() !== null) {
            $request->session()->forget(self::SESSION_KEY);

            return null;
        }

        return $link;
    }

    public function touch(Request $request, string $section): void
    {
        $visitId = (int) data_get($request->session()->get(self::SESSION_KEY), 'visit', 0);
        $visit = DemoVisit::query()->find($visitId);
        if ($visit === null) {
            return;
        }

        $sections = array_values(array_unique([...(array) $visit->sections, $section]));
        $visit->forceFill(['sections' => $sections, 'pages_count' => $visit->pages_count + 1, 'last_seen_at' => now()])->save();
    }

    public function leave(Request $request): void
    {
        $request->session()->forget(self::SESSION_KEY);
    }

    private function deviceId(Request $request): string
    {
        $value = $request->cookie(self::DEVICE_COOKIE);

        return is_string($value) && preg_match('/^[A-Za-z0-9-]{20,64}$/', $value) ? $value : (string) Str::uuid();
    }

    private function maskIp(string $ip): string
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return preg_replace('/\.\d+$/', '.xxx', $ip) ?? '';
        }

        return implode(':', array_slice(explode(':', $ip), 0, 3)).':…';
    }

    private function deviceLabel(string $userAgent): string
    {
        $os = match (true) {
            str_contains($userAgent, 'iPhone') || str_contains($userAgent, 'iPad') => 'iOS',
            str_contains($userAgent, 'Android') => 'Android',
            str_contains($userAgent, 'Windows') => 'Windows',
            str_contains($userAgent, 'Mac OS') => 'macOS',
            str_contains($userAgent, 'Linux') => 'Linux',
            default => 'Другое',
        };
        $browser = match (true) {
            str_contains($userAgent, 'YaBrowser') => 'Яндекс Браузер',
            str_contains($userAgent, 'Edg/') => 'Edge',
            str_contains($userAgent, 'Firefox') => 'Firefox',
            str_contains($userAgent, 'Chrome') => 'Chrome',
            str_contains($userAgent, 'Safari') => 'Safari',
            default => 'браузер',
        };
        $mobile = str_contains($userAgent, 'Mobile') ? ', телефон' : '';

        return "{$os}, {$browser}{$mobile}";
    }
}
