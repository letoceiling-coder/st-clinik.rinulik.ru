<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->string('yandex_org_id', 32)->nullable()->unique()->after('slug');
            $table->string('yandex_source_url', 500)->nullable()->after('yandex_org_id');
        });
    }

    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropUnique(['yandex_org_id']);
            $table->dropColumn(['yandex_org_id', 'yandex_source_url']);
        });
    }
};
