<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctor_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('weekday');
            $table->string('start_time', 5);
            $table->string('end_time', 5);
            $table->string('break_start', 5)->nullable();
            $table->string('break_end', 5)->nullable();
            $table->unsignedSmallInteger('slot_minutes')->default(30);
            $table->timestamps();

            $table->unique(['doctor_id', 'clinic_id', 'weekday']);
            $table->index(['clinic_id', 'weekday']);
        });

        Schema::table('clinic_services', function (Blueprint $table) {
            $table->unsignedSmallInteger('duration_min')->nullable()->after('price_to');
        });
    }

    public function down(): void
    {
        Schema::table('clinic_services', function (Blueprint $table) {
            $table->dropColumn('duration_min');
        });
        Schema::dropIfExists('doctor_schedules');
    }
};
