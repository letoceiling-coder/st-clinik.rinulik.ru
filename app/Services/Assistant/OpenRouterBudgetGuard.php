<?php

namespace App\Services\Assistant;

use App\Models\AssistantOpenrouterUsage;

class OpenRouterBudgetGuard
{
    public function assertWithinBudget(): void
    {
        $budget = (float) (config('services.openrouter.daily_budget_usd') ?: 0);
        if ($budget <= 0) {
            return;
        }

        if ($this->spentToday() >= $budget) {
            throw new AssistantBudgetExceeded;
        }
    }

    /** @param  array<string, mixed>|null  $usage */
    public function record(?array $usage, string $operation): void
    {
        if ($usage === null) {
            return;
        }

        $cost = $this->extractCost($usage);
        $prompt = (int) ($usage['prompt_tokens'] ?? 0);
        $completion = (int) ($usage['completion_tokens'] ?? 0);

        if ($cost <= 0 && $prompt === 0 && $completion === 0) {
            return;
        }

        AssistantOpenrouterUsage::query()->create([
            'operation' => $operation,
            'cost_usd' => $cost,
            'prompt_tokens' => $prompt,
            'completion_tokens' => $completion,
        ]);
    }

    public function spentToday(): float
    {
        return (float) AssistantOpenrouterUsage::query()
            ->where('created_at', '>=', now()->startOfDay())
            ->sum('cost_usd');
    }

    /** @param  array<string, mixed>  $usage */
    private function extractCost(array $usage): float
    {
        foreach (['cost', 'total_cost'] as $key) {
            if (isset($usage[$key]) && is_numeric($usage[$key])) {
                return (float) $usage[$key];
            }
        }

        return 0.0;
    }
}
