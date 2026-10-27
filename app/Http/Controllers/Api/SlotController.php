<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Services\SlotAvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SlotController extends Controller
{
    public function __construct(private readonly SlotAvailabilityService $slots) {}

    /** Свободное время на дату: ?doctor=&service=&date=YYYY-MM-DD */
    public function index(Request $request, string $slug): JsonResponse
    {
        $clinic = $this->clinic($slug);
        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'doctor' => ['nullable', 'integer'],
            'service' => ['nullable', 'integer'],
        ]);

        $date = Carbon::parse($data['date']);
        $serviceId = $data['service'] ?? null;

        return response()->json(['data' => [
            'date' => $date->toDateString(),
            'duration' => $this->slots->durationFor($clinic, $serviceId),
            'slots' => $this->slots->slotsForDay($clinic, $data['doctor'] ?? null, $serviceId, $date),
        ]]);
    }

    /** Сколько свободных слотов по дням: ?doctor=&service=&from=YYYY-MM-DD&days=14 */
    public function days(Request $request, string $slug): JsonResponse
    {
        $clinic = $this->clinic($slug);
        $data = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'days' => ['nullable', 'integer', 'between:1,31'],
            'doctor' => ['nullable', 'integer'],
            'service' => ['nullable', 'integer'],
        ]);

        return response()->json(['data' => $this->slots->availableDays(
            $clinic,
            $data['doctor'] ?? null,
            $data['service'] ?? null,
            isset($data['from']) ? Carbon::parse($data['from']) : today(),
            (int) ($data['days'] ?? 14),
        )]);
    }

    private function clinic(string $slug): Clinic
    {
        return Clinic::query()->published()->where('slug', $slug)->firstOrFail();
    }
}
