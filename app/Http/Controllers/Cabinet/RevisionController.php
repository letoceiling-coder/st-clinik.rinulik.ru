<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\ContentRevision;
use App\Services\Audit;
use App\Services\ContentRevisionService;
use App\Services\Organization\CabinetAuthorization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** Клиника отзывает свои изменения, отправленные на модерацию. */
class RevisionController extends CabinetController
{
    public function withdraw(Request $request, ContentRevision $revision, ContentRevisionService $revisions): RedirectResponse
    {
        abort_unless((int) $revision->organization_id === (int) $request->attributes->get('org')->id, 404);
        $ability = $revision->section === 'organization'
            ? CabinetAuthorization::ABILITY_MANAGE_ORGANIZATION
            : CabinetAuthorization::ABILITY_MANAGE_CONTENT;
        abort_unless($this->can($request, $ability), 403, 'Недостаточно прав для этого действия.');
        abort_unless($revision->status === ContentRevision::STATUS_PENDING && $revision->isPreModeration(), 422, 'Эти изменения уже проверены.');

        $revisions->withdraw($revision);
        Audit::log('revision.withdrawn', $revision->subject, ['revision_id' => $revision->id]);

        return back()->with('success', 'Изменения отозваны.');
    }
}
