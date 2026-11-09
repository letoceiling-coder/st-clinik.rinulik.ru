<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\ClinicPost;
use App\Services\Audit;
use App\Services\ContentRevisionService;
use App\Support\Text;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Response;

class PostController extends CabinetController
{
    public function index(Request $request): Response
    {
        $branch = $this->branch($request);

        return $this->render($request, 'Cabinet/Posts', 'Новости и акции', [
            'posts' => ClinicPost::where('clinic_id', $branch->id)
                ->orderByDesc('is_pinned')
                ->orderBy('sort')
                ->orderByDesc('id')
                ->get()
                ->map(fn (ClinicPost $post) => $this->payload($post)),
            'types' => ClinicPost::TYPES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $branch = $this->branch($request);
        $data = $this->validated($request);
        $slug = $this->uniqueSlug($branch->id, Text::slug($data['title']));

        $path = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store("clinic-posts/{$branch->id}", 'public');
        }

        ClinicPost::create([
            'clinic_id' => $branch->id,
            'type' => $data['type'],
            'title' => $data['title'],
            'slug' => $slug,
            'excerpt' => $data['excerpt'] ?? null,
            'body' => $data['body'],
            'image_path' => $path,
            'starts_at' => $data['starts_at'] ?? null,
            'ends_at' => $data['ends_at'] ?? null,
            'is_pinned' => (bool) ($data['is_pinned'] ?? false),
            'status' => 'pending',
            'sort' => 100,
        ]);

        Audit::log('post.created', $branch, ['title' => $data['title']]);

        return back()->with('success', 'Публикация отправлена на модерацию и появится на сайте после проверки.');
    }

    public function update(Request $request, ClinicPost $post): RedirectResponse
    {
        $this->ownedBy($request, $post);
        $data = $this->validated($request);

        $updates = [
            'type' => $data['type'],
            'title' => $data['title'],
            'excerpt' => $data['excerpt'] ?? null,
            'body' => $data['body'],
            'starts_at' => $data['starts_at'] ?? null,
            'ends_at' => $data['ends_at'] ?? null,
            'is_pinned' => (bool) ($data['is_pinned'] ?? false),
        ];

        // Опубликованная публикация меняется через модерацию: на сайте остаётся прежний текст.
        $revisions = app(ContentRevisionService::class);
        if ($revisions->requiresModeration($post)) {
            if ($request->hasFile('image')) {
                $updates['image_path'] = $request->file('image')->store("clinic-posts/{$post->clinic_id}", 'public');
            } elseif ($request->boolean('remove_image')) {
                $updates['image_path'] = null;
            }
            $revision = $revisions->propose($post, 'post', $updates, $request->user());
            Audit::log('post.update_proposed', $post->clinic, ['title' => $post->title]);

            return back()->with('success', $revision ? 'Изменения отправлены на модерацию.' : 'Изменений нет.');
        }

        // Отклонённая публикация после исправления снова уходит на проверку.
        if ($post->status === 'draft') {
            $updates['status'] = 'pending';
            $updates['moderation_note'] = null;
        }

        if ($request->boolean('remove_image') && $post->image_path) {
            Storage::disk('public')->delete($post->image_path);
            $updates['image_path'] = null;
        }

        if ($request->hasFile('image')) {
            if ($post->image_path) {
                Storage::disk('public')->delete($post->image_path);
            }
            $updates['image_path'] = $request->file('image')->store("clinic-posts/{$post->clinic_id}", 'public');
        }

        $post->update($updates);
        Audit::log('post.updated', $post->clinic, ['title' => $post->title]);

        return back()->with('success', 'Публикация обновлена.');
    }

    public function destroy(Request $request, ClinicPost $post): RedirectResponse
    {
        $this->ownedBy($request, $post);
        if ($post->image_path) {
            Storage::disk('public')->delete($post->image_path);
        }
        $post->delete();
        Audit::log('post.deleted', $this->branch($request), ['title' => $post->title]);

        return back()->with('success', 'Публикация удалена.');
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        return $request->validate([
            'type' => 'required|in:'.implode(',', array_keys(ClinicPost::TYPES)),
            'title' => 'required|string|min:3|max:160',
            'excerpt' => 'nullable|string|max:400',
            'body' => 'required|string|min:10|max:5000',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'is_pinned' => 'nullable|boolean',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'remove_image' => 'nullable|boolean',
        ], [
            'title.required' => 'Укажите заголовок.',
            'body.required' => 'Добавьте текст публикации.',
            'body.min' => 'Текст — не менее 10 символов.',
            'image.image' => 'Обложка должна быть изображением.',
            'image.max' => 'Размер обложки — не более 5 МБ.',
        ]);
    }

    private function uniqueSlug(int $clinicId, string $base): string
    {
        $slug = $base ?: 'post';
        $n = 2;
        while (ClinicPost::where('clinic_id', $clinicId)->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$n++;
        }

        return $slug;
    }

    /** @return array<string, mixed> */
    private function payload(ClinicPost $post): array
    {
        $revisions = app(ContentRevisionService::class);

        return $revisions->overlay($post, [
            'id' => $post->id,
            'type' => $post->type,
            'title' => $post->title,
            'slug' => $post->slug,
            'excerpt' => $post->excerpt,
            'body' => $post->body,
            'starts_at' => $post->starts_at?->toDateString(),
            'ends_at' => $post->ends_at?->toDateString(),
            'is_pinned' => $post->is_pinned,
            'status' => $post->status,
            'image_url' => $post->image_path ? Storage::disk('public')->url($post->image_path) : null,
            'published_at' => $post->created_at?->format('d.m.Y'),
            'moderation_note' => $post->moderation_note,
        ]) + ['pending_revision' => $revisions->pendingSummary($post)];
    }
}
