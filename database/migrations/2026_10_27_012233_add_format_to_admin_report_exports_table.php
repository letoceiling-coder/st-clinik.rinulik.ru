<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_report_exports', function (Blueprint $table) {
            $table->string('format', 8)->default('csv')->after('report_type');
        });
    }

    public function down(): void
    {
        Schema::table('admin_report_exports', function (Blueprint $table) {
            $table->dropColumn('format');
        });
    }
};
