<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demo_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demo_link_id')->constrained()->cascadeOnDelete();
            $table->string('device_hash', 64)->index();
            $table->string('ip_masked', 64)->nullable();
            $table->string('device', 120)->nullable();
            $table->json('sections');
            $table->unsignedInteger('pages_count')->default(0);
            $table->timestamp('started_at');
            $table->timestamp('last_seen_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demo_visits');
    }
};
