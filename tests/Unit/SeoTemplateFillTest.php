<?php

namespace Tests\Unit;

use App\Services\Seo;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class SeoTemplateFillTest extends TestCase
{
    /** @return array<string, array{int, string}> */
    public static function counts(): array
    {
        return [
            'one' => [21, 'Стоматологи Москвы: 21 врач, 21 клиника'],
            'few' => [73, 'Стоматологи Москвы: 73 врача, 73 клиники'],
            'many' => [111, 'Стоматологи Москвы: 111 врачей, 111 клиник'],
        ];
    }

    #[DataProvider('counts')]
    public function test_nouns_after_count_agree_with_number(int $count, string $expected): void
    {
        $this->assertSame($expected, Seo::fill('Стоматологи {city}: {count} врачей, {count} клиник', ['city' => 'Москвы', 'count' => $count]));
    }

    public function test_numbers_inside_words_and_other_nouns_are_left_alone(): void
    {
        $this->assertSame('Клиника 2 этажа, 1990 клиниках', Seo::fill('Клиника {n} этажа, 1990 клиниках', ['n' => 2]));
    }
}
