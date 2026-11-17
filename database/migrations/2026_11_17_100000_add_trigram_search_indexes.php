<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Быстрый поиск и подсказки в PostgreSQL: pg_trgm + GIN по search_text.
 * Индексы ускоряют `ILIKE '%…%'` (whereLike) и позволяют искать с опечатками (word_similarity).
 * На SQLite (локальные тесты) миграция ничего не делает.
 */
return new class extends Migration
{
    /** @var array<string, string> */
    private array $indexes = [
        'clinics' => 'clinics_search_text_trgm',
        'doctors' => 'doctors_search_text_trgm',
        'cities' => 'cities_search_text_trgm',
        'services' => 'services_search_text_trgm',
        'specialties' => 'specialties_search_text_trgm',
        'concerns' => 'concerns_search_text_trgm',
    ];

    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        foreach ($this->indexes as $table => $index) {
            DB::statement("CREATE INDEX IF NOT EXISTS {$index} ON {$table} USING gin (search_text gin_trgm_ops)");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        foreach ($this->indexes as $index) {
            DB::statement("DROP INDEX IF EXISTS {$index}");
        }
    }
};
