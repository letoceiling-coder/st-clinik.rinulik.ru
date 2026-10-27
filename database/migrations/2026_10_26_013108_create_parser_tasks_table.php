<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parser_tasks', function (Blueprint $table) {
            $table->id();
            $table->string('external_id', 64)->nullable()->unique();
            $table->string('type', 40);
            $table->string('purpose', 16)->default('search');
            $table->json('input');
            $table->string('idempotency_key', 64)->nullable();
            $table->string('status', 16)->default('queued')->index();
            $table->unsignedTinyInteger('progress')->default(0);
            $table->unsignedInteger('found_count')->default(0);
            $table->unsignedInteger('new_count')->default(0);
            $table->decimal('cost_usd', 10, 4)->nullable();
            $table->text('error')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('last_polled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parser_tasks');
    }
};
