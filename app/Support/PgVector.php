<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class PgVector
{
    /** @param  list<float|int>  $vector */
    public static function literal(array $vector): string
    {
        $parts = array_map(static fn ($v) => is_numeric($v) ? rtrim(rtrim(sprintf('%.8F', (float) $v), '0'), '.') : '0', $vector);

        return '['.implode(',', $parts).']';
    }

    public static function isAvailable(): bool
    {
        try {
            return DB::connection()->getDriverName() === 'pgsql';
        } catch (\Throwable) {
            return false;
        }
    }
}
