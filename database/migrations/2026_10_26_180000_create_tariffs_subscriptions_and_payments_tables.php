<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tariffs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug', 64)->unique();
            $table->text('description')->nullable();
            $table->unsignedInteger('price')->default(0);
            $table->unsignedSmallInteger('duration_days')->default(30);
            $table->unsignedSmallInteger('max_branches')->nullable();
            $table->unsignedSmallInteger('max_doctors')->nullable();
            $table->unsignedSmallInteger('max_photos')->nullable();
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->unsignedSmallInteger('sort')->default(100);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('clinic_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind', 24);
            $table->foreignId('tariff_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('promotion_order_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('amount');
            $table->string('currency', 3)->default('RUB');
            $table->string('status', 24)->default('created');
            $table->string('payment_provider', 24)->nullable();
            $table->string('payment_id')->nullable()->index();
            $table->text('payment_url')->nullable();
            $table->json('payment_meta')->nullable();
            $table->timestamp('service_starts_at')->nullable();
            $table->timestamp('service_ends_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->string('description')->nullable();
            $table->timestamps();

            $table->index(['clinic_id', 'status']);
            $table->index(['kind', 'status']);
            $table->index('paid_at');
        });

        Schema::create('clinic_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tariff_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->string('status', 24)->default('pending');
            $table->boolean('auto_renew')->default(false);
            $table->string('rebill_id')->nullable();
            $table->json('reminder_days_sent')->nullable();
            $table->timestamps();

            $table->index(['clinic_id', 'status']);
            $table->index(['ends_at', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinic_subscriptions');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('tariffs');
    }
};
