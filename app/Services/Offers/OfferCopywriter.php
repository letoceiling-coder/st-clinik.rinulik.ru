<?php

namespace App\Services\Offers;

use App\Models\Offer;
use App\Services\Assistant\OpenRouterChatClient;
use App\Services\Audit;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Улучшает дополнительный текст КП (акции, спецпредложения) через недорогую модель.
 * Только редактура: факты, цифры и условия должен задать менеджер — модель их не придумывает.
 * Результат — подсказка; менеджер принимает или правит её сам, автоматически ничего не отправляется.
 */
class OfferCopywriter
{
    public const MAX_LENGTH = 1000;

    public function __construct(
        private readonly OpenRouterChatClient $client,
        private readonly OfferSettings $settings,
    ) {}

    public function available(): bool
    {
        return filled(config('services.openrouter.api_key'));
    }

    public function improve(Offer $offer, string $draft): string
    {
        $draft = trim($draft);
        if ($draft === '') {
            throw new RuntimeException('Сначала напишите черновик текста.');
        }
        if (! $this->available()) {
            throw new RuntimeException('ИИ не подключён: добавьте ключ OpenRouter в Интеграциях.');
        }
        $offer->loadMissing('clinic.city');

        $system = implode("\n", [
            'Ты редактор B2B-предложений для стоматологических клиник. Пиши по-русски, на «вы», деловым дружелюбным тоном.',
            'Задача: улучшить текст дополнительного предложения (акции, бонусы) — сделать его ясным, коротким и убедительным.',
            'Строгие правила:',
            '- сохрани все факты, цифры, сроки и условия из черновика без изменений;',
            '- не добавляй новых скидок, цен, сроков, гарантий, статистики и обещаний, которых нет в черновике;',
            '- никаких медицинских обещаний и утверждений о лечении;',
            '- без приветствия и подписи, без эмодзи, без markdown-заголовков; допустимы короткие пункты списка через «- »;',
            '- не длиннее '.self::MAX_LENGTH.' символов.',
            'Верни только итоговый текст.',
        ]);
        $user = "Клиника: «{$offer->clinic->name}»".($offer->clinic->city ? ", {$offer->clinic->city->name}" : '').".\n\nЧерновик:\n".Str::limit($draft, 2000, '');

        $text = $this->client->complete([
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => $user],
        ], $this->settings->aiModel());

        Audit::log('offers.ai_improved', $offer, ['model' => $this->settings->aiModel()]);

        return Str::limit(trim(strip_tags($text)), self::MAX_LENGTH, '');
    }
}
