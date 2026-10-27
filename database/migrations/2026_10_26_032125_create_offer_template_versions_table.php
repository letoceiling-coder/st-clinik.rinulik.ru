<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offer_template_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('offer_template_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->string('web_title');
            $table->text('web_body');
            $table->string('email_subject');
            $table->text('email_body');
            $table->string('sms_text', 300);
            $table->text('messenger_text');
            $table->string('call_script', 4000)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['offer_template_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offer_template_versions');
    }
};
