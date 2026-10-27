<?php

namespace App\Services\Offers;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Lead;
use App\Models\Service;
use App\Services\DemoAppointmentSeeder;

/**
 * Сгенерированные данные для демо-кабинета черновика: записи в календаре и заявки.
 * Без реальных персональных данных; удаляются при подключении клиники.
 */
class DemoCabinetData
{
    public const LEAD_SOURCE = 'demo';

    private const APPOINTMENT_NOTE = 'demo-calendar';

    /** @var list<string> */
    private const NAMES = ['Анна', 'Пётр', 'Мария', 'Дмитрий', 'Елена', 'Игорь', 'Ольга', 'Сергей', 'Наталья', 'Алексей', 'Ирина', 'Михаил'];

    private const LEADS = 18;

    public function __construct(private readonly DemoAppointmentSeeder $appointments) {}

    public function ensure(Clinic $clinic): void
    {
        if (! Appointment::query()->where('clinic_id', $clinic->id)->where('notes', self::APPOINTMENT_NOTE)->exists()) {
            $this->appointments->seed($clinic, fillRatio: 0.45, monthsBefore: 1, monthsAfter: 1);
        }
        if (! Lead::query()->where('clinic_id', $clinic->id)->where('source', self::LEAD_SOURCE)->exists()) {
            $this->seedLeads($clinic);
        }
    }

    public function purge(Clinic $clinic): void
    {
        Appointment::query()->where('clinic_id', $clinic->id)->where('notes', self::APPOINTMENT_NOTE)->delete();
        Lead::query()->where('clinic_id', $clinic->id)->where('source', self::LEAD_SOURCE)->delete();
    }

    private function seedLeads(Clinic $clinic): void
    {
        $serviceIds = Service::query()->inRandomOrder()->limit(8)->pluck('id')->all();
        $statuses = ['new', 'new', 'confirmed', 'confirmed', 'completed', 'completed', 'completed', 'cancelled', 'no_show'];

        for ($i = 0; $i < self::LEADS; $i++) {
            $createdAt = now()->subDays(random_int(0, 29))->setTime(random_int(9, 20), random_int(0, 59));
            Lead::query()->create([
                'clinic_id' => $clinic->id,
                'service_id' => $serviceIds !== [] ? $serviceIds[array_rand($serviceIds)] : null,
                'name' => self::NAMES[array_rand(self::NAMES)].' (демо)',
                'phone' => '+7900000'.str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT),
                'preferred_date' => $createdAt->copy()->addDays(random_int(1, 5))->toDateString(),
                'status' => $statuses[array_rand($statuses)],
                'source' => self::LEAD_SOURCE,
                'consent_at' => $createdAt,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
        }
    }
}
