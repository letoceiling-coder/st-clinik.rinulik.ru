<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;

/** Письмо с КП: HTML и текстовая версия, отписка в один клик (RFC 8058), пиксель открытия. */
class OfferMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $subjectLine,
        public string $bodyHtml,
        public string $bodyText,
        public string $unsubscribeUrl,
        public ?string $pixelUrl = null,
    ) {}

    public function envelope(): Envelope
    {
        $from = config('services.mail_offers.from_address') ?: config('mail.from.address');

        return new Envelope(
            from: new Address((string) $from, (string) (config('services.mail_offers.from_name') ?: config('app.name'))),
            subject: $this->subjectLine,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.offer', text: 'mail.offer-text');
    }

    public function headers(): Headers
    {
        return new Headers(text: [
            'List-Unsubscribe' => "<{$this->unsubscribeUrl}>",
            'List-Unsubscribe-Post' => 'List-Unsubscribe=One-Click',
        ]);
    }
}
