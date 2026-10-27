<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_BLOCKED = 'blocked';

    /** @var list<string> */
    public const STATUSES = [self::STATUS_ACTIVE, self::STATUS_BLOCKED];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'license_date' => 'date',
            'agreement_accepted_at' => 'datetime',
            'trial_requested_at' => 'datetime',
            'trial_used_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function clinics(): HasMany
    {
        return $this->hasMany(Clinic::class);
    }
}
