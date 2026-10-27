<?php

namespace Tests\Unit;

use App\Services\Parser\ParsedOrganizationNormalizer;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class ParsedOrganizationNormalizerTest extends TestCase
{
    /**
     * @return array<string, array{0: string, 1: string, 2: string|null, 3: string|null}>
     */
    public static function addresses(): array
    {
        return [
            'этаж приклеен к городу' => ['ул. 50 лет ВЛКСМ, 95, Ставропольэтаж цокольный', 'Ставрополь', 'ул. 50 лет ВЛКСМ, 95', 'этаж цокольный'],
            'город в конце' => ['Октябрьская ул., 202, Ставрополь', 'Ставрополь', 'Октябрьская ул., 202', null],
            'номер этажа и офис' => ['ул. Красная, 10, 2 этаж, офис 5', 'Краснодар', 'ул. Красная, 10', '2 этаж, офис 5'],
            'название улицы с городом' => ['Ставропольская ул., 5, Краснодар', 'Краснодар', 'Ставропольская ул., 5', null],
            'слово «этаж» внутри названия' => ['Многоэтажная ул., 3', 'Анапа', 'Многоэтажная ул., 3', null],
        ];
    }

    #[DataProvider('addresses')]
    public function test_address_is_split_into_street_and_details(string $raw, string $city, string $address, ?string $details): void
    {
        $this->assertSame([$address, $details], (new ParsedOrganizationNormalizer)->splitAddress($raw, $city));
    }

    public function test_phones_are_converted_to_e164_without_duplicates(): void
    {
        $phones = (new ParsedOrganizationNormalizer)->phones(['8 (861) 200-00-00', '+7 861 200-00-00', '9180000000', '123']);

        $this->assertSame(['+78612000000', '+79180000000'], $phones);
    }

    public function test_messenger_link_in_website_field_moves_to_socials(): void
    {
        $data = (new ParsedOrganizationNormalizer)->normalize([
            'externalId' => '1',
            'name' => 'Эсте Дент',
            'website' => 'https://t.me/estedentstav',
            'card' => [
                'socialLinks' => [['url' => 'https://vk.com/estedent', 'type' => 'vk']],
                'messagingLinks' => ['whatsapp' => 'https://wa.me/79990000000'],
            ],
        ]);

        $this->assertNull($data['website']);
        $this->assertSame(['telegram', 'vk', 'whatsapp'], array_column($data['socials'], 'type'));
    }

    public function test_tracking_parameters_are_removed_from_website(): void
    {
        $data = (new ParsedOrganizationNormalizer)->normalize([
            'externalId' => '2',
            'name' => 'Доктор Коннов',
            'website' => 'https://doktorkonnov.ru/?utm_source=yandex_maps',
        ]);

        $this->assertSame('https://doktorkonnov.ru/', $data['website']);
    }
}
