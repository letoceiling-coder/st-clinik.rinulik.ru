<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stop_list_entries', function (Blueprint $table) {
            $table->id();
            $table->string('channel', 20);
            $table->string('value');
            $table->string('reason', 30);
            $table->string('note', 500)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['channel', 'value']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stop_list_entries');
    }
};
