<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('clinic_property_types')
            ->where('slug', 'same_day')
            ->update(['filter_kind' => 'same_day']);
    }

    public function down(): void
    {
        DB::table('clinic_property_types')
            ->where('slug', 'same_day')
            ->update(['filter_kind' => 'boolean']);
    }
};
