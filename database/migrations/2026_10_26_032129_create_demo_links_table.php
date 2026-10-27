<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demo_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('offer_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->text('token_encrypted');
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('max_opens')->nullable();
            $table->unsignedInteger('max_devices')->nullable();
            $table->json('sections');
            $table->boolean('show_tariffs')->default(true);
            $table->boolean('notify_manager')->default(true);
            $table->boolean('revoke_on_connect')->default(true);
            $table->unsignedInteger('opens_count')->default(0);
            $table->timestamp('last_opened_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->string('revoke_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demo_links');
    }
};
