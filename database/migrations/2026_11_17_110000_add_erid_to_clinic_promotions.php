<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Маркировка рекламы (38-ФЗ): токен ЕРИР (erid), который выдаёт ОРД, показывается рядом с пометкой «Реклама». */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinic_promotions', function (Blueprint $table) {
            $table->string('erid', 64)->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('clinic_promotions', function (Blueprint $table) {
            $table->dropColumn('erid');
        });
    }
};
