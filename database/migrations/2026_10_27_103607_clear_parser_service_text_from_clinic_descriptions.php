<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Импорт из парсера раньше писал в описание служебный текст
     * («Рубрики: …», «Часы работы: …», «Карточка на Яндекс Картах: …»). Такие описания очищаем.
     */
    public function up(): void
    {
        DB::table('clinics')
            ->where(function ($query) {
                $query->where('description', 'like', 'Рубрики:%')
                    ->orWhere('description', 'like', 'Часы работы:%')
                    ->orWhere('description', 'like', 'Карточка на Яндекс Картах:%');
            })
            ->update(['description' => null]);
    }

    public function down(): void
    {
        //
    }
};
