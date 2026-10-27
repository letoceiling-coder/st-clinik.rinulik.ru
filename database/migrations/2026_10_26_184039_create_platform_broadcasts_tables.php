<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('broadcasts', function (Blueprint $table) {
            $table->id();
            $table->string('sender_type', 16)->default('platform');
            $table->foreignId('clinic_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 160);
            $table->text('body');
            $table->string('button_label', 80)->nullable();
            $table->string('button_url', 500)->nullable();
            $table->json('channels');
            $table->json('filters')->nullable();
            $table->string('status', 16)->default('draft');
            $table->string('moderation_status', 16)->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('recipients_total')->default(0);
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->unsignedInteger('click_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'scheduled_at']);
            $table->index(['sender_type', 'clinic_id']);
        });

        Schema::create('broadcast_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('broadcast_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('channel', 24);
            $table->string('contact', 191)->nullable();
            $table->string('track_code', 10)->unique();
            $table->string('status', 16)->default('queued');
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->string('error', 250)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('clicked_at')->nullable();
            $table->boolean('is_test')->default(false);
            $table->timestamps();

            $table->index(['broadcast_id', 'status']);
            $table->index(['broadcast_id', 'channel']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('broadcast_recipients');
        Schema::dropIfExists('broadcasts');
    }
};
