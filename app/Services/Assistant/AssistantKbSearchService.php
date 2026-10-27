<?php

namespace App\Services\Assistant;

use App\Models\AssistantKbChunk;
use App\Models\AssistantKbEntry;
use App\Models\City;
use App\Repositories\Filters\ClinicFilters;
use App\Support\PgVector;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Throwable;

class AssistantKbSearchService
{
    public function __construct(
        private readonly OpenRouterEmbeddingClient $embeddings,
        private readonly AssistantSettings $settings,
    ) {}

    /**
     * @return list<array{question: string, answer: string}>
     */
    public function search(City $city, string $query, int $limit = 3): array
    {
        $query = trim($query);
        if ($query === '' || mb_strlen($query) < 2) {
            return [];
        }

        $limit = max(1, min(5, $limit));
        $scoped = $this->scopedQuery($city);

        $textHits = $this->textSearch(clone $scoped, $query, $limit);
        $semanticHits = $this->semanticSearch($city, $query, $limit);

        $merged = $this->mergeResults($textHits, $semanticHits, $limit);

        $faq = $merged->map(fn (AssistantKbEntry $e) => [
            'question' => $e->question,
            'answer' => $e->answer,
            'source' => 'faq',
        ])->values();

        $chunks = $this->searchCatalogChunks($city, $query, $limit);

        return $faq->concat($chunks)->take($limit)->values()->all();
    }

    /**
     * @return Collection<int, array{question: string, answer: string, source: string}>
     */
    private function searchCatalogChunks(City $city, string $query, int $limit): Collection
    {
        $scoped = AssistantKbChunk::query()
            ->where(fn ($q) => $q->whereNull('city_id')->orWhere('city_id', $city->id));

        $tokens = (new ClinicFilters(q: $query))->tokens();
        $textBuilder = clone $scoped;
        foreach ($tokens as $token) {
            $textBuilder->whereLike('search_text', '%'.$token.'%');
        }
        $textHits = $textBuilder->orderBy('id')->limit($limit)->get();

        $semanticHits = collect();
        $settings = $this->settings->get();
        if (! $settings['mock_mode'] && filled(config('services.openrouter.api_key'))) {
            try {
                $queryVector = $this->embeddings->embed($query);
                $semanticHits = $this->chunkSemanticSearch($city, $queryVector, $limit);
            } catch (Throwable) {
                // ignore
            }
        }

        $seen = [];
        $out = collect();
        foreach ($semanticHits->concat($textHits) as $chunk) {
            if (isset($seen[$chunk->id])) {
                continue;
            }
            $seen[$chunk->id] = true;
            $out->push([
                'question' => $chunk->title,
                'answer' => $chunk->body,
                'source' => $chunk->source_type,
            ]);
            if ($out->count() >= $limit) {
                break;
            }
        }

        return $out;
    }

    /** @param  list<float>  $queryVector  @return Collection<int, AssistantKbChunk> */
    private function chunkSemanticSearch(City $city, array $queryVector, int $limit): Collection
    {
        if (PgVector::isAvailable()) {
            $literal = PgVector::literal($queryVector);
            $cityId = $city->id;
            $rows = DB::select(
                'SELECT id FROM assistant_kb_chunks
                 WHERE embedding_vector IS NOT NULL
                   AND (city_id IS NULL OR city_id = ?)
                   AND 1 - (embedding_vector <=> ?::vector) > 0.32
                 ORDER BY embedding_vector <=> ?::vector
                 LIMIT ?',
                [$cityId, $literal, $literal, $limit],
            );
            if ($rows === []) {
                return collect();
            }
            $ids = array_map(static fn ($row) => (int) $row->id, $rows);

            return AssistantKbChunk::query()->whereIn('id', $ids)->get();
        }

        return AssistantKbChunk::query()
            ->where(fn ($q) => $q->whereNull('city_id')->orWhere('city_id', $city->id))
            ->whereNotNull('embedding')
            ->limit(40)
            ->get()
            ->map(function (AssistantKbChunk $chunk) use ($queryVector) {
                return ['chunk' => $chunk, 'score' => $this->cosineSimilarity($queryVector, $chunk->embedding ?? [])];
            })
            ->filter(fn (array $row) => $row['score'] > 0.32)
            ->sortByDesc('score')
            ->take($limit)
            ->pluck('chunk');
    }

    /** @return Builder<AssistantKbEntry> */
    private function scopedQuery(City $city)
    {
        return AssistantKbEntry::query()
            ->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('city_id')->orWhere('city_id', $city->id));
    }

    /** @param  Builder<AssistantKbEntry>  $builder */
    private function textSearch($builder, string $query, int $limit): Collection
    {
        $tokens = (new ClinicFilters(q: $query))->tokens();
        foreach ($tokens as $token) {
            $builder->whereLike('search_text', '%'.$token.'%');
        }

        return $builder->orderBy('sort')->limit($limit)->get();
    }

    private function semanticSearch(City $city, string $query, int $limit): Collection
    {
        $settings = $this->settings->get();
        if ($settings['mock_mode'] || ! filled(config('services.openrouter.api_key'))) {
            return collect();
        }

        try {
            $queryVector = $this->embeddings->embed($query);
        } catch (Throwable) {
            return collect();
        }

        if (PgVector::isAvailable()) {
            return $this->semanticSearchPgVector($city, $queryVector, $limit);
        }

        $candidates = $this->scopedQuery($city)
            ->whereNotNull('embedding')
            ->orderBy('sort')
            ->limit(50)
            ->get();

        return $candidates
            ->map(function (AssistantKbEntry $entry) use ($queryVector) {
                $score = $this->cosineSimilarity($queryVector, $entry->embedding ?? []);

                return ['entry' => $entry, 'score' => $score];
            })
            ->filter(fn (array $row) => $row['score'] > 0.35)
            ->sortByDesc('score')
            ->take($limit)
            ->pluck('entry');
    }

    /** @param  list<float>  $queryVector */
    private function semanticSearchPgVector(City $city, array $queryVector, int $limit): Collection
    {
        $literal = PgVector::literal($queryVector);
        $cityId = $city->id;
        $rows = DB::select(
            'SELECT id, 1 - (embedding_vector <=> ?::vector) AS score
             FROM assistant_kb_entries
             WHERE is_active = true
               AND embedding_vector IS NOT NULL
               AND (city_id IS NULL OR city_id = ?)
               AND 1 - (embedding_vector <=> ?::vector) > 0.35
             ORDER BY embedding_vector <=> ?::vector
             LIMIT ?',
            [$literal, $cityId, $literal, $literal, $limit],
        );

        if ($rows === []) {
            return collect();
        }

        $ids = array_map(static fn ($row) => (int) $row->id, $rows);
        $order = array_flip($ids);

        return AssistantKbEntry::query()
            ->whereIn('id', $ids)
            ->get()
            ->sortBy(fn (AssistantKbEntry $e) => $order[$e->id] ?? 999)
            ->values();
    }

    /** @param  Collection<int, AssistantKbEntry>  $text  @param  Collection<int, AssistantKbEntry>  $semantic */
    private function mergeResults(Collection $text, Collection $semantic, int $limit): Collection
    {
        $seen = [];
        $out = collect();

        foreach ($semantic->concat($text) as $entry) {
            if (isset($seen[$entry->id])) {
                continue;
            }
            $seen[$entry->id] = true;
            $out->push($entry);
            if ($out->count() >= $limit) {
                break;
            }
        }

        return $out;
    }

    /** @param  list<float>  $a  @param  list<float>  $b */
    private function cosineSimilarity(array $a, array $b): float
    {
        if ($a === [] || $b === [] || count($a) !== count($b)) {
            return 0.0;
        }

        $dot = 0.0;
        $normA = 0.0;
        $normB = 0.0;
        $count = count($a);
        for ($i = 0; $i < $count; $i++) {
            $dot += $a[$i] * $b[$i];
            $normA += $a[$i] * $a[$i];
            $normB += $b[$i] * $b[$i];
        }

        if ($normA <= 0.0 || $normB <= 0.0) {
            return 0.0;
        }

        return $dot / (sqrt($normA) * sqrt($normB));
    }
}
