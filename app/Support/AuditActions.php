<?php

namespace App\Support;

/**
 * Русские названия действий журнала аудита. В базе хранится код (например, «auth.social_login»),
 * в интерфейсе показывается только название.
 */
final class AuditActions
{
    /** @var array<string, string> */
    private const LABELS = [
        'account.deleted' => 'Удалил аккаунт',
        'account.email_changed' => 'Сменил e-mail',
        'account.password_changed' => 'Сменил пароль',
        'assistant.kb_created' => 'AI-ассистент: добавлена статья базы знаний',
        'assistant.kb_updated' => 'AI-ассистент: изменена статья базы знаний',
        'assistant.kb_deleted' => 'AI-ассистент: удалена статья базы знаний',
        'assistant.settings_updated' => 'AI-ассистент: изменены настройки',
        'auth.login' => 'Вход по паролю',
        'auth.max_login' => 'Вход через MAX',
        'auth.max_miniapp_login' => 'Вход через мини-приложение MAX',
        'auth.register' => 'Регистрация',
        'auth.register_clinic' => 'Регистрация клиники',
        'auth.register_clinic_offer' => 'Регистрация клиники по КП',
        'auth.social_login' => 'Вход через соцсеть',
        'auth.social_register' => 'Регистрация через соцсеть',
        'auth.social_linked' => 'Привязал соцсеть',
        'auth.social_link_confirmed' => 'Подтвердил привязку соцсети',
        'auth.social_unlinked' => 'Отвязал соцсеть',
        'branch.created' => 'Создан филиал',
        'branch.updated' => 'Изменён филиал',
        'branch.submitted' => 'Филиал отправлен на модерацию',
        'broadcasts.created' => 'Создана рассылка',
        'broadcasts.updated' => 'Изменена рассылка',
        'broadcasts.scheduled' => 'Рассылка запланирована',
        'broadcasts.started' => 'Рассылка запущена',
        'broadcasts.moderated' => 'Рассылка проверена модератором',
        'cabinet.assistant_leads' => 'Кабинет: заявки от AI-ассистента',
        'campaigns.built' => 'Кампания КП: собран список',
        'campaigns.started' => 'Кампания КП запущена',
        'campaigns.paused' => 'Кампания КП приостановлена',
        'campaigns.exported' => 'Кампания КП выгружена',
        'campaigns.recipient_marked' => 'Кампания КП: отмечен получатель',
        'clinic.created_by_admin' => 'Клиника создана администратором',
        'clinic.profile_updated_by_admin' => 'Профиль клиники изменён администратором',
        'clinic.updated' => 'Изменена клиника',
        'clinic.deleted' => 'Удалена клиника',
        'doctor.created' => 'Добавлен врач',
        'doctor.updated' => 'Изменён врач',
        'doctor.deleted' => 'Удалён врач',
        'document.uploaded' => 'Загружен документ',
        'duplicate.merged' => 'Дубликаты объединены',
        'duplicate.dismissed' => 'Дубликат отклонён',
        'geography.cities_imported' => 'Импортированы города',
        'integration.updated' => 'Изменены настройки интеграции',
        'integration.checked' => 'Проверена интеграция',
        'integration.keys_generated' => 'Созданы ключи интеграции',
        'integration.webhook_synced' => 'Обновлён вебхук интеграции',
        'integration.web_push_test' => 'Отправлено тестовое push-уведомление',
        'offers.created' => 'Создано КП',
        'offers.bulk_created' => 'Созданы КП списком',
        'offers.sent' => 'Отправлено КП',
        'offers.revoked' => 'КП отозвано',
        'offers.claimed' => 'КП принято клиникой',
        'offers.applied' => 'Заявка по КП',
        'offers.application_updated' => 'Изменена заявка по КП',
        'offers.connected' => 'Клиника подключена по КП',
        'offers.customized' => 'КП настроено',
        'offers.extra_updated' => 'Изменены доп. условия КП',
        'offers.ai_improved' => 'Текст КП улучшен AI',
        'offers.demo_updated' => 'Изменён демо-кабинет',
        'offers.demo_reissued' => 'Демо-доступ выдан повторно',
        'offers.demo_revoked' => 'Демо-доступ отозван',
        'offers.settings_updated' => 'Изменены настройки КП',
        'offers.template_created' => 'Создан шаблон КП',
        'offers.template_updated' => 'Изменён шаблон КП',
        'offers.template_test' => 'Тестовая отправка шаблона КП',
        'offers.unsubscribed' => 'Отписка от КП',
        'offers.stop_removed' => 'Адрес убран из стоп-листа КП',
        'organization.blocked' => 'Организация заблокирована',
        'organization.unblocked' => 'Организация разблокирована',
        'parser.imported' => 'Парсер: импорт организаций',
        'parser.synced' => 'Парсер: синхронизация',
        'parser.sync_requested' => 'Парсер: запрошена синхронизация',
        'parser.status_changed' => 'Парсер: изменён статус организации',
        'parser.task_created' => 'Парсер: создана задача',
        'parser.task_cancelled' => 'Парсер: задача отменена',
        'parser.email_search' => 'Парсер: поиск e-mail',
        'parser.contact_added' => 'Парсер: добавлен контакт',
        'parser.contact_updated' => 'Парсер: изменён контакт',
        'parser.contact_deleted' => 'Парсер: удалён контакт',
        'payment.refunded' => 'Возврат платежа',
        'photo.uploaded' => 'Загружено фото',
        'photo.updated' => 'Изменено фото',
        'post.created' => 'Создана публикация',
        'post.updated' => 'Изменена публикация',
        'post.deleted' => 'Удалена публикация',
        'promotion.order.approved' => 'Заказ продвижения одобрен',
        'promotion.order.rejected' => 'Заказ продвижения отклонён',
        'promotion.product.created' => 'Создан продукт продвижения',
        'review.reply' => 'Ответ на отзыв',
        'review.approve' => 'Отзыв одобрен',
        'review.reject' => 'Отзыв отклонён',
        'review.hide' => 'Отзыв скрыт',
        'review.restore' => 'Отзыв восстановлен',
        'role.created' => 'Создана роль',
        'role.updated' => 'Изменена роль',
        'role.deleted' => 'Удалена роль',
        'site_display.updated' => 'Изменены настройки показа на сайте',
        'tariff.created' => 'Создан тариф',
        'tariff.updated' => 'Изменён тариф',
        'tariff.trial_updated' => 'Изменён пробный период',
        'trial.requested' => 'Запрошен пробный период',
        'trial.activated' => 'Активирован пробный период',
        'user.updated' => 'Изменён пользователь',
    ];

    /** Объекты модерации и справочников в коде действия. */
    private const OBJECTS = [
        'clinic' => 'клиника', 'doctor' => 'врач', 'document' => 'документ', 'photo' => 'фото',
        'review' => 'отзыв', 'review_reply' => 'ответ на отзыв', 'promotion' => 'продвижение', 'broadcast' => 'рассылка',
        'cities' => 'город', 'City' => 'город', 'districts' => 'район', 'District' => 'район',
        'regions' => 'регион', 'Region' => 'регион', 'specialties' => 'направление', 'Specialty' => 'направление',
        'services' => 'услуга', 'Service' => 'услуга', 'concerns' => 'симптом', 'Concern' => 'симптом',
        'clinic_property_types' => 'свойство клиник', 'ClinicPropertyType' => 'свойство клиник',
        'pages' => 'CMS-страница', 'Page' => 'CMS-страница', 'seo' => 'SEO-шаблон', 'SeoTemplate' => 'SEO-шаблон',
    ];

    /** Решения и операции в конце кода действия. */
    private const VERBS = [
        'approve' => 'одобрено', 'approved' => 'одобрено', 'published' => 'опубликовано',
        'reject' => 'отклонено', 'rejected' => 'отклонено', 'hide' => 'скрыто', 'hidden' => 'скрыто',
        'restore' => 'восстановлено', 'saved' => 'сохранено', 'deleted' => 'удалено',
    ];

    /** Разделы журнала: префикс кода действия => название для фильтра. */
    public const SECTIONS = [
        'auth' => 'Вход и регистрация',
        'account' => 'Аккаунт',
        'user' => 'Пользователи',
        'role' => 'Роли и права',
        'clinic' => 'Клиники',
        'branch' => 'Филиалы',
        'doctor' => 'Врачи',
        'photo' => 'Фото',
        'document' => 'Документы',
        'post' => 'Публикации',
        'moderation' => 'Модерация',
        'review' => 'Отзывы',
        'complaint' => 'Жалобы',
        'duplicate' => 'Дубликаты',
        'dictionary' => 'Справочники',
        'geography' => 'География',
        'offers' => 'КП и демо',
        'campaigns' => 'Кампании КП',
        'broadcasts' => 'Рассылки',
        'promotion' => 'Продвижение',
        'tariff' => 'Тарифы',
        'trial' => 'Пробный период',
        'payment' => 'Платежи',
        'parser' => 'Парсер',
        'integration' => 'Интеграции',
        'assistant' => 'AI-ассистент',
        'site_display' => 'Показ на сайте',
    ];

    /** Типы объектов (class_basename модели). */
    private const SUBJECTS = [
        'Appointment' => 'Запись', 'AssistantKbEntry' => 'Статья базы знаний', 'Broadcast' => 'Рассылка',
        'Campaign' => 'Кампания КП', 'CampaignRecipient' => 'Получатель кампании', 'CardBonusType' => 'Бонус карточки',
        'City' => 'Город', 'Clinic' => 'Клиника', 'ClinicDocument' => 'Документ', 'ClinicPhoto' => 'Фото',
        'ClinicPost' => 'Публикация', 'ClinicPromotion' => 'Продвижение', 'ClinicPropertyType' => 'Свойство клиник',
        'ClinicService' => 'Услуга клиники', 'ClinicSubscription' => 'Подписка клиники', 'CmsPage' => 'CMS-страница',
        'Concern' => 'Симптом', 'DemoLink' => 'Демо-доступ', 'District' => 'Район', 'Doctor' => 'Врач',
        'DuplicateFlag' => 'Дубликат', 'IntegrationSetting' => 'Интеграция', 'Lead' => 'Заявка', 'Offer' => 'КП',
        'OfferApplication' => 'Заявка по КП', 'OfferTemplate' => 'Шаблон КП', 'Organization' => 'Организация',
        'OrganizationContact' => 'Контакт организации', 'ParsedOrganization' => 'Организация из парсера',
        'ParserTask' => 'Задача парсера', 'Payment' => 'Платёж', 'PromotionOrder' => 'Заказ продвижения',
        'PromotionProduct' => 'Продукт продвижения', 'Region' => 'Регион', 'Review' => 'Отзыв',
        'ReviewComplaint' => 'Жалоба на отзыв', 'Role' => 'Роль', 'SeoTemplate' => 'SEO-шаблон', 'Service' => 'Услуга',
        'SocialAccount' => 'Соцсеть', 'Specialty' => 'Направление', 'StopListEntry' => 'Стоп-лист', 'Tariff' => 'Тариф',
        'User' => 'Пользователь',
    ];

    public static function subject(?string $type, int|string|null $id): ?string
    {
        if ($type === null) {
            return null;
        }

        return (self::SUBJECTS[$type] ?? 'Объект').($id !== null ? ' № '.$id : '');
    }

    public static function result(?string $result): ?string
    {
        return match ($result) {
            null => null,
            'success' => 'Успешно',
            'failure' => 'Ошибка',
            default => 'Другое',
        };
    }

    public static function label(string $action): string
    {
        if (isset(self::LABELS[$action])) {
            return self::LABELS[$action];
        }

        $parts = explode('.', $action);
        $section = $parts[0];
        $verb = self::VERBS[end($parts)] ?? null;
        $object = count($parts) > 2 ? (self::OBJECTS[$parts[1]] ?? null) : null;

        return match (true) {
            $section === 'moderation' && $object !== null && $verb !== null => 'Модерация: '.$object.' — '.$verb,
            $section === 'dictionary' && $object !== null && $verb !== null => 'Справочник: '.$object.' — '.$verb,
            $action === 'complaint.uphold' => 'Жалоба на отзыв удовлетворена',
            $action === 'complaint.reject' => 'Жалоба на отзыв отклонена',
            default => 'Действие в системе',
        };
    }
}
