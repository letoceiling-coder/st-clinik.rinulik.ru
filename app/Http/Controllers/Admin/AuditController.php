<?php

namespace App\Http\Controllers\Admin;

use App\Models\AuditLog;
use App\Support\AuditActions;
use Illuminate\Http\Request;
use Inertia\Response;

class AuditController extends AdminController
{
    public function index(Request $request): Response
    {
        $section = (string) $request->query('section');
        if (! array_key_exists($section, AuditActions::SECTIONS)) {
            $section = '';
        }

        $page = AuditLog::with('user:id,name,email')
            ->when($section !== '', fn ($b) => $b->whereLike('action', $section.'.%'))
            ->latest('id')->paginate(30)->withQueryString();

        return $this->render('Admin/Audit', 'Журнал аудита', [
            'logs' => $page->through(fn (AuditLog $a) => [
                'id' => $a->id,
                'action' => AuditActions::label($a->action),
                'user' => $a->user ? $a->user->name.' ('.$a->user->email.')' : 'система',
                'subject' => AuditActions::subject($a->subject_type, $a->subject_id),
                'result' => AuditActions::result($a->result),
                'meta' => $a->meta,
                'ip' => $a->ip,
                'at' => $a->created_at?->format('d.m.Y H:i:s'),
            ])->toArray(),
            'sections' => AuditActions::SECTIONS,
            'filters' => array_filter(['section' => $section]),
        ]);
    }
}
