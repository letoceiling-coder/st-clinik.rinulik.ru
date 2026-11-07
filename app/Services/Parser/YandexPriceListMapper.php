<?php

namespace App\Services\Parser;

use App\Support\Text;

/**
 * Прайс из карточки Яндекс Карт («Товары и услуги») → услуги справочника с ценой «от–до».
 * Позиции называются как угодно («Комплекс гигиенических процедур… Air Flow»), поэтому сопоставление идёт
 * по упорядоченным правилам: первое подходящее выигрывает, более узкие правила стоят выше общих.
 */
class YandexPriceListMapper
{
    /** Позиции, которые не являются стоматологической услугой или дают ложное совпадение. */
    private const SKIP = '/временн|новообразован|кожи|слюнн|ботокс|косметолог|подарочн|сертификат|скидк на|абонемент|кардиолог|уролог|гинеколог|невролог|офтальмолог|педиатр|дерматолог|эндокринолог|отоларинголог|гастроэнтеролог|маммолог|флеболог|психолог|узи/u';

    /** Если «до» больше «от» сильнее, чем во столько раз, в диапазон попали пакеты «под ключ» — оставляем только «от». */
    private const MAX_SPREAD = 3;

    /** Цена ниже — это «бесплатно» (1 ₽) или опечатка, в каталог не переносим. */
    private const MIN_PRICE = 100;

    /** @var array<string, string> slug услуги => шаблон по нормализованному названию */
    private const RULES = [
        'all-on-4' => '/all.?on.?[46]|все.?на.?[46]|всё.?на.?[46]/u',
        'sinus-lifting' => '/синус/u',
        'kostnaya-plastika' => '/костн\w* пласт|аугментац|наращивани\w* кост/u',
        'implant-premium' => '/^(?!.*(коронк|абатмент|формировател|мини|ортодонт)).*(имплант.*(straumann|nobel|ankylos|astra|premium|премиум|швейцар)|(straumann|nobel|ankylos|astra).*имплант)/u',
        'implant-standart' => '/^(?!.*(коронк|абатмент|формировател|мини|ортодонт)).*имплант/u',
        'bregety-keramika' => '/брекет.*(керамич|сапфир|эстетич)|(керамич|сапфир)\w* брекет/u',
        'bregety-metall' => '/брекет/u',
        'elaynery' => '/элайнер|капп\w* ортодонт|invisalign|star smile|flexiligner/u',
        'retejner' => '/ретейнер|ретайнер|ретенц/u',
        'kappa-bruksizm' => '/бруксизм|сплинт|капп/u',
        'diagnostika-vnchs' => '/внчс|гнатолог|аксиограф/u',
        'koronka-cirkoniy' => '/циркон/u',
        'vinir' => '/винир|ламинат/u',
        'koronka-keramika' => '/коронк|металлокерам|безметалл|e.?max|имакс|керамик/u',
        'protez-snemnyy' => '/протез|бюгел|акрифри|квадротти|нейлонов/u',
        'otbelivanie-domashnee' => '/отбел.*(домашн|капп)|домашн\w* отбел/u',
        'otbelivanie-ofisnoe' => '/отбел|zoom|beyond/u',
        'germetizaciya' => '/герметиз|фиссур/u',
        'serebrenie' => '/серебрен|фторлак|фторирован/u',
        'lechenie-vo-sne' => '/во сне/u',
        'obshchiy-narkoz' => '/наркоз|общ\w* анестез/u',
        'sedaciya-zakis-azota' => '/седац|закис/u',
        'kyuretazh' => '/кюретаж/u',
        'loskutnaya-operaciya' => '/лоскут/u',
        'plastika-uzdechki' => '/уздечк|вестибулопласт/u',
        'rezekciya-verhushki' => '/резекц|цистэктом|гемисекц/u',
        'professionalnaya-chistka' => '/гигиен|air.?flow|эйр.?флоу|чистк|(снятие|удаление)\w* (зубн\w* )?(камн|отложен|налет)|ультразвук|скейлинг/u',
        'lechenie-gingivita' => '/гингивит|пародонт|десн|шинирован/u',
        'udalenie-zuba-slozhnoe' => '/удален\w*.*(сложн|ретинир|дистопир|мудрост|атипич|8.?го|восьм)|(сложн|атипич)\w* удален/u',
        'udalenie-zuba-prostoe' => '/удален\w* (\S+ )?(зуб|корн|молочн)|экстракц/u',
        'lechenie-molochnogo-zuba' => '/молочн|детск\w* (лечен|кариес|пульп)/u',
        'lechenie-pod-mikroskopom' => '/микроскоп/u',
        'perelechivanie-kanalov' => '/перелечив|распломбир|повторн\w* лечен\w* канал/u',
        'lechenie-pulpita' => '/пульпит|канал|периодонтит|эндодонт/u',
        'snyatie-plomby' => '/(замен|снятие)\w* (\w+ )?пломб/u',
        'hudozhestvennaya-restavraciya' => '/реставрац|художеств/u',
        'cifrovoy-dizayn-ulybki' => '/дизайн\w* улыбк|digital smile|mock.?up|wax.?up/u',
        'lechenie-kariesa' => '/кариес/u',
        'plomba-svetovaya' => '/пломб|композит|светов|восстановлен\w* зуба/u',
        'rentgen-kt' => '/\bкт\b|томограф|рентген|снимок|ортопантомо|\bоптг?\b|визиограф|3d.?снимок/u',
        'konsultaciya-stomatologa' => '/консультац|осмотр|прием|первичн|диагностик|план\w* лечен/u',
    ];

    /**
     * @param  list<array<string, mixed>>  $products
     * @return array{services: array<string, array{price_from: int, price_to: int|null, positions: list<string>}>, unmatched: list<array{name: string, price: string}>, total: int}
     */
    public function map(array $products): array
    {
        $services = [];
        $unmatched = [];
        $total = 0;

        foreach ($products as $product) {
            if (! is_array($product)) {
                continue;
            }
            $name = trim((string) ($product['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $total++;
            $price = $this->price((string) ($product['price'] ?? ''));
            $slug = $this->match($name);

            if ($slug === null || $price === null) {
                $unmatched[] = ['name' => $name, 'price' => (string) ($product['price'] ?? '')];

                continue;
            }

            $entry = $services[$slug] ?? ['price_from' => $price, 'price_to' => null, 'positions' => []];
            $entry['price_to'] = max($entry['price_to'] ?? $entry['price_from'], $price);
            $entry['price_from'] = min($entry['price_from'], $price);
            $entry['positions'][] = $name;
            $services[$slug] = $entry;
        }

        foreach ($services as $slug => $entry) {
            if ($entry['price_to'] === $entry['price_from'] || $entry['price_to'] > $entry['price_from'] * self::MAX_SPREAD) {
                $services[$slug]['price_to'] = null;
            }
        }

        return ['services' => $services, 'unmatched' => $unmatched, 'total' => $total];
    }

    public function match(string $name): ?string
    {
        $norm = Text::normalize($name);
        if ($norm === '' || preg_match($this->unicode(self::SKIP), $norm)) {
            return null;
        }
        foreach (self::RULES as $slug => $pattern) {
            if (preg_match($this->unicode($pattern), $norm)) {
                return $slug;
            }
        }

        return null;
    }

    /** Без (*UCP) у \w и \b нет кириллицы. */
    private function unicode(string $pattern): string
    {
        return '/(*UCP)'.substr($pattern, 1);
    }

    /** «4 000 ₽», «от 2 500 р.», «2 000 – 3 000 ₽» → нижняя цена в рублях. */
    public function price(string $raw): ?int
    {
        if (! preg_match('/\d[\d\s\x{00A0}\x{202F}]*/u', $raw, $m)) {
            return null;
        }
        $value = (int) preg_replace('/\D+/', '', $m[0]);

        return $value >= self::MIN_PRICE && $value <= 5_000_000 ? $value : null;
    }
}
