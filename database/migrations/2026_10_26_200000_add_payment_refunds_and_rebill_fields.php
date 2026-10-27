<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('rebill_id')->nullable()->after('payment_meta');
            $table->unsignedInteger('refunded_amount')->default(0)->after('paid_at');
            $table->foreignId('parent_payment_id')->nullable()->after('promotion_order_id')->constrained('payments')->nullOnDelete();
        });

        Schema::create('payment_refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('admin_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('amount');
            $table->string('status', 24)->default('completed');
            $table->json('provider_response')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_refunds');
        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_payment_id');
            $table->dropColumn(['rebill_id', 'refunded_amount']);
        });
    }
};
