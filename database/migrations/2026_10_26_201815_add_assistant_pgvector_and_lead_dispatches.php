<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->boolean('accepts_assistant_leads')->default(true)->after('status');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->boolean('assistant_broadcast')->default(false)->after('source');
        });

        Schema::create('lead_dispatches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('status', 16)->default('sent');
            $table->timestamp('viewed_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
            $table->unique(['lead_id', 'clinic_id']);
            $table->index(['clinic_id', 'status']);
        });

        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS vector');
        DB::statement('ALTER TABLE assistant_kb_entries ADD COLUMN IF NOT EXISTS embedding_vector vector(1536)');

        $rows = DB::table('assistant_kb_entries')
            ->whereNotNull('embedding')
            ->get(['id', 'embedding']);

        foreach ($rows as $row) {
            $vector = json_decode((string) $row->embedding, true);
            if (! is_array($vector) || $vector === []) {
                continue;
            }
            $literal = $this->vectorLiteral($vector);
            DB::statement('UPDATE assistant_kb_entries SET embedding_vector = ?::vector WHERE id = ?', [$literal, $row->id]);
        }

        DB::statement('CREATE INDEX IF NOT EXISTS assistant_kb_entries_embedding_vector_hnsw_idx ON assistant_kb_entries USING hnsw (embedding_vector vector_cosine_ops)');
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS assistant_kb_entries_embedding_vector_hnsw_idx');
            DB::statement('ALTER TABLE assistant_kb_entries DROP COLUMN IF EXISTS embedding_vector');
        }

        Schema::dropIfExists('lead_dispatches');

        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn('assistant_broadcast');
        });

        Schema::table('clinics', function (Blueprint $table) {
            $table->dropColumn('accepts_assistant_leads');
        });
    }

    /** @param  list<float|int>  $vector */
    private function vectorLiteral(array $vector): string
    {
        $parts = array_map(static fn ($v) => is_numeric($v) ? (string) (float) $v : '0', $vector);

        return '['.implode(',', $parts).']';
    }
};
