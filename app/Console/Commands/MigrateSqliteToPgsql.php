<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class MigrateSqliteToPgsql extends Command
{
    protected $signature = 'db:migrate-sqlite-to-pgsql
        {--source=sqlite_legacy : Подключение-источник (SQLite)}
        {--target=pgsql : Подключение-приёмник (PostgreSQL)}
        {--chunk=500 : Размер пакета вставки}
        {--fresh : Пересоздать схему приёмника через migrate:fresh перед переносом}
        {--force : Не спрашивать подтверждение}';

    protected $description = 'Перенос всех данных из SQLite в PostgreSQL с сохранением ID и сверкой количества строк';

    /** Таблицы, которые приёмник ведёт сам или которые не нужно переносить. */
    private const SKIPPED_TABLES = ['migrations', 'cache', 'cache_locks', 'sqlite_sequence'];

    public function handle(): int
    {
        $source = DB::connection((string) $this->option('source'));
        $target = DB::connection((string) $this->option('target'));

        if ($source->getDriverName() !== 'sqlite' || $target->getDriverName() !== 'pgsql') {
            $this->error('Источник должен быть SQLite, приёмник — PostgreSQL.');

            return self::FAILURE;
        }

        if (! $this->option('force') && ! $this->confirm('Все данные в приёмнике будут заменены. Продолжить?')) {
            return self::FAILURE;
        }

        if ($this->option('fresh')) {
            Artisan::call('migrate:fresh', ['--database' => $target->getName(), '--force' => true]);
            $this->line(trim(Artisan::output()));
        }

        $tables = $this->tablesToCopy($source, $target);
        $chunk = max(1, (int) $this->option('chunk'));

        try {
            $target->transaction(function () use ($source, $target, $tables, $chunk): void {
                $target->statement('SET LOCAL session_replication_role = replica');

                $quoted = implode(', ', array_map(fn (string $t) => '"'.$t.'"', $tables));
                $target->statement("TRUNCATE {$quoted} RESTART IDENTITY CASCADE");

                foreach ($tables as $table) {
                    $copied = $this->copyTable($source, $target, $table, $chunk);
                    $this->line("{$table}: {$copied}");
                }
            });
        } catch (Throwable $e) {
            $this->error('Перенос отменён, приёмник откатан: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->resetSequences($target, $tables);

        return $this->verifyCounts($source, $target, $tables) ? self::SUCCESS : self::FAILURE;
    }

    /** @return list<string> */
    private function tablesToCopy(Connection $source, Connection $target): array
    {
        $sourceTables = Schema::connection($source->getName())->getTableListing(schemaQualified: false);
        $targetTables = Schema::connection($target->getName())->getTableListing(schemaQualified: false);

        $missing = array_diff($sourceTables, $targetTables, self::SKIPPED_TABLES);
        foreach ($missing as $table) {
            $this->warn("Таблицы {$table} нет в приёмнике — пропущена.");
        }

        return array_values(array_diff(array_intersect($sourceTables, $targetTables), self::SKIPPED_TABLES));
    }

    private function copyTable(Connection $source, Connection $target, string $table, int $chunk): int
    {
        $columns = collect(Schema::connection($target->getName())->getColumns($table))
            ->mapWithKeys(fn (array $c) => [$c['name'] => strtolower((string) $c['type_name'])]);
        $sourceColumns = Schema::connection($source->getName())->getColumnListing($table);
        $shared = $columns->only($sourceColumns);

        $batch = [];
        $copied = 0;

        foreach ($source->table($table)->select($shared->keys()->all())->cursor() as $row) {
            $batch[] = $this->convertRow((array) $row, $shared->all());

            if (count($batch) >= $chunk) {
                $target->table($table)->insert($batch);
                $copied += count($batch);
                $batch = [];
            }
        }

        if ($batch !== []) {
            $target->table($table)->insert($batch);
            $copied += count($batch);
        }

        return $copied;
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array<string, string>  $types
     * @return array<string, mixed>
     */
    private function convertRow(array $row, array $types): array
    {
        foreach ($row as $column => $value) {
            if ($value === null) {
                continue;
            }

            $row[$column] = match ($types[$column] ?? null) {
                'bool', 'boolean' => (bool) $value,
                'json', 'jsonb' => $value === '' ? null : $value,
                default => $value,
            };
        }

        return $row;
    }

    /** @param  list<string>  $tables */
    private function resetSequences(Connection $target, array $tables): void
    {
        foreach ($tables as $table) {
            if (! Schema::connection($target->getName())->hasColumn($table, 'id')) {
                continue;
            }

            $sequence = $target->selectOne('SELECT pg_get_serial_sequence(?, ?) AS seq', ['"'.$table.'"', 'id'])?->seq ?? null;
            if ($sequence === null) {
                continue;
            }

            $target->statement(
                "SELECT setval(?, COALESCE((SELECT MAX(id) FROM \"{$table}\"), 1), (SELECT MAX(id) IS NOT NULL FROM \"{$table}\"))",
                [$sequence],
            );
        }
    }

    /** @param  list<string>  $tables */
    private function verifyCounts(Connection $source, Connection $target, array $tables): bool
    {
        $rows = [];
        $ok = true;

        foreach ($tables as $table) {
            $from = $source->table($table)->count();
            $to = $target->table($table)->count();
            $ok = $ok && $from === $to;
            $rows[] = [$table, $from, $to, $from === $to ? 'OK' : 'РАСХОЖДЕНИЕ'];
        }

        $this->table(['Таблица', 'SQLite', 'PostgreSQL', ''], $rows);
        $ok ? $this->info('Перенос завершён, количество строк совпадает.') : $this->error('Количество строк не совпадает.');

        return $ok;
    }
}
