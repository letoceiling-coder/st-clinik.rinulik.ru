<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assistant_kb_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();
            $table->string('question', 500);
            $table->text('answer');
            $table->text('search_text');
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'sort']);
        });

        $now = now();
        $rows = [
            [
                'question' => 'Как записаться онлайн?',
                'answer' => 'Откройте карточку клиники на сайте, нажмите «Записаться», выберите врача (или любого свободного), услугу и время. Подтверждение придёт в личный кабинет и по выбранным каналам уведомлений.',
            ],
            [
                'question' => 'Чем заявка отличается от онлайн-записи?',
                'answer' => 'Заявка — это просьба перезвонить: вы оставляете имя и телефон, администратор клиники подберёт время. Онлайн-запись сразу бронирует конкретный слот в расписании.',
            ],
            [
                'question' => 'Можно ли записать ребёнка?',
                'answer' => 'Да, если клиника принимает детей — это указано в карточке. При заявке отметьте «ребёнок» или уточните возраст в комментарии.',
            ],
            [
                'question' => 'Принимаете ли ДМС?',
                'answer' => 'У каждой клиники свой список страховых и условий. Смотрите блок «Оплата и ДМС» в карточке клиники или уточните по телефону после записи.',
            ],
        ];

        foreach ($rows as $i => $row) {
            DB::table('assistant_kb_entries')->insert([
                'city_id' => null,
                'question' => $row['question'],
                'answer' => $row['answer'],
                'search_text' => mb_strtolower($row['question'].' '.$row['answer']),
                'is_active' => true,
                'sort' => ($i + 1) * 10,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('assistant_kb_entries');
    }
};
