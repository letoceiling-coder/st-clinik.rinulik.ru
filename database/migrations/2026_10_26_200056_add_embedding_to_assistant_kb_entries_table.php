<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assistant_kb_entries', function (Blueprint $table) {
            $table->json('embedding')->nullable()->after('search_text');
            $table->timestamp('embedded_at')->nullable()->after('embedding');
        });
    }

    public function down(): void
    {
        Schema::table('assistant_kb_entries', function (Blueprint $table) {
            $table->dropColumn(['embedding', 'embedded_at']);
        });
    }
};
