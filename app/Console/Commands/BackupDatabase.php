<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

class BackupDatabase extends Command
{
    protected $signature = 'db:backup
        {--keep=14 : Сколько последних копий хранить}';

    protected $description = 'Резервная копия PostgreSQL (pg_dump, gzip) в storage/app/backups с ротацией';

    public function handle(): int
    {
        $config = config('database.connections.'.config('database.default'));

        if (($config['driver'] ?? null) !== 'pgsql') {
            $this->error('Резервное копирование поддерживается только для PostgreSQL.');

            return self::FAILURE;
        }

        $dir = storage_path('app/backups');
        File::ensureDirectoryExists($dir);
        $path = $dir.'/db-'.now()->format('Ymd-His').'.sql.gz';

        $result = Process::env(['PGPASSWORD' => (string) $config['password']])
            ->timeout(900)
            ->run(sprintf(
                'pg_dump --no-owner --no-privileges -h %s -p %s -U %s %s | gzip > %s',
                escapeshellarg((string) $config['host']),
                escapeshellarg((string) $config['port']),
                escapeshellarg((string) $config['username']),
                escapeshellarg((string) $config['database']),
                escapeshellarg($path),
            ));

        if (! $result->successful() || ! File::exists($path) || File::size($path) < 100) {
            File::delete($path);
            $this->error('pg_dump завершился с ошибкой: '.trim($result->errorOutput()));

            return self::FAILURE;
        }

        $this->pruneOldBackups($dir, max(1, (int) $this->option('keep')));
        $this->info('Копия создана: '.basename($path).' ('.round(File::size($path) / 1024).' КБ)');

        return $this->uploadOffsite($path);
    }

    /** Копия вне сервера, если в центре интеграций настроено хранилище S3. */
    private function uploadOffsite(string $path): int
    {
        if (blank(config('filesystems.disks.backups.bucket')) || blank(config('filesystems.disks.backups.secret'))) {
            $this->line('S3 не настроен — копия хранится только на сервере.');

            return self::SUCCESS;
        }

        $stream = fopen($path, 'rb');

        try {
            Storage::disk('backups')->writeStream('db/'.basename($path), $stream);
        } catch (\Throwable $e) {
            $this->error('Не удалось загрузить копию в S3: '.$e->getMessage());

            return self::FAILURE;
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        $this->info('Копия загружена в S3: db/'.basename($path));

        return self::SUCCESS;
    }

    private function pruneOldBackups(string $dir, int $keep): void
    {
        collect(File::glob($dir.'/db-*.sql.gz'))
            ->sortDesc()
            ->slice($keep)
            ->each(fn (string $file) => File::delete($file));
    }
}
