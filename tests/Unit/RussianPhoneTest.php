<?php

namespace Tests\Unit;

use App\Rules\RussianPhone;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class RussianPhoneTest extends TestCase
{
    /**
     * @return array<string, array{0: string, 1: bool}>
     */
    public static function phones(): array
    {
        return [
            'маска сайта' => ['+7 (996) 371-18-25', true],
            'слитно с +7' => ['+79963711825', true],
            'с восьмёркой' => ['8 996 371-18-25', true],
            'федеральный 8-800' => ['8 (800) 555-35-35', true],
            'лишние цифры' => ['+79963711825656565655', false],
            'короткий' => ['+7 996 371', false],
            'без кода страны' => ['9963711825', false],
            'чужая страна' => ['+380 99 371 18 25', false],
            'буквы' => ['+7 (996) abc-18-25', false],
        ];
    }

    #[DataProvider('phones')]
    public function test_validates_russian_numbers(string $phone, bool $valid): void
    {
        $this->assertSame($valid, RussianPhone::isValid($phone));
    }

    public function test_normalizes_to_plus_seven(): void
    {
        $this->assertSame('+79963711825', RussianPhone::normalize('8 (996) 371-18-25'));
    }
}
