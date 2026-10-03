<?php

namespace App\Http\Controllers\Admin;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Response;

class AuditController extends AdminController
{
    public function index(Request $request): Response
    {
        $action = trim((string) $request->query('action'));

        $page = AuditLog::with('user:id,name,email')
            ->when($action !== '', fn ($b) => $b->where('action', 'like', "$action%"))
            ->latest('id')->paginate(30)->withQueryString();

        return $this->render('Admin/Audit', 'Журнал аудита', [
            'logs' => $page->through(fn (AuditLog $a) => [
                'id' => $a->id, 'action' => $a->action, 'user' => $a->user ? $a->user->name.' ('.$a->user->email.')' : 'система',
                'subject' => $a->subject_type ? $a->subject_type.' #'.$a->subject_id : null,
                'meta' => $a->meta, 'ip' => $a->ip, 'at' => $a->created_at?->format('d.m.Y H:i:s'),
            ])->toArray(),
            'filters' => array_filter(['action' => $action]),
        ]);
    }
}
