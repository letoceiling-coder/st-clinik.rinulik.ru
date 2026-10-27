<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinic_followers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->json('channels');
            $table->timestamp('subscribed_at');
            $table->timestamps();

            $table->unique(['user_id', 'clinic_id']);
            $table->index(['clinic_id', 'subscribed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinic_followers');
    }
};
