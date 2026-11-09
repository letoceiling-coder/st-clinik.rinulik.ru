<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_refunds', function (Blueprint $table) {
            // admin — оформлен в админке; bank — пришёл уведомлением банка (возврат из личного кабинета Т‑Банка).
            $table->string('source', 16)->default('admin')->after('status');
            // Отключена ли купленная услуга (тариф или продвижение) этим возвратом.
            $table->boolean('service_revoked')->default(false)->after('source');
        });
    }

    public function down(): void
    {
        Schema::table('payment_refunds', function (Blueprint $table) {
            $table->dropColumn(['source', 'service_revoked']);
        });
    }
};
