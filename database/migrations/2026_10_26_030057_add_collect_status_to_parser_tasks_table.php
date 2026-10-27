<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parser_tasks', function (Blueprint $table) {
            $table->json('remote')->nullable()->after('error');
            $table->unsignedInteger('collected_count')->default(0)->after('new_count');
            $table->string('status_page_url', 500)->nullable()->after('remote');
            $table->timestamp('result_fetched_at')->nullable()->after('last_polled_at');
        });
    }

    public function down(): void
    {
        Schema::table('parser_tasks', function (Blueprint $table) {
            $table->dropColumn(['remote', 'collected_count', 'status_page_url', 'result_fetched_at']);
        });
    }
};
