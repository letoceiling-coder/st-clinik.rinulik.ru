<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Работа с заявкой в кабинете: первый ответ клиники, ответственный, «перезвонить», причина отказа. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->timestamp('first_response_at')->nullable()->after('clinic_note');
            $table->foreignId('assigned_to')->nullable()->after('first_response_at')->constrained('users')->nullOnDelete();
            $table->timestamp('callback_at')->nullable()->after('assigned_to');
            $table->string('cancel_reason', 32)->nullable()->after('callback_at');
            $table->index(['clinic_id', 'created_at']);
        });

        // Заявки, которые клиника уже обработала, считаем отвеченными на момент последнего изменения.
        DB::table('leads')->where('status', '!=', 'new')->whereNull('first_response_at')->update(['first_response_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['clinic_id', 'created_at']);
            $table->dropConstrainedForeignId('assigned_to');
            $table->dropColumn(['first_response_at', 'callback_at', 'cancel_reason']);
        });
    }
};
