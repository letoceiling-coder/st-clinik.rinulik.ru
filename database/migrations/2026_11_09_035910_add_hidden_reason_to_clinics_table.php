<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            // Кто скрыл филиал: moderation (админ/модератор) или subscription (истёк тариф).
            $table->string('hidden_reason', 20)->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropColumn('hidden_reason');
        });
    }
};
