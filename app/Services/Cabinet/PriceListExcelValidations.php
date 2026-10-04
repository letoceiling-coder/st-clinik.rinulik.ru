<?php

namespace App\Services\Cabinet;

use RuntimeException;
use ZipArchive;

final class PriceListExcelValidations
{
    public const TEMPLATE_MAX_ROW = 300;

    public const DEFINED_SERVICES = 'StClinikServices';

    public function apply(string $xlsxPath, int $catalogServiceCount, int $maxRow = self::TEMPLATE_MAX_ROW): void
    {
        if ($catalogServiceCount < 1) {
            return;
        }

        $zip = new ZipArchive;
        if ($zip->open($xlsxPath) !== true) {
            throw new RuntimeException('Не удалось открыть Excel-файл для настройки выпадающих списков.');
        }

        $catalogLastRow = $catalogServiceCount + 1;
        $catalogSheet = PriceListExcel::SHEET_CATALOG;

        $workbookXml = $zip->getFromName('xl/workbook.xml');
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');

        if (! is_string($workbookXml) || $workbookXml === '' || ! is_string($sheetXml) || $sheetXml === '') {
            $zip->close();

            throw new RuntimeException('Не удалось прочитать структуру Excel-файла.');
        }

        $this->replaceZipEntry(
            $zip,
            'xl/workbook.xml',
            $this->injectDefinedNames($workbookXml, $catalogSheet, $catalogLastRow),
        );

        $this->replaceZipEntry(
            $zip,
            'xl/worksheets/sheet1.xml',
            $this->injectValidations($sheetXml, $maxRow),
        );

        $zip->close();
    }

    private function replaceZipEntry(ZipArchive $zip, string $name, string $contents): void
    {
        if ($zip->locateName($name) !== false) {
            $zip->deleteName($name);
        }

        $zip->addFromString($name, $contents);
    }

    private function injectDefinedNames(string $workbookXml, string $catalogSheet, int $catalogLastRow): string
    {
        if (str_contains($workbookXml, '<definedNames')) {
            $workbookXml = (string) preg_replace('/<definedNames\b[^>]*>.*?<\/definedNames>/s', '', $workbookXml);
        }

        $sheetRef = "'{$catalogSheet}'";
        $servicesRange = $sheetRef.'!$B$2:$B$'.$catalogLastRow;

        $definedNamesXml = '<definedNames>'
            .'<definedName name="'.self::DEFINED_SERVICES.'">'.$this->escapeXmlText($servicesRange).'</definedName>'
            .'</definedNames>';

        return str_replace('</workbook>', $definedNamesXml.'</workbook>', $workbookXml);
    }

    private function injectValidations(string $sheetXml, int $maxRow): string
    {
        if (str_contains($sheetXml, '<dataValidations')) {
            $sheetXml = (string) preg_replace('/<dataValidations\b[^>]*>.*?<\/dataValidations>/s', '', $sheetXml);
        }

        $validationsXml = $this->buildValidationsXml($maxRow);

        if (str_contains($sheetXml, '<legacyDrawing')) {
            return str_replace('<legacyDrawing', $validationsXml.'<legacyDrawing', $sheetXml);
        }

        return str_replace('</worksheet>', $validationsXml.'</worksheet>', $sheetXml);
    }

    private function buildValidationsXml(int $maxRow): string
    {
        $rules = [
            [
                'sqref' => "B2:B{$maxRow}",
                'formula' => self::DEFINED_SERVICES,
                'title' => 'Услуга',
                'prompt' => 'Выберите услугу из справочника. Специализация и код подставятся автоматически.',
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
                .$this->escapeXmlText($rule['sqref']).'">';
            $xml .= '<formula1>'.$this->escapeXmlText($rule['formula']).'</formula1>';
            $xml .= '<promptTitle>'.$this->escapeXmlText($rule['title']).'</promptTitle>';
            $xml .= '<prompt>'.$this->escapeXmlText($rule['prompt']).'</prompt>';
            $xml .= '<errorTitle>Недопустимое значение</errorTitle>';
            $xml .= '<error>Выберите значение из списка справочника.</error>';
            $xml .= '</dataValidation>';
        }
        $xml .= '</dataValidations>';

        return $xml;
    }

    private function escapeXmlText(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
