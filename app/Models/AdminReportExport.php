<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminReportExport extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_READY = 'ready';

    public const STATUS_FAILED = 'failed';

    public const FORMAT_CSV = 'csv';

    public const FORMAT_XLSX = 'xlsx';

    /** @var list<string> */
    public const FORMATS = [self::FORMAT_CSV, self::FORMAT_XLSX];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'ready_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isReady(): bool
    {
        return $this->status === self::STATUS_READY && filled($this->file_path);
    }
}
