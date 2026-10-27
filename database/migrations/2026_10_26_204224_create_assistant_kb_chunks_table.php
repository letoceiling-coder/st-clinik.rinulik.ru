<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assistant_kb_chunks', function (Blueprint $table) {
            $table->id();
            $table->string('source_type', 24);
            $table->unsignedBigInteger('source_id')->nullable();
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title', 300);
            $table->text('body');
            $table->text('search_text');
            $table->json('embedding')->nullable();
            $table->timestamp('embedded_at')->nullable();
            $table->timestamps();

            $table->unique(['source_type', 'source_id', 'title']);
            $table->index(['city_id', 'source_type']);
        });

        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS vector');
        DB::statement('ALTER TABLE assistant_kb_chunks ADD COLUMN IF NOT EXISTS embedding_vector vector(1536)');
        DB::statement('CREATE INDEX IF NOT EXISTS assistant_kb_chunks_embedding_vector_hnsw_idx ON assistant_kb_chunks USING hnsw (embedding_vector vector_cosine_ops)');
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS assistant_kb_chunks_embedding_vector_hnsw_idx');
            DB::statement('ALTER TABLE assistant_kb_chunks DROP COLUMN IF EXISTS embedding_vector');
        }

        Schema::dropIfExists('assistant_kb_chunks');
    }
};
