<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('lead_id')->nullable();
            $table->unsignedTinyInteger('rating');
            $table->string('title')->nullable();
            $table->text('body');
            $table->date('visit_date')->nullable();
            $table->boolean('is_verified_visit')->default(false);
            $table->string('author_name', 80);
            $table->string('status', 16)->default('pending')->index();
            $table->json('flags')->nullable();
            $table->text('moderation_note')->nullable();
            $table->text('reply_text')->nullable();
            $table->timestamp('reply_at')->nullable();
            $table->foreignId('reply_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('helpful_count')->default(0);
            $table->timestamp('consent_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->index(['clinic_id', 'status', 'published_at']);
        });

        Schema::create('review_complaints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reporter_role', 24)->default('user');
            $table->string('reason', 40);
            $table->text('comment')->nullable();
            $table->string('status', 16)->default('open')->index();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('resolution')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('concern_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 80);
            $table->string('phone', 32);
            $table->date('preferred_date')->nullable();
            $table->string('preferred_time', 16)->nullable();
            $table->string('comment', 300)->nullable();
            $table->string('status', 16)->default('new')->index();
            $table->string('source', 24)->default('clinic_page');
            $table->boolean('is_child')->default(false);
            $table->timestamp('consent_at');
            $table->string('consent_version', 16)->nullable();
            $table->string('ip_hash', 64)->nullable();
            $table->text('clinic_note')->nullable();
            $table->timestamps();
        });

        Schema::create('user_collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 16);
            $table->string('entity_type', 16);
            $table->unsignedBigInteger('entity_id');
            $table->timestamps();
            $table->unique(['user_id', 'kind', 'entity_type', 'entity_id'], 'user_collections_unique');
        });

        Schema::create('history_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 16);
            $table->string('entity_type', 16)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('query')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 32);
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('url')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('cms_pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('kind', 16)->default('page');
            $table->longText('body')->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_description', 400)->nullable();
            $table->string('status', 16)->default('published');
            $table->timestamps();
        });

        Schema::create('seo_templates', function (Blueprint $table) {
            $table->id();
            $table->string('page_type', 32)->unique();
            $table->string('title_tpl');
            $table->string('description_tpl', 400);
            $table->string('h1_tpl')->nullable();
            $table->boolean('noindex')->default(false);
            $table->timestamps();
        });

        Schema::create('duplicate_flags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_a_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('clinic_b_id')->constrained('clinics')->cascadeOnDelete();
            $table->string('status', 16)->default('dismissed');
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 64)->index();
            $table->string('subject_type', 32)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('meta')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        foreach (['audit_logs', 'duplicate_flags', 'seo_templates', 'cms_pages', 'user_notifications', 'history_entries', 'user_collections', 'leads', 'review_complaints', 'reviews'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
