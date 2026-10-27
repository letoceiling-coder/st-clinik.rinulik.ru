<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('max_users', function (Blueprint $table) {
            $table->id();
            $table->string('max_user_id')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('chat_id')->nullable();
            $table->string('username')->nullable();
            $table->string('display_name')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->boolean('is_blocked')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'is_blocked']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('max_users');
    }
};
