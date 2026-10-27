<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parsed_organizations', function (Blueprint $table) {
            $table->id();
            $table->string('external_id', 64)->unique();
            $table->string('parser_id', 64)->nullable();
            $table->string('source', 16)->default('yandex');
            $table->string('name');
            $table->string('city_name')->nullable();
            $table->string('region')->nullable();
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();
            $table->string('address', 500)->nullable();
            $table->string('address_details')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->json('phones')->nullable();
            $table->string('website', 500)->nullable();
            $table->json('socials')->nullable();
            $table->json('categories')->nullable();
            $table->string('hours')->nullable();
            $table->decimal('rating', 3, 2)->nullable();
            $table->unsignedInteger('reviews_count')->default(0);
            $table->boolean('has_full_card')->default(false);
            $table->jsonb('raw');
            $table->string('status', 16)->default('new')->index();
            $table->foreignId('match_clinic_id')->nullable()->constrained('clinics')->nullOnDelete();
            $table->string('match_reason')->nullable();
            $table->foreignId('clinic_id')->nullable()->constrained('clinics')->nullOnDelete();
            $table->string('group_key', 160)->nullable()->index();
            $table->foreignId('parser_task_id')->nullable()->constrained('parser_tasks')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamp('source_updated_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamp('imported_at')->nullable();
            $table->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('parser_tasks', function (Blueprint $table) {
            $table->foreignId('parsed_organization_id')->nullable()->after('purpose')->constrained('parsed_organizations')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('parser_tasks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parsed_organization_id');
        });
        Schema::dropIfExists('parsed_organizations');
    }
};
