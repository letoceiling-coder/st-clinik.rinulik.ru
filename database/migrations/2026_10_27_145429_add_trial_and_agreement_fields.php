<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('agreement_version', 40)->nullable();
            $table->timestamp('agreement_accepted_at')->nullable();
            $table->string('agreement_ip_hash', 64)->nullable();
            $table->timestamp('trial_requested_at')->nullable();
            $table->timestamp('trial_used_at')->nullable();
        });

        Schema::table('clinic_subscriptions', function (Blueprint $table) {
            $table->boolean('is_trial')->default(false);
        });

        if (! DB::table('cms_pages')->where('slug', 'clinic-agreement')->exists()) {
            DB::table('cms_pages')->insert([
                'slug' => 'clinic-agreement',
                'title' => 'Соглашение с клиникой',
                'kind' => 'legal',
                'body' => require database_path('seeders/data/clinic-agreement.php'),
                'meta_description' => 'Условия размещения клиники на СтомКлиник и пробного периода.',
                'status' => 'published',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn(['agreement_version', 'agreement_accepted_at', 'agreement_ip_hash', 'trial_requested_at', 'trial_used_at']);
        });

        Schema::table('clinic_subscriptions', function (Blueprint $table) {
            $table->dropColumn('is_trial');
        });
    }
};
