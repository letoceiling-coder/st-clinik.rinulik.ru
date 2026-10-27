<?php

namespace App\Http\Controllers;

use App\Models\Clinic;
use App\Repositories\Contracts\ClinicRepository;
use App\Services\Broadcasts\ClinicFollowerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ClinicFollowController extends Controller
{
    public function store(Request $request, string $slug, ClinicRepository $clinics, ClinicFollowerService $followers): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $clinic = $clinics->findPublishedBySlug($slug) ?? abort(404);
        $followers->subscribe($user, $clinic);

        return back()->with('success', 'Вы подписались на новости и акции клиники.');
    }

    public function destroy(Request $request, Clinic $clinic, ClinicFollowerService $followers): RedirectResponse
    {
        $followers->unsubscribe($request->user(), $clinic);

        return back()->with('success', 'Подписка на клинику отменена.');
    }
}
