<?php

namespace App\Services\Assistant;

use App\Models\AssistantKbChunk;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Support\PgVector;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Индекс опубликованных клиник и врачей для семантического search_knowledge. */
class AssistantCatalogIndexService
{
    public function __construct(
        private readonly OpenRouterEmbeddingClient $embeddings,
        private readonly AssistantSettings $settings,
    ) {}

    public function reindexAll(): int
    {
        $count = 0;
        Clinic::query()->published()->orderBy('id')->chunkById(50, function ($clinics) use (&$count) {
            foreach ($clinics as $clinic) {
                $count += $this->indexClinic($clinic);
            }
        });

        Doctor::query()->published()->orderBy('id')->chunkById(50, function ($doctors) use (&$count) {
            foreach ($doctors as $doctor) {
                $count += $this->indexDoctor($doctor);
            }
        });

        return $count;
    }

    public function indexClinic(Clinic $clinic): int
    {
        if ($clinic->status !== 'published') {
            AssistantKbChunk::query()
                ->where('source_type', AssistantKbChunk::SOURCE_CLINIC)
                ->where('source_id', $clinic->id)
                ->delete();

            return 0;
        }

        $clinic->loadMissing(['city:id,name', 'clinicServices.service:id,name']);

        $priceLines = $clinic->clinicServices
            ->map(fn ($row) => trim(($row->service?->name ?? '').($row->price_from ? ' от '.$row->price_from.' ₽' : '')))
            ->filter()
            ->take(25)
            ->implode('; ');

        $body = trim(collect([
            $clinic->tagline,
            Str::limit(strip_tags((string) $clinic->description), 1200),
            $clinic->address,
            $priceLines !== '' ? 'Услуги и цены: '.$priceLines : null,
        ])->filter()->implode("\n"));

        $title = $clinic->name.' · '.$clinic->city?->name;

        return $this->upsertChunk(
            AssistantKbChunk::SOURCE_CLINIC,
            $clinic->id,
            $clinic->city_id,
            $title,
            $body,
        ) ? 1 : 0;
    }

    public function indexDoctor(Doctor $doctor): int
    {
        if ($doctor->status !== 'published') {
            AssistantKbChunk::query()
                ->where('source_type', AssistantKbChunk::SOURCE_DOCTOR)
                ->where('source_id', $doctor->id)
                ->delete();

            return 0;
        }

        $doctor->loadMissing(['clinic:id,name,city_id,slug', 'specialties:id,name']);

        $title = $doctor->name;
        $body = trim(collect([
            $doctor->specialties->pluck('name')->implode(', '),
            $doctor->clinic?->name,
            $doctor->position,
        ])->filter()->implode("\n"));

        return $this->upsertChunk(
            AssistantKbChunk::SOURCE_DOCTOR,
            $doctor->id,
            $doctor->clinic?->city_id,
            $title,
            $body,
        ) ? 1 : 0;
    }

    private function upsertChunk(string $type, int $sourceId, ?int $cityId, string $title, string $body): bool
    {
        if ($body === '') {
            return false;
        }

        $chunk = AssistantKbChunk::query()->updateOrCreate(
            [
                'source_type' => $type,
                'source_id' => $sourceId,
                'title' => $title,
            ],
            [
                'city_id' => $cityId,
                'body' => $body,
            ],
        );

        return $this->embedChunk($chunk);
    }

    private function embedChunk(AssistantKbChunk $chunk): bool
    {
        if ($this->settings->get()['mock_mode'] || ! filled(config('services.openrouter.api_key'))) {
            return true;
        }

        try {
            $vector = $this->embeddings->embed($chunk->title."\n\n".$chunk->body);
            $chunk->forceFill([
                'embedding' => $vector,
                'embedded_at' => now(),
            ])->saveQuietly();

            if (PgVector::isAvailable()) {
                DB::statement(
                    'UPDATE assistant_kb_chunks SET embedding_vector = ?::vector WHERE id = ?',
                    [PgVector::literal($vector), $chunk->id],
                );
            }

            return true;
        } catch (\Throwable $e) {
            report($e);

            return false;
        }
    }
}
