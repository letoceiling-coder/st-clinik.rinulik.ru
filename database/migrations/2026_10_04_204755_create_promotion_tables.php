<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotion_products', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('duration_days')->default(30);
            $table->boolean('requires_moderation')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort')->default(100);
            $table->timestamps();
        });

        Schema::create('promotion_packages', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('duration_days')->default(30);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort')->default(100);
            $table->timestamps();
        });

        Schema::create('promotion_package_product', function (Blueprint $table) {
            $table->foreignId('package_id')->constrained('promotion_packages')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('promotion_products')->cascadeOnDelete();
            $table->primary(['package_id', 'product_id']);
        });

        Schema::create('promotion_prices', function (Blueprint $table) {
            $table->id();
            $table->string('priceable_type', 16);
            $table->unsignedBigInteger('priceable_id');
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('price');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['priceable_type', 'priceable_id', 'city_id']);
            $table->index(['priceable_type', 'priceable_id']);
        });

        Schema::create('promotion_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('max_boost')->default(3);
            $table->unsignedTinyInteger('max_banner_home')->default(1);
            $table->unsignedTinyInteger('max_banner_catalog')->default(2);
            $table->timestamps();
        });

        Schema::create('promotion_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('city_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('priceable_type', 16);
            $table->unsignedBigInteger('priceable_id');
            $table->unsignedInteger('amount');
            $table->string('currency', 3)->default('RUB');
            $table->string('status', 24)->default('pending_payment');
            $table->string('payment_provider', 24)->nullable();
            $table->string('payment_id')->nullable()->index();
            $table->text('payment_url')->nullable();
            $table->json('payment_meta')->nullable();
            $table->string('banner_image_path')->nullable();
            $table->string('banner_url', 512)->nullable();
            $table->string('banner_title')->nullable();
            $table->string('moderation_status', 24)->nullable();
            $table->text('moderation_note')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['clinic_id', 'status']);
            $table->index(['moderation_status', 'status']);
        });

        Schema::create('clinic_promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('promotion_orders')->cascadeOnDelete();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('city_id')->constrained()->cascadeOnDelete();
            $table->string('product_code', 32);
            $table->string('status', 24)->default('pending_moderation');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable()->index();
            $table->string('banner_image_path')->nullable();
            $table->string('banner_url', 512)->nullable();
            $table->string('banner_title')->nullable();
            $table->unsignedInteger('impressions')->default(0);
            $table->unsignedInteger('clicks')->default(0);
            $table->timestamps();

            $table->index(['city_id', 'product_code', 'status']);
            $table->index(['clinic_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinic_promotions');
        Schema::dropIfExists('promotion_orders');
        Schema::dropIfExists('promotion_settings');
        Schema::dropIfExists('promotion_prices');
        Schema::dropIfExists('promotion_package_product');
        Schema::dropIfExists('promotion_packages');
        Schema::dropIfExists('promotion_products');
    }
};
