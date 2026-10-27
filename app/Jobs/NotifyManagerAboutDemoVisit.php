<?php

namespace App\Jobs;

use App\Models\DemoVisit;
use App\Models\UserNotification;
use App\Services\Offers\OfferSettings;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Mail;

/** Сообщает менеджеру, что клиника открыла демо-кабинет. */
class NotifyManagerAboutDemoVisit implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public int $visitId)
    {
        $this->afterCommit();
    }

    public function handle(OfferSettings $settings): void
    {
        $visit = DemoVisit::query()->with('demoLink.clinic', 'demoLink.offer')->find($this->visitId);
        $link = $visit?->demoLink;
        if ($link === null) {
            return;
        }

        $clinic = $link->clinic->name;
        $body = "«{$clinic}» открыла демо-кабинет ({$visit->device}). Открытий ссылки: {$link->opens_count}.";
        $url = $link->offer_id ? route('admin.offers.show', $link->offer_id) : route('admin.offers.index');

        if ($link->offer?->created_by) {
            UserNotification::create([
                'user_id' => $link->offer->created_by, 'type' => 'demo_opened',
                'title' => 'Открыт демо-кабинет', 'body' => $body, 'url' => $url,
            ]);
        }

        $email = $settings->manager()['email'];
        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Mail::raw("{$body}\n\nКП и журнал визитов: {$url}", fn (Message $m) => $m->to($email)->subject("Демо-кабинет открыт: {$clinic}"));
        }
    }
}
