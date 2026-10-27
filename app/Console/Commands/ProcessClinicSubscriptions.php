<?php

namespace App\Console\Commands;

use App\Mail\ClinicSubscriptionExpiryMail;
use App\Services\Monetization\ClinicSubscriptionService;
use App\Services\Monetization\PaymentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class ProcessClinicSubscriptions extends Command
{
    protected $signature = 'subscriptions:process';

    protected $description = 'Напоминания об окончании тарифа (7/3/1 день) и перевод просроченных подписок';

    public function handle(ClinicSubscriptionService $subscriptions, PaymentService $payments): int
    {
        $renewed = 0;
        foreach ($subscriptions->subscriptionsDueForAutoRenew() as $subscription) {
            if ($payments->attemptAutoRenew($subscription)) {
                $renewed++;
            }
        }
        $this->info("Auto-renew succeeded: {$renewed}");

        foreach ([7, 3, 1] as $days) {
            foreach ($subscriptions->subscriptionsNeedingReminder($days) as $row) {
                $owner = $row['owner'];
                if ($owner && filled($owner->email) && ! $owner->usesPlaceholderEmail()) {
                    Mail::to($owner->email)->queue(new ClinicSubscriptionExpiryMail($row['subscription'], $days));
                }
                $subscriptions->markReminderSent($row['subscription'], $days);
            }
        }

        $expired = $subscriptions->expireDueSubscriptions();
        $this->info("Expired subscriptions: {$expired}");

        return self::SUCCESS;
    }
}
