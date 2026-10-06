<?php

/** [slug, name, group, filter_kind, db_column|null, filter_value|null, sort, show_in_filter, show_in_cabinet] */
return [
    ['verified', 'Клиника проверена', 'Возможности', 'boolean', 'is_verified', null, 10, true, false],
    ['is_24_7', 'Круглосуточно', 'Возможности', 'boolean', 'is_24_7', null, 20, true, false],
    ['same_day', 'Запись на сегодня', 'Возможности', 'boolean', 'same_day', null, 30, true, false],
    ['detskaya', 'Детская стоматология', 'Направление', 'specialty', null, 'detskaya', 40, true, false],
    ['installment', 'Рассрочка', 'Оплата', 'boolean', 'has_installment', null, 50, true, true],
    ['partial_payment', 'Оплата частями', 'Оплата', 'boolean', 'has_partial_payment', null, 60, true, true],
    ['dms', 'Принимает ДМС', 'Оплата', 'boolean', 'accepts_dms', null, 70, true, true],
    ['oms', 'Приём по мед. полису (ОМС)', 'Оплата', 'boolean', 'accepts_oms', null, 80, true, true],
    ['price_low', 'Цены от самых низких', 'Сортировка', 'sort', null, 'price_asc', 90, true, false],
    ['sedation', 'Седация', 'Оборудование', 'boolean', 'has_sedation', null, 100, true, true],
    ['anesthesia', 'Наркоз', 'Оборудование', 'boolean', 'has_anesthesia', null, 110, true, true],
    ['microscope', 'Лечение под микроскопом', 'Оборудование', 'boolean', 'has_microscope', null, 120, true, true],
    ['ct', 'КТ в клинике', 'Оборудование', 'boolean', 'has_ct', null, 130, true, true],
    ['achievements', 'Есть награды и достижения', 'Прочее', 'achievement', null, null, 140, true, false],
];
