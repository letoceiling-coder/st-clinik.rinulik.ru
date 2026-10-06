<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->boolean('accepts_oms')->default(false)->after('accepts_dms');
            $table->boolean('has_partial_payment')->default(false)->after('has_installment');
        });
    }

    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropColumn(['accepts_oms', 'has_partial_payment']);
        });
    }
};
