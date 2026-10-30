<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** То, что пациент спрашивает перед визитом: как найти вход, где оставить машину, какие гарантии. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->string('directions_note', 500)->nullable()->after('metro');
            $table->string('parking', 160)->nullable()->after('directions_note');
            $table->text('warranty')->nullable()->after('restrictions');
        });
    }

    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropColumn(['directions_note', 'parking', 'warranty']);
        });
    }
};
