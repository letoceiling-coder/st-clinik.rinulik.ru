<?php

namespace App\Services\Admin;

use App\Models\AdminReportExport;
use App\Models\Appointment;
use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicPromotion;
use App\Models\Doctor;
use App\Models\Payment;
use App\Models\Review;
use App\Models\Tariff;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Support\Facades\Storage;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Options;
use OpenSpout\Writer\XLSX\Writer;

class AdminReportService
{
    /** @var array<string, string> */
    public const TYPES = [
        'clinics' => 'Клиники',
        'cities' => 'Города',
        'doctors' => 'Врачи',
        'appointments' => 'Записи',
        'payments' => 'Платежи',
        'tariffs' => 'Тарифы',
        'promotions' => 'Продвижение',
        'reviews' => 'Отзывы',
        'users' => 'Пользователи',
    ];

    public function generate(AdminReportExport $export): void
    {
        $export->update(['status' => AdminReportExport::STATUS_PROCESSING]);

        try {
            $path = match ($export->report_type) {
                'clinics' => $this->exportClinics($export),
                'cities' => $this->exportCities($export),
                'doctors' => $this->exportDoctors($export),
                'appointments' => $this->exportAppointments($export),
                'payments' => $this->exportPayments($export),
                'tariffs' => $this->exportTariffs($export),
                'promotions' => $this->exportPromotions($export),
                'reviews' => $this->exportReviews($export),
                'users' => $this->exportUsers($export),
                default => throw new \InvalidArgumentException('Unknown report type'),
            };

            $export->update([
                'status' => AdminReportExport::STATUS_READY,
                'file_path' => $path,
                'ready_at' => now(),
                'error' => null,
            ]);

            UserNotification::query()->create([
                'user_id' => $export->user_id,
                'type' => 'report_ready',
                'title' => 'Отчёт готов',
                'body' => (self::TYPES[$export->report_type] ?? $export->report_type).' — файл можно скачать в разделе «Отчёты».',
                'url' => '/admin/reports',
            ]);
        } catch (\Throwable $e) {
            $export->update([
                'status' => AdminReportExport::STATUS_FAILED,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function exportClinics(AdminReportExport $export): string
    {
        $rows = Clinic::query()
            ->with(['city:id,name', 'organization:id,name'])
            ->orderBy('id')
            ->get()
            ->map(fn (Clinic $c) => [
                $c->id,
                $c->name,
                $c->slug,
                $c->city?->name,
                $c->organization?->name,
                $c->status,
                $c->rating,
                $c->reviews_count,
                $c->address,
            ]);

        return $this->writeSpreadsheet($export, ['id', 'name', 'slug', 'city', 'organization', 'status', 'rating', 'reviews', 'address'], $rows);
    }

    private function exportCities(AdminReportExport $export): string
    {
        $rows = City::query()
            ->with('regionModel:id,name')
            ->withCount('clinics')
            ->orderBy('sort')
            ->orderBy('name')
            ->get()
            ->map(fn (City $c) => [
                $c->id,
                $c->name,
                $c->slug,
                $c->regionModel?->name ?? $c->region,
                $c->population,
                $c->clinics_count,
                $c->is_active ? '1' : '0',
            ]);

        return $this->writeSpreadsheet($export, ['id', 'name', 'slug', 'region', 'population', 'clinics', 'active'], $rows);
    }

    private function exportDoctors(AdminReportExport $export): string
    {
        $rows = Doctor::query()
            ->with(['clinic:id,name,city_id', 'clinic.city:id,name'])
            ->orderBy('id')
            ->limit(50000)
            ->get()
            ->map(fn (Doctor $d) => [
                $d->id,
                $d->name,
                $d->clinic?->name,
                $d->clinic?->city?->name,
                $d->status,
                $d->rating,
                $d->experience_years,
            ]);

        return $this->writeSpreadsheet($export, ['id', 'name', 'clinic', 'city', 'status', 'rating', 'experience_years'], $rows);
    }

    private function exportAppointments(AdminReportExport $export): string
    {
        $filters = $export->filters ?? [];
        $query = Appointment::query()
            ->with(['clinic:id,name,city_id', 'clinic.city:id,name', 'doctor:id,name'])
            ->orderByDesc('starts_at');

        if ($from = $filters['from'] ?? null) {
            $query->whereDate('starts_at', '>=', $from);
        }
        if ($to = $filters['to'] ?? null) {
            $query->whereDate('starts_at', '<=', $to);
        }
        if ($status = $filters['status'] ?? null) {
            $query->where('status', $status);
        }

        $rows = $query->limit(50000)->get()->map(fn (Appointment $a) => [
            $a->id,
            $a->starts_at?->format('Y-m-d H:i'),
            $a->status,
            $a->patient_name,
            $a->patient_phone,
            $a->clinic?->name,
            $a->clinic?->city?->name,
            $a->doctor?->name,
            $a->source,
        ]);

        return $this->writeSpreadsheet($export, ['id', 'starts_at', 'status', 'patient', 'phone', 'clinic', 'city', 'doctor', 'source'], $rows);
    }

    private function exportPayments(AdminReportExport $export): string
    {
        $rows = Payment::query()
            ->with(['clinic:id,name', 'user:id,email'])
            ->where('status', Payment::STATUS_PAID)
            ->orderByDesc('paid_at')
            ->limit(50000)
            ->get()
            ->map(fn (Payment $p) => [
                $p->id,
                $p->kind,
                $p->amount / 100,
                $p->refunded_amount / 100,
                $p->paid_at?->format('Y-m-d H:i'),
                $p->clinic?->name,
                $p->user?->email,
                $p->description,
            ]);

        return $this->writeSpreadsheet($export, ['id', 'kind', 'amount_rub', 'refunded_rub', 'paid_at', 'clinic', 'user_email', 'description'], $rows);
    }

    private function exportTariffs(AdminReportExport $export): string
    {
        $rows = Tariff::query()
            ->withCount('subscriptions')
            ->orderBy('sort')
            ->orderBy('id')
            ->get()
            ->map(fn (Tariff $t) => [
                $t->id,
                $t->name,
                $t->slug,
                $t->price / 100,
                $t->duration_days,
                implode(',', $t->features ?? []),
                $t->subscriptions_count,
                $t->is_active ? '1' : '0',
            ]);

        return $this->writeSpreadsheet($export, ['id', 'name', 'slug', 'price_rub', 'duration_days', 'features', 'subscriptions', 'active'], $rows);
    }

    private function exportPromotions(AdminReportExport $export): string
    {
        $rows = ClinicPromotion::query()
            ->with(['clinic:id,name', 'city:id,name'])
            ->orderByDesc('starts_at')
            ->limit(50000)
            ->get()
            ->map(fn (ClinicPromotion $p) => [
                $p->id,
                $p->clinic?->name,
                $p->city?->name,
                $p->product_code,
                $p->starts_at?->format('Y-m-d'),
                $p->ends_at?->format('Y-m-d'),
                $p->status,
            ]);

        return $this->writeSpreadsheet($export, ['id', 'clinic', 'city', 'product_code', 'starts_at', 'ends_at', 'status'], $rows);
    }

    private function exportReviews(AdminReportExport $export): string
    {
        $rows = Review::query()
            ->with(['clinic:id,name', 'user:id,email'])
            ->orderByDesc('id')
            ->limit(50000)
            ->get()
            ->map(fn (Review $r) => [
                $r->id,
                $r->clinic?->name,
                $r->user?->email,
                $r->rating,
                $r->status,
                $r->created_at?->format('Y-m-d H:i'),
            ]);

        return $this->writeSpreadsheet($export, ['id', 'clinic', 'author_email', 'rating', 'status', 'created_at'], $rows);
    }

    private function exportUsers(AdminReportExport $export): string
    {
        $rows = User::query()
            ->orderByDesc('id')
            ->limit(50000)
            ->get(['id', 'name', 'email', 'phone', 'role', 'status', 'created_at', 'last_login_at'])
            ->map(fn (User $u) => [
                $u->id,
                $u->name,
                $u->email,
                $u->phone,
                $u->role,
                $u->status,
                $u->created_at?->format('Y-m-d H:i'),
                $u->last_login_at?->format('Y-m-d H:i'),
            ]);

        return $this->writeSpreadsheet($export, ['id', 'name', 'email', 'phone', 'role', 'status', 'registered_at', 'last_login_at'], $rows);
    }

    /** @param list<string> $header @param iterable<int, list<mixed>> $rows */
    private function writeSpreadsheet(AdminReportExport $export, array $header, iterable $rows): string
    {
        $format = $export->format ?: AdminReportExport::FORMAT_CSV;
        $ext = $format === AdminReportExport::FORMAT_XLSX ? 'xlsx' : 'csv';
        $relative = 'reports/admin-report-'.$export->id.'.'.$ext;
        Storage::disk('local')->makeDirectory('reports');
        $absolute = Storage::disk('local')->path($relative);

        if ($format === AdminReportExport::FORMAT_XLSX) {
            $writer = new Writer(new Options);
            $writer->openToFile($absolute);
            $writer->addRow(Row::fromValues($header));
            foreach ($rows as $row) {
                $writer->addRow(Row::fromValues(array_map(fn ($cell) => is_scalar($cell) || $cell === null ? $cell : (string) json_encode($cell), $row)));
            }
            $writer->close();

            return $relative;
        }

        $handle = fopen($absolute, 'w');
        if ($handle === false) {
            throw new \RuntimeException('Не удалось создать файл отчёта.');
        }

        fwrite($handle, "\xEF\xBB\xBF");
        fputcsv($handle, $header, ';');
        foreach ($rows as $row) {
            fputcsv($handle, $row, ';');
        }
        fclose($handle);

        return $relative;
    }
}
