<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->string('reply_status', 20)->nullable()->after('reply_by');
            $table->text('reply_moderation_note')->nullable()->after('reply_status');
        });

        DB::table('reviews')
            ->whereNotNull('reply_text')
            ->whereNull('reply_status')
            ->update(['reply_status' => 'published']);
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn(['reply_status', 'reply_moderation_note']);
        });
    }
};
