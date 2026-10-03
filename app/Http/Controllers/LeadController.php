<?php

namespace App\Http\Controllers;

use App\Services\LeadService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function store(Request $request, LeadService $leads): RedirectResponse
    {
        $data = $leads->validate($request->all());
        $leads->create($data, $request->user(), $request->input('source', 'clinic_page'));

        return back()->with('success', 'Заявка отправлена. Клиника свяжется с вами для подтверждения записи.');
    }
}
