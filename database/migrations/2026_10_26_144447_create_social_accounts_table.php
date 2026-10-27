<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 16);
            $table->string('provider_user_id', 128);
            $table->string('email')->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('name')->nullable();
            $table->string('avatar')->nullable();
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->json('raw')->nullable();
            $table->timestamp('linked_at')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'provider_user_id']);
            $table->index(['user_id', 'provider']);
        });

        if (Schema::hasColumn('users', 'email_verified_at')) {
            DB::table('users')->whereNull('email_verified_at')->update(['email_verified_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('social_accounts');
    }
};
