<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class Audit
{
    /** @param array<string,mixed> $meta */
    public static function log(string $action, ?Model $subject = null, array $meta = [], ?string $result = null): void
    {
        AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'result' => $result,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'meta' => $meta ?: null,
            'ip' => request()?->ip(),
        ]);
    }
}
