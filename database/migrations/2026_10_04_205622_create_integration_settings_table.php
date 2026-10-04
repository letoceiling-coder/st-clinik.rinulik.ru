<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_settings', function (Blueprint $table) {
            $table->id();
            $table->string('group', 32);
            $table->string('key', 64);
            $table->text('value')->nullable();
            $table->timestamps();

            $table->unique(['group', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_settings');
    }
};
