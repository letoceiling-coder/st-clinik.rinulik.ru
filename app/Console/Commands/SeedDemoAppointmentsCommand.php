<?php

namespace App\Console\Commands;

use App\Models\Clinic;
use App\Services\DemoAppointmentSeeder;
use Illuminate\Console\Command;

class SeedDemoAppointmentsCommand extends Command
{
    protected $signature = 'appointments:seed-demo
                            {--clinic=evrodent-moskva : Slug клиники}
                            {--fill=0.7 : Доля занятых слотов (0–1)}
                            {--months=3 : Месяцев до и после текущей даты}
                            {--keep : Не удалять прежние demo-записи перед заливкой}';

    protected $description = 'Заполнить календарь демо-записями (~70% слотов) на несколько месяцев';

    public function handle(DemoAppointmentSeeder $seeder): int
    {
        $slug = (string) $this->option('clinic');
        $clinic = Clinic::query()->where('slug', $slug)->first();

        if (! $clinic) {
            $this->error("Клиника «{$slug}» не найдена.");

            return self::FAILURE;
        }

        $fill = max(0.1, min(1.0, (float) $this->option('fill')));
        $months = max(1, (int) $this->option('months'));

        $count = $seeder->seed(
            $clinic,
            $fill,
            $months,
            $months,
            ! (bool) $this->option('keep'),
        );

        $this->info("Создано записей: {$count} (клиника «{$clinic->name}», ±{$months} мес., fill {$fill}).");

        return self::SUCCESS;
    }
}
