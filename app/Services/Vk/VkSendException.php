<?php

namespace App\Services\Vk;

use RuntimeException;

class VkSendException extends RuntimeException
{
    /** Коды VK: пользователь запретил сообщения сообщества или добавил его в чёрный список. */
    public function userBlockedMessages(): bool
    {
        return in_array($this->getCode(), [900, 901, 902], true);
    }
}
