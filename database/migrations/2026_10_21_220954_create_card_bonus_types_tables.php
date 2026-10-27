<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('card_bonus_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('name');
            $table->string('default_short_label');
            $table->string('icon', 32)->default('sparkle');
            $table->string('placement', 16)->default('strip'); // strip | features
            $table->boolean('is_active')->default(true);
            $table->boolean('triggers_premium')->default(false);
            $table->boolean('requires_calendar')->default(false);
            $table->unsignedSmallInteger('sort')->default(100);
            $table->timestamps();
        });

        Schema::create('clinic_card_bonuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('card_bonus_type_id')->constrained()->cascadeOnDelete();
            $table->boolean('enabled')->default(false);
            $table->string('short_label', 120)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['clinic_id', 'card_bonus_type_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinic_card_bonuses');
        Schema::dropIfExists('card_bonus_types');
    }
};
