<?php

use App\Http\Controllers\Api\V1Controller;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->middleware('throttle:api')->group(function () {
    Route::get('/cities', [V1Controller::class, 'cities'])->name('cities');
    Route::get('/specialties', [V1Controller::class, 'specialties'])->name('specialties');
    Route::get('/services', [V1Controller::class, 'services'])->name('services');
    Route::get('/concerns', [V1Controller::class, 'concerns'])->name('concerns');

    Route::get('/clinics', [V1Controller::class, 'clinicsIndex'])->name('clinics');
    Route::get('/clinics/by-ids', [V1Controller::class, 'clinicsByIds'])->name('clinics.by-ids');
    Route::get('/clinics/{slug}', [V1Controller::class, 'clinic'])->name('clinics.show');
    Route::get('/clinics/{slug}/doctors', [V1Controller::class, 'clinicDoctors'])->name('clinics.doctors');
    Route::get('/clinics/{slug}/reviews', [V1Controller::class, 'clinicReviews'])->name('clinics.reviews');

    Route::get('/doctors', [V1Controller::class, 'doctorsIndex'])->name('doctors');
    Route::get('/doctors/by-ids', [V1Controller::class, 'doctorsByIds'])->name('doctors.by-ids');
    Route::get('/doctors/{slug}', [V1Controller::class, 'doctor'])->name('doctors.show');

    Route::get('/search', [V1Controller::class, 'search'])->name('search');
    Route::get('/search/suggest', [V1Controller::class, 'suggest'])->name('suggest');

    Route::post('/leads', [V1Controller::class, 'lead'])->middleware('throttle:leads')->name('leads');
});
