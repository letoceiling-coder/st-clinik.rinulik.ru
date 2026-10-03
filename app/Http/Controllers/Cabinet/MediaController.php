<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\ClinicDocument;
use App\Models\ClinicPhoto;
use App\Services\Audit;
use App\Services\ProfileMetrics;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Фотографии (публичный диск) и документы (приватный диск, только метаданные наружу). */
class MediaController extends CabinetController
{
    public const PHOTO_KINDS = ['exterior' => 'Фасад', 'interior' => 'Интерьер', 'office' => 'Кабинет', 'equipment' => 'Оборудование', 'team' => 'Команда'];

    public const DOC_TYPES = ['license' => 'Лицензия', 'certificate' => 'Сертификат', 'other' => 'Другое'];

    public function photos(Request $request): Response
    {
        $branch = $this->branch($request);

        return $this->render($request, 'Cabinet/Photos', 'Фотографии', [
            'photos' => ClinicPhoto::where('clinic_id', $branch->id)->orderBy('sort')->orderBy('id')->get()->map(fn (ClinicPhoto $p) => [
                'id' => $p->id, 'kind' => $p->kind, 'caption' => $p->caption, 'status' => $p->status,
                'url' => $p->path ? Storage::disk('public')->url($p->path) : null, 'art_seed' => $p->art_seed,
            ]),
            'kinds' => self::PHOTO_KINDS,
        ]);
    }

    public function storePhoto(Request $request): RedirectResponse
    {
        $branch = $this->branch($request);
        $data = $request->validate([
            'photo' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120|dimensions:min_width=600,min_height=400',
            'kind' => 'required|in:'.implode(',', array_keys(self::PHOTO_KINDS)),
            'caption' => 'nullable|string|max:120',
        ], [
            'photo.required' => 'Выберите файл.', 'photo.image' => 'Файл должен быть изображением.',
            'photo.mimes' => 'Допустимые форматы: JPG, PNG, WebP.', 'photo.max' => 'Размер файла — не более 5 МБ.',
            'photo.dimensions' => 'Минимальный размер изображения — 600×400 px.',
        ]);

        abort_if(ClinicPhoto::where('clinic_id', $branch->id)->count() >= 30, 422, 'Достигнут лимит в 30 фотографий.');

        $path = $request->file('photo')->store("clinic-photos/{$branch->id}", 'public');
        ClinicPhoto::create([
            'clinic_id' => $branch->id, 'kind' => $data['kind'], 'caption' => $data['caption'] ?? null,
            'path' => $path, 'status' => 'pending', 'sort' => 100,
        ]);
        Audit::log('photo.uploaded', $branch);

        return back()->with('success', 'Фото загружено и отправлено на модерацию.');
    }

    public function updatePhoto(Request $request, ClinicPhoto $photo): RedirectResponse
    {
        $this->ownedBy($request, $photo);
        $photo->update($request->validate([
            'kind' => 'required|in:'.implode(',', array_keys(self::PHOTO_KINDS)),
            'caption' => 'nullable|string|max:120',
        ]));

        return back()->with('success', 'Подпись сохранена.');
    }

    public function destroyPhoto(Request $request, ClinicPhoto $photo): RedirectResponse
    {
        $this->ownedBy($request, $photo);
        if ($photo->path) {
            Storage::disk('public')->delete($photo->path);
        }
        $photo->delete();
        app(ProfileMetrics::class)->recalcClinic($this->branch($request));

        return back()->with('success', 'Фото удалено.');
    }

    // --- документы ------------------------------------------------------

    public function documents(Request $request): Response
    {
        $branch = $this->branch($request);

        return $this->render($request, 'Cabinet/Documents', 'Документы', [
            'documents' => ClinicDocument::where('clinic_id', $branch->id)->latest()->get()->map(fn (ClinicDocument $d) => [
                'id' => $d->id, 'type' => $d->type, 'title' => $d->title, 'number' => $d->number,
                'issued_at' => $d->issued_at?->toDateString(), 'expires_at' => $d->expires_at?->toDateString(),
                'status' => $d->status, 'reviewer_note' => $d->reviewer_note, 'has_file' => (bool) $d->path,
            ]),
            'types' => self::DOC_TYPES,
        ]);
    }

    public function storeDocument(Request $request): RedirectResponse
    {
        $branch = $this->branch($request);
        $data = $request->validate([
            'type' => 'required|in:'.implode(',', array_keys(self::DOC_TYPES)),
            'title' => 'required|string|max:160',
            'number' => 'nullable|string|max:80',
            'issued_at' => 'nullable|date|before_or_equal:today',
            'expires_at' => 'nullable|date|after:issued_at',
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:8192',
        ], [
            'title.required' => 'Укажите название документа.', 'file.required' => 'Приложите скан или фото документа.',
            'file.mimes' => 'Допустимые форматы: PDF, JPG, PNG.', 'file.max' => 'Размер файла — не более 8 МБ.',
        ]);

        $path = $request->file('file')->store("clinic-docs/{$branch->id}", 'local');
        unset($data['file']);
        ClinicDocument::create($data + ['clinic_id' => $branch->id, 'path' => $path, 'status' => 'pending']);
        Audit::log('document.uploaded', $branch, ['type' => $data['type']]);

        return back()->with('success', 'Документ загружен и отправлен на проверку. В каталоге публикуются только номер и статус проверки.');
    }

    public function destroyDocument(Request $request, ClinicDocument $document): RedirectResponse
    {
        $this->ownedBy($request, $document);
        if ($document->path) {
            Storage::disk('local')->delete($document->path);
        }
        $document->delete();
        app(ProfileMetrics::class)->recalcClinic($this->branch($request));

        return back()->with('success', 'Документ удалён.');
    }

    public function downloadDocument(Request $request, ClinicDocument $document): StreamedResponse
    {
        $this->ownedBy($request, $document);
        abort_unless($document->path && Storage::disk('local')->exists($document->path), 404);

        return Storage::disk('local')->download($document->path);
    }
}
