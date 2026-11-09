<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Заявка «Это ваша клиника?»: представитель просит права на карточку без владельца, модератор проверяет документ.
        Schema::create('clinic_claim_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('position', 120);
            $table->string('phone', 32);
            $table->string('comment', 1000)->nullable();
            // Файл лежит на приватном диске, открывается только из админки.
            $table->string('document_path')->nullable();
            $table->string('status', 16)->default('pending')->index();
            $table->string('agreement_version', 32)->nullable();
            $table->timestamp('consent_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('moderation_note', 500)->nullable();
            $table->timestamps();

            $table->index(['clinic_id', 'user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinic_claim_requests');
    }
};
