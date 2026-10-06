<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinic_property_types', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 60)->unique();
            $table->string('name', 120);
            $table->string('group', 60)->default('Возможности');
            $table->string('filter_kind', 20);
            $table->string('db_column', 60)->nullable();
            $table->string('filter_value', 60)->nullable();
            $table->unsignedSmallInteger('sort')->default(100);
            $table->boolean('is_active')->default(true);
            $table->boolean('show_in_filter')->default(true);
            $table->boolean('show_in_cabinet')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinic_property_types');
    }
};
