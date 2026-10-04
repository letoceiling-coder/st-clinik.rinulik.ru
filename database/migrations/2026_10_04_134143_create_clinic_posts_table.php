<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinic_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('type', 16);
            $table->string('title');
            $table->string('slug');
            $table->string('excerpt', 400)->nullable();
            $table->text('body');
            $table->string('image_path')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->boolean('is_pinned')->default(false);
            $table->string('status', 16)->default('draft')->index();
            $table->unsignedSmallInteger('sort')->default(100);
            $table->timestamps();

            $table->unique(['clinic_id', 'slug']);
            $table->index(['clinic_id', 'status', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinic_posts');
    }
};
