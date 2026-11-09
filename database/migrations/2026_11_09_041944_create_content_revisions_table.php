<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->nullable()->constrained()->cascadeOnDelete();
            $table->morphs('subject');
            // pre — правка ждёт одобрения, на сайте прежняя версия; post — уже применена, проверка постфактум.
            $table->string('mode', 8);
            $table->string('section', 32);
            $table->json('original')->nullable();
            $table->json('payload')->nullable();
            $table->string('status', 16)->default('pending')->index();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('moderation_note', 500)->nullable();
            $table->timestamps();

            $table->index(['subject_type', 'subject_id', 'status']);
        });

        Schema::table('clinic_posts', function (Blueprint $table) {
            $table->string('moderation_note', 500)->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('clinic_posts', function (Blueprint $table) {
            $table->dropColumn('moderation_note');
        });
        Schema::dropIfExists('content_revisions');
    }
};
