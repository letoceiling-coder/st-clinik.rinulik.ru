<?php

namespace App\Services\Assistant;

use App\Models\AssistantConversation;
use App\Models\AssistantKbChunk;
use App\Models\AssistantMessage;
use App\Models\AssistantOpenrouterUsage;
use App\Models\Lead;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AssistantMetrics
{
    /** @return array<string, int|float|string|null> */
    public function summary(): array
    {
        $since7 = now()->subDays(7);

        return [
            'conversations_7d' => AssistantConversation::query()->where('created_at', '>=', $since7)->count(),
            'messages_7d' => AssistantMessage::query()->where('created_at', '>=', $since7)->count(),
            'leads_7d' => Lead::query()->where('source', 'assistant')->where('created_at', '>=', $since7)->count(),
            'openrouter_usd_today' => round((float) AssistantOpenrouterUsage::query()->where('created_at', '>=', now()->startOfDay())->sum('cost_usd'), 4),
            'openrouter_usd_7d' => round((float) AssistantOpenrouterUsage::query()->where('created_at', '>=', $since7)->sum('cost_usd'), 4),
            'kb_faq_active' => DB::table('assistant_kb_entries')->where('is_active', true)->count(),
            'kb_catalog_chunks' => AssistantKbChunk::query()->count(),
            'conversion_7d' => $this->conversionRate($since7),
        ];
    }

    private function conversionRate(Carbon $since): ?float
    {
        $dialogs = AssistantConversation::query()->where('created_at', '>=', $since)->count();
        if ($dialogs === 0) {
            return null;
        }
        $leads = Lead::query()->where('source', 'assistant')->where('created_at', '>=', $since)->count();

        return round($leads / $dialogs * 100, 1);
    }
}
