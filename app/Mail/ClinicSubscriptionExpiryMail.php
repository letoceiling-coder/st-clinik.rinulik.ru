<?php

namespace App\Mail;

use App\Models\ClinicSubscription;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClinicSubscriptionExpiryMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ClinicSubscription $subscription,
        public int $daysLeft,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Тариф клиники заканчивается через '.$this->daysLeft.' дн.',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.clinic-subscription-expiry',
            with: [
                'clinicName' => $this->subscription->clinic?->name ?? 'Клиника',
                'tariffName' => $this->subscription->tariff?->name ?? 'Тариф',
                'endsAt' => $this->subscription->ends_at->format('d.m.Y'),
                'daysLeft' => $this->daysLeft,
                'paymentsUrl' => url('/clinic-cabinet/payments'),
            ],
        );
    }
}
