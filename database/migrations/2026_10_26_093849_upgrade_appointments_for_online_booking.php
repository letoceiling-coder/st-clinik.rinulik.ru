<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('created_by')->constrained()->nullOnDelete();
            $table->dateTime('requested_starts_at')->nullable()->after('ends_at');
            $table->dateTime('requested_ends_at')->nullable()->after('requested_starts_at');
            $table->string('cancel_reason', 300)->nullable()->after('notes');
            $table->boolean('is_child')->default(false)->after('patient_phone');
            $table->timestamp('consent_at')->nullable();
            $table->string('consent_version', 16)->nullable();
            $table->string('ip_hash', 64)->nullable();

            $table->index(['user_id', 'starts_at']);
            $table->index(['doctor_id', 'starts_at']);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->string('status', 16)->default('new')->change();
        });

        DB::table('appointments')->where('status', 'booked')->update(['status' => 'confirmed']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS btree_gist');
            DB::statement(<<<'SQL'
                ALTER TABLE appointments ADD CONSTRAINT appointments_doctor_no_overlap
                EXCLUDE USING gist (doctor_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&)
                WHERE (doctor_id IS NOT NULL AND status NOT IN ('cancelled', 'no_show'))
                SQL);
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_doctor_no_overlap');
        }

        DB::table('appointments')->whereIn('status', ['new', 'pending', 'rescheduled'])->update(['status' => 'booked']);

        Schema::table('appointments', function (Blueprint $table) {
            $table->string('status', 16)->default('booked')->change();
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'starts_at']);
            $table->dropIndex(['doctor_id', 'starts_at']);
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn(['requested_starts_at', 'requested_ends_at', 'cancel_reason', 'is_child', 'consent_at', 'consent_version', 'ip_hash']);
        });
    }
};
