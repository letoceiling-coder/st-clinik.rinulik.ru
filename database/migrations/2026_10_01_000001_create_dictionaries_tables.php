<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('name_in')->nullable();
            $table->string('region')->nullable();
            $table->decimal('lat', 9, 6)->nullable();
            $table->decimal('lng', 9, 6)->nullable();
            $table->unsignedInteger('population')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort')->default(100);
            $table->string('search_text')->nullable();
            $table->timestamps();
        });

        Schema::create('districts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->timestamps();
            $table->unique(['city_id', 'slug']);
        });

        Schema::create('specialties', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('icon', 40)->nullable();
            $table->string('short')->nullable();
            $table->text('description')->nullable();
            $table->text('when_to_apply')->nullable();
            $table->text('restrictions')->nullable();
            $table->unsignedSmallInteger('sort')->default(100);
            $table->boolean('is_active')->default(true);
            $table->string('search_text')->nullable();
            $table->timestamps();
        });

        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('specialty_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->unsignedInteger('price_hint_from')->nullable();
            $table->unsignedSmallInteger('duration_min')->nullable();
            $table->boolean('is_popular')->default(false);
            $table->boolean('is_active')->default(true);
            $table->string('search_text')->nullable();
            $table->timestamps();
        });

        Schema::create('concerns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('specialty_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('icon', 40)->nullable();
            $table->string('hint')->nullable();
            $table->text('advice')->nullable();
            $table->string('keywords')->nullable();
            $table->unsignedSmallInteger('sort')->default(100);
            $table->boolean('is_active')->default(true);
            $table->string('search_text')->nullable();
            $table->timestamps();
        });

        Schema::create('concern_service', function (Blueprint $table) {
            $table->foreignId('concern_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->primary(['concern_id', 'service_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('concern_service');
        Schema::dropIfExists('concerns');
        Schema::dropIfExists('services');
        Schema::dropIfExists('specialties');
        Schema::dropIfExists('districts');
        Schema::dropIfExists('cities');
    }
};
