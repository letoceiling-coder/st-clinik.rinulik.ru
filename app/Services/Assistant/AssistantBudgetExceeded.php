<?php

namespace App\Services\Assistant;

use RuntimeException;

class AssistantBudgetExceeded extends RuntimeException
{
    public function __construct(string $message = 'Суточный бюджет OpenRouter исчерпан. Попробуйте завтра или оставьте заявку через форму.')
    {
        parent::__construct($message);
    }
}
