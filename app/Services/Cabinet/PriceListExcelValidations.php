<?php

namespace App\Services\Cabinet;

use RuntimeException;
use ZipArchive;

final class PriceListExcelValidations
{
    public const TEMPLATE_MAX_ROW = 300;

    public function apply(string $xlsxPath, int $catalogServiceCount): void
    {
        if ($catalogServiceCount < 1) {
            return;
        }

        $zip = new ZipArchive;
        if ($zip->open($xlsxPath) !== true) {
            throw new RuntimeException('Не удалось открыть Excel-файл для настройки выпадающих списков.');
        }

        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if (! is_string($sheetXml) || $sheetXml === '') {
            $zip->close();

            throw new RuntimeException('Не найден лист «Прайс» в Excel-файле.');
        }

        $patched = $this->injectValidations($sheetXml, $catalogServiceCount);
        $zip->addFromString('xl/worksheets/sheet1.xml', $patched);
        $zip->close();
    }

    private function injectValidations(string $sheetXml, int $catalogServiceCount): string
    {
        if (str_contains($sheetXml, '<dataValidations')) {
            $sheetXml = (string) preg_replace('/<dataValidations\b[^>]*>.*?<\/dataValidations>/s', '', $sheetXml);
        }

        $catalogLastRow = $catalogServiceCount + 1;
        $maxRow = self::TEMPLATE_MAX_ROW;
        $catalogSheet = PriceListExcel::SHEET_CATALOG;
        $validationsXml = $this->buildValidationsXml($catalogSheet, $catalogLastRow, $maxRow);

        if (str_contains($sheetXml, '<legacyDrawing')) {
            return str_replace('<legacyDrawing', $validationsXml.'<legacyDrawing', $sheetXml);
        }

        return str_replace('</worksheet>', $validationsXml.'</worksheet>', $sheetXml);
    }

    private function buildValidationsXml(string $catalogSheet, int $catalogLastRow, int $maxRow): string
    {
        $rules = [
            [
                'sqref' => "B2:B{$maxRow}",
                'formula' => "'{$catalogSheet}'!\$B\$2:\$B\${$catalogLastRow}",
                'title' => 'Услуга',
                'prompt' => 'Выберите услугу из справочника. Специализация и код заполнятся автоматически.',
            ],
            [
                'sqref' => "F2:F{$maxRow}",
                'formula' => '"да,нет"',
                'title' => 'Акция',
                'prompt' => 'Укажите «да» или «нет».',
            ],
        ];

        $xml = '<dataValidations count="'.count($rules).'">';
        foreach ($rules as $rule) {
            $xml .= '<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="'
                .$this->escape($rule['sqref']).'">';
            $xml .= '<formula1>'.$this->escape($rule['formula']).'</formula1>';
            $xml .= '<promptTitle>'.$this->escape($rule['title']).'</promptTitle>';
            $xml .= '<prompt>'.$this->escape($rule['prompt']).'</prompt>';
            $xml .= '<errorTitle>Недопустимое значение</errorTitle>';
            $xml .= '<error>Выберите значение из списка справочника.</error>';
            $xml .= '</dataValidation>';
        }
        $xml .= '</dataValidations>';

        return $xml;
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
