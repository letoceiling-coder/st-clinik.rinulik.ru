<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfferTemplateVersion extends Model
{
    /** Поля содержимого версии, по каналам. */
    public const CONTENT_FIELDS = ['web_title', 'web_body', 'email_subject', 'email_body', 'sms_text', 'messenger_text', 'call_script'];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['version' => 'integer'];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(OfferTemplate::class, 'offer_template_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
