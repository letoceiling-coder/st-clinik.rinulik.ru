<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->string('inn', 12)->nullable();
            $table->string('status', 16)->default('active');
            $table->timestamps();
        });

        Schema::create('clinics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('city_id')->constrained();
            $table->foreignId('district_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('tagline')->nullable();
            $table->text('description')->nullable();
            $table->string('address');
            $table->string('metro')->nullable();
            $table->decimal('lat', 9, 6)->nullable();
            $table->decimal('lng', 9, 6)->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->unsignedSmallInteger('founded_year')->nullable();
            $table->string('license_number')->nullable();
            $table->string('license_issuer')->nullable();
            $table->date('license_date')->nullable();

            $table->json('schedule')->nullable();
            $table->json('payment_methods')->nullable();
            $table->json('achievements')->nullable();
            $table->text('restrictions')->nullable();

            $table->boolean('is_verified')->default(false);
            $table->boolean('is_24_7')->default(false);
            $table->boolean('accepts_children')->default(false);
            $table->unsignedTinyInteger('children_age_from')->nullable();
            $table->boolean('same_day')->default(false);
            $table->boolean('has_installment')->default(false);
            $table->unsignedTinyInteger('installment_months')->nullable();
            $table->boolean('accepts_dms')->default(false);
            $table->boolean('has_sedation')->default(false);
            $table->boolean('has_anesthesia')->default(false);
            $table->boolean('has_microscope')->default(false);
            $table->boolean('has_ct')->default(false);

            $table->decimal('rating', 3, 2)->default(0);
            $table->unsignedInteger('reviews_count')->default(0);
            $table->unsignedSmallInteger('doctors_count')->default(0);
            $table->unsignedInteger('min_price')->nullable();
            $table->unsignedSmallInteger('max_experience')->default(0);
            $table->unsignedTinyInteger('completeness')->default(0);
            $table->unsignedInteger('views_count')->default(0);
            $table->unsignedSmallInteger('art_seed')->default(1);

            $table->string('status', 16)->default('published')->index();
            $table->text('moderation_note')->nullable();
            $table->string('seo_title')->nullable();
            $table->string('seo_description', 400)->nullable();
            $table->string('search_text', 1000)->nullable();
            $table->timestamps();

            $table->index(['city_id', 'status', 'rating']);
        });

        Schema::create('doctors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('position')->nullable();
            $table->unsignedSmallInteger('experience_years')->default(0);
            $table->text('bio')->nullable();
            $table->json('education')->nullable();
            $table->json('achievements')->nullable();
            $table->json('schedule_days')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->boolean('accepts_children')->default(false);
            $table->unsignedTinyInteger('children_age_from')->nullable();
            $table->unsignedInteger('consult_price')->nullable();
            $table->decimal('rating', 3, 2)->default(0);
            $table->unsignedInteger('reviews_count')->default(0);
            $table->unsignedSmallInteger('art_seed')->default(1);
            $table->string('status', 16)->default('published')->index();
            $table->text('moderation_note')->nullable();
            $table->string('search_text', 1000)->nullable();
            $table->timestamps();
        });

        Schema::create('doctor_specialty', function (Blueprint $table) {
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('specialty_id')->constrained()->cascadeOnDelete();
            $table->primary(['doctor_id', 'specialty_id']);
        });

        Schema::create('clinic_specialty', function (Blueprint $table) {
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('specialty_id')->constrained()->cascadeOnDelete();
            $table->primary(['clinic_id', 'specialty_id']);
        });

        Schema::create('clinic_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('price_from');
            $table->unsignedInteger('price_to')->nullable();
            $table->boolean('is_promo')->default(false);
            $table->string('note')->nullable();
            $table->timestamps();
            $table->unique(['clinic_id', 'service_id']);
        });

        Schema::create('clinic_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 16)->default('interior');
            $table->string('caption')->nullable();
            $table->string('path')->nullable();
            $table->unsignedSmallInteger('art_seed')->default(1);
            $table->string('status', 16)->default('approved');
            $table->unsignedSmallInteger('sort')->default(100);
            $table->timestamps();
        });

        Schema::create('clinic_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('type', 24)->default('license');
            $table->string('title');
            $table->string('number')->nullable();
            $table->date('issued_at')->nullable();
            $table->date('expires_at')->nullable();
            $table->string('path')->nullable();
            $table->string('status', 16)->default('pending');
            $table->text('reviewer_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinic_documents');
        Schema::dropIfExists('clinic_photos');
        Schema::dropIfExists('clinic_services');
        Schema::dropIfExists('clinic_specialty');
        Schema::dropIfExists('doctor_specialty');
        Schema::dropIfExists('doctors');
        Schema::dropIfExists('clinics');
        Schema::dropIfExists('organizations');
    }
};
