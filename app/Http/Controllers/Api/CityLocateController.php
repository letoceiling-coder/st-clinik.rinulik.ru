<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CityGeolocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CityLocateController extends Controller
{
    public function store(Request $request, CityGeolocationService $geo): JsonResponse
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $city = $geo->nearestCity((float) $data['lat'], (float) $data['lng']);
        if ($city === null) {
            return response()->json([
                'ok' => false,
                'message' => 'Не нашли город рядом с вашим местоположением. Выберите из списка.',
            ], 422);
        }

        return response()->json([
            'ok' => true,
            'city' => [
                'slug' => $city->slug,
                'name' => $city->name,
                'name_in' => $city->name_in,
            ],
        ]);
    }
}
