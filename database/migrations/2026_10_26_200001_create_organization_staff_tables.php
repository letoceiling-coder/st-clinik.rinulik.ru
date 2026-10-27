<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('ogrn', 15)->nullable()->after('inn');
            $table->string('kpp', 9)->nullable()->after('ogrn');
            $table->string('legal_address')->nullable()->after('kpp');
            $table->string('license_number')->nullable()->after('legal_address');
            $table->string('license_issuer')->nullable()->after('license_number');
            $table->date('license_date')->nullable()->after('license_issuer');
        });

        Schema::create('organization_staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 32);
            $table->timestamp('invited_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'user_id']);
            $table->index(['organization_id', 'role']);
        });

        Schema::create('staff_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invited_by')->constrained('users')->cascadeOnDelete();
            $table->string('email')->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('role', 32);
            $table->string('token', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('accepted_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['organization_id', 'accepted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_invitations');
        Schema::dropIfExists('organization_staff');
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn(['ogrn', 'kpp', 'legal_address', 'license_number', 'license_issuer', 'license_date']);
        });
    }
};
