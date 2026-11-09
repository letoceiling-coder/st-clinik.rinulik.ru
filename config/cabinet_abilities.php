<?php

use App\Services\Organization\CabinetAuthorization;

/**
 * Маршрут кабинета (name) → требуемое право (матрица ролей — ТЗ §6, см. CabinetAuthorization).
 * Маршруты без записи здесь доступны любому сотруднику организации: дашборд, статистика, личные настройки.
 */
return [
    'cabinet.organization.edit' => CabinetAuthorization::ABILITY_MANAGE_ORGANIZATION,
    'cabinet.organization.update' => CabinetAuthorization::ABILITY_MANAGE_ORGANIZATION,

    'cabinet.settings.assistant-leads' => CabinetAuthorization::ABILITY_MANAGE_ORGANIZATION,

    'cabinet.staff.index' => CabinetAuthorization::ABILITY_MANAGE_STAFF,
    'cabinet.staff.invite' => CabinetAuthorization::ABILITY_MANAGE_STAFF,
    'cabinet.staff.revoke' => CabinetAuthorization::ABILITY_MANAGE_STAFF,

    'cabinet.branches' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.branches.create' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.branches.edit' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.branches.store' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.branches.update' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.branches.submit' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.branches.publish' => CabinetAuthorization::ABILITY_MANAGE_ORGANIZATION,

    'cabinet.schedule' => CabinetAuthorization::ABILITY_MANAGE_SCHEDULE,
    'cabinet.schedule.doctors' => CabinetAuthorization::ABILITY_MANAGE_SCHEDULE,
    'cabinet.schedule.update' => CabinetAuthorization::ABILITY_MANAGE_SCHEDULE,
    'cabinet.schedule.doctors.update' => CabinetAuthorization::ABILITY_MANAGE_SCHEDULE,
    'cabinet.schedule.exceptions.store' => CabinetAuthorization::ABILITY_MANAGE_SCHEDULE,
    'cabinet.schedule.exceptions.destroy' => CabinetAuthorization::ABILITY_MANAGE_SCHEDULE,

    'cabinet.broadcasts.index' => CabinetAuthorization::ABILITY_MANAGE_PROMOTIONS,
    'cabinet.broadcasts.store' => CabinetAuthorization::ABILITY_MANAGE_PROMOTIONS,
    'cabinet.broadcasts.submit' => CabinetAuthorization::ABILITY_MANAGE_PROMOTIONS,
    'cabinet.broadcasts.start' => CabinetAuthorization::ABILITY_MANAGE_PROMOTIONS,

    'cabinet.card-bonuses' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.card-bonuses.update' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,

    'cabinet.doctors' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.doctors.create' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.doctors.edit' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.doctors.store' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.doctors.update' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.doctors.destroy' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,

    'cabinet.prices' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.prices.export' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.prices.template' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.prices.import' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.prices.store' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.prices.update' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.prices.destroy' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,

    'cabinet.photos' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.photos.store' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.photos.update' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.photos.destroy' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,

    'cabinet.posts' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.posts.store' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.posts.update' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.posts.destroy' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,

    'cabinet.documents' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.documents.file' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.documents.store' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,
    'cabinet.documents.destroy' => CabinetAuthorization::ABILITY_MANAGE_CONTENT,

    // Пациенты и их персональные данные (отзывы, записи, заявки) — только роли, работающие с записями.
    'cabinet.reviews' => CabinetAuthorization::ABILITY_MANAGE_OPERATIONS,
    'cabinet.reviews.reply' => CabinetAuthorization::ABILITY_MANAGE_OPERATIONS,
    'cabinet.reviews.complain' => CabinetAuthorization::ABILITY_MANAGE_OPERATIONS,

    'cabinet.calendar' => CabinetAuthorization::ABILITY_MANAGE_OPERATIONS,
    'cabinet.calendar.store' => CabinetAuthorization::ABILITY_MANAGE_OPERATIONS,
    'cabinet.calendar.update' => CabinetAuthorization::ABILITY_MANAGE_OPERATIONS,
    'cabinet.calendar.status' => CabinetAuthorization::ABILITY_MANAGE_OPERATIONS,
    'cabinet.calendar.reschedule.approve' => CabinetAuthorization::ABILITY_MANAGE_OPERATIONS,
    'cabinet.calendar.reschedule.reject' => CabinetAuthorization::ABILITY_MANAGE_OPERATIONS,

    'cabinet.leads' => CabinetAuthorization::ABILITY_MANAGE_OPERATIONS,
    'cabinet.leads.update' => CabinetAuthorization::ABILITY_MANAGE_OPERATIONS,
    'cabinet.leads.accept' => CabinetAuthorization::ABILITY_MANAGE_OPERATIONS,
    'cabinet.leads.appointment' => CabinetAuthorization::ABILITY_MANAGE_OPERATIONS,

    'cabinet.payments.index' => CabinetAuthorization::ABILITY_MANAGE_BILLING,
    'cabinet.payments.checkout' => CabinetAuthorization::ABILITY_MANAGE_BILLING,
    'cabinet.payments.return' => CabinetAuthorization::ABILITY_MANAGE_BILLING,
    'cabinet.payments.auto-renew' => CabinetAuthorization::ABILITY_MANAGE_BILLING,

    'cabinet.promotions' => CabinetAuthorization::ABILITY_MANAGE_PROMOTIONS,
    'cabinet.promotions.checkout' => CabinetAuthorization::ABILITY_MANAGE_PROMOTIONS,
    'cabinet.promotions.return' => CabinetAuthorization::ABILITY_MANAGE_PROMOTIONS,
];
