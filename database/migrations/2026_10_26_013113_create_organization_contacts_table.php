<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parsed_organization_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('clinic_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('type', 16);
            $table->string('value');
            $table->string('source', 16)->default('yandex');
            $table->boolean('is_verified')->default(false);
            $table->boolean('do_not_contact')->default(false);
            $table->string('note')->nullable();
            $table->timestamps();

            $table->unique(['parsed_organization_id', 'type', 'value']);
            $table->index(['clinic_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_contacts');
    }
};
