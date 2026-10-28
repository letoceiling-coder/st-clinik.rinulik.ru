<?php

use App\Http\Controllers\Account\AccountController;
use App\Http\Controllers\Account\AppointmentController as AccountAppointmentController;
use App\Http\Controllers\Account\PushSubscriptionController;
use App\Http\Controllers\Admin;
use App\Http\Controllers\Admin\AssistantController as AdminAssistantController;
use App\Http\Controllers\Api\AssistantController as ApiAssistantController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\MaxLoginController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegisterClinicController;
use App\Http\Controllers\Auth\SocialLinkController;
use App\Http\Controllers\Auth\VkOAuthController;
use App\Http\Controllers\Auth\YandexOAuthController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\BroadcastTrackingController;
use App\Http\Controllers\Cabinet;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\CityController;
use App\Http\Controllers\ClaimOfferController;
use App\Http\Controllers\ClinicController;
use App\Http\Controllers\ClinicFollowController;
use App\Http\Controllers\CollectionController;
use App\Http\Controllers\CollectionPagesController;
use App\Http\Controllers\DemoAccessController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\Max\MaxMiniAppController;
use App\Http\Controllers\OfferController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\PaymentWebhookController;
use App\Http\Controllers\PromotionTrackingController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SeoController;
use App\Http\Controllers\StaffInvitationController;
use App\Http\Controllers\Webhooks\MaxWebhookController;
use Illuminate\Support\Facades\Route;

// --- SEO ---------------------------------------------------------------
Route::get('/robots.txt', [SeoController::class, 'robots']);
Route::get('/sitemap.xml', [SeoController::class, 'sitemap']);

// --- Публичные страницы ------------------------------------------------
Route::get('/', HomeController::class)->name('home');
Route::get('/search', [SearchController::class, 'index'])->name('search');
Route::get('/clinics/{slug}', [ClinicController::class, 'show'])->name('clinics.show');
Route::get('/doctors/{slug}', [DoctorController::class, 'show'])->name('doctors.show');
Route::get('/tz', [PageController::class, 'tz'])->name('tz');
Route::get('/pages/{slug}', [PageController::class, 'show'])->name('pages.show');
foreach (['privacy', 'consent', 'review-rules', 'terms', 'about', 'for-clinics', 'clinic-agreement'] as $alias) {
    Route::get("/$alias", [PageController::class, 'show'])->defaults('slug', $alias)->name("alias.$alias");
}

Route::get('/favorites', [CollectionPagesController::class, 'favorites'])->name('favorites');
Route::get('/compare', [CollectionPagesController::class, 'compare'])->name('compare');
Route::post('/city/{city}', [CityController::class, 'switch'])->name('city.switch');
Route::post('/city/{city}/confirm', [CityController::class, 'confirm'])->name('city.confirm');
Route::post('/payments/tbank/webhook', [PaymentWebhookController::class, 'tbank'])->name('payments.tbank.webhook');
Route::middleware('throttle:promo-tracking')->group(function () {
    Route::get('/promotions/{promotion}/click', [PromotionTrackingController::class, 'click'])->name('promotions.click')->whereNumber('promotion');
    Route::get('/promotions/{promotion}/impression', [PromotionTrackingController::class, 'impression'])->name('promotions.impression')->whereNumber('promotion');
});

// --- Временные демо-входы для согласования с заказчиком -----------------
if (config('demo.enabled')) {
    Route::get('/clinic-cabinet-demo', [DemoAccessController::class, 'cabinet'])->name('demo.cabinet');
    Route::get('/admin-demo', [DemoAccessController::class, 'admin'])->name('demo.admin');
}

// --- Коммерческие предложения и демо-кабинет по ссылке -------------------
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/o/{code}', [OfferController::class, 'short'])->where('code', '[A-Za-z0-9]{10}')->name('offer.short');
    Route::get('/o/{code}/demo', [OfferController::class, 'shortDemo'])->where('code', '[A-Za-z0-9]{10}')->name('offer.demo');
    Route::get('/o/{code}/preview', [OfferController::class, 'preview'])->where('code', '[A-Za-z0-9]{10}')->name('offer.preview');
    Route::get('/o/p/{recipient}', [OfferController::class, 'pixel'])->whereNumber('recipient')->name('offers.pixel');
    Route::get('/offer/{token}', [OfferController::class, 'show'])->where('token', '[A-Za-z0-9_-]{40,64}')->name('offer.show');
    Route::get('/demo/{token}', [OfferController::class, 'demo'])->where('token', '[A-Za-z0-9_-]{40,64}')->name('demo.open');
    Route::match(['get', 'post'], '/unsubscribe/{recipient}', [OfferController::class, 'unsubscribe'])->whereNumber('recipient')->name('offers.unsubscribe');
    Route::get('/go/{code}', [BroadcastTrackingController::class, 'go'])->where('code', '[a-z0-9]{10}')->name('broadcast.go');
    Route::get('/broadcast/unsubscribe/{code}', [BroadcastTrackingController::class, 'unsubscribe'])->where('code', '[a-z0-9]{10}')->name('broadcast.unsubscribe');
    Route::get('/broadcast/clinic-unsubscribe/{code}', [BroadcastTrackingController::class, 'clinicUnsubscribe'])->where('code', '[a-z0-9]{10}')->name('broadcast.clinic-unsubscribe');
});
Route::post('/offer/{token}/apply', [OfferController::class, 'apply'])->where('token', '[A-Za-z0-9_-]{40,64}')->middleware('throttle:leads')->name('offer.apply');
Route::get('/offer/{token}/claim', [ClaimOfferController::class, 'show'])->where('token', '[A-Za-z0-9_-]{40,64}')->name('offer.claim.show');
Route::post('/offer/{token}/claim', [ClaimOfferController::class, 'store'])->where('token', '[A-Za-z0-9_-]{40,64}')->middleware(['auth', 'throttle:auth'])->name('offer.claim.store');
Route::post('/offer/{token}/claim/code', [ClaimOfferController::class, 'sendCode'])->where('token', '[A-Za-z0-9_-]{40,64}')->middleware(['auth', 'verified', 'throttle:3,10'])->name('offer.claim.code');
Route::post('/demo-exit', [OfferController::class, 'leaveDemo'])->name('demo.leave');

Route::post('/webhooks/max', MaxWebhookController::class)->name('webhooks.max');

Route::middleware('throttle:60,1')->group(function () {
    Route::get('/max', [MaxMiniAppController::class, 'home'])->name('max.miniapp');
    Route::get('/max/clinics', [MaxMiniAppController::class, 'clinics'])->name('max.clinics');
    Route::get('/max/clinics/{slug}', [MaxMiniAppController::class, 'clinic'])->name('max.clinic');
    Route::get('/max/appointments', [MaxMiniAppController::class, 'appointments'])->name('max.appointments');
    Route::post('/max/session', [MaxMiniAppController::class, 'session'])->middleware('throttle:auth')->name('max.session');
});

// --- Действия посетителей ----------------------------------------------
Route::post('/leads', [LeadController::class, 'store'])->middleware('throttle:leads')->name('leads.store');
Route::post('/api/v1/assistant/message', [ApiAssistantController::class, 'message'])->middleware('throttle:assistant')->name('api.v1.assistant.message');
Route::post('/api/v1/assistant/message/stream', [ApiAssistantController::class, 'stream'])->middleware('throttle:assistant')->name('api.v1.assistant.message.stream');
Route::post('/api/v1/assistant/lead', [ApiAssistantController::class, 'lead'])->middleware('throttle:leads')->name('api.v1.assistant.lead');

Route::middleware('auth')->group(function () {
    Route::post('/clinics/{slug}/follow', [ClinicFollowController::class, 'store'])->name('clinics.follow');
    Route::delete('/account/clinic-follows/{clinic}', [ClinicFollowController::class, 'destroy'])->whereNumber('clinic')->name('account.clinic-follows.destroy');
});

// --- Онлайн-запись --------------------------------------------------------
Route::get('/clinics/{slug}/booking', [BookingController::class, 'create'])->name('booking.create');
Route::post('/clinics/{slug}/booking', [BookingController::class, 'store'])->middleware('throttle:booking')->name('booking.store');
Route::middleware('signed')->group(function () {
    Route::get('/appointments/{appointment}', [BookingController::class, 'show'])->whereNumber('appointment')->name('appointments.show');
    Route::post('/appointments/{appointment}/cancel', [BookingController::class, 'cancel'])->whereNumber('appointment')->middleware('throttle:booking')->name('appointments.cancel');
    Route::post('/appointments/{appointment}/reschedule', [BookingController::class, 'reschedule'])->whereNumber('appointment')->middleware('throttle:booking')->name('appointments.reschedule');
});

// --- Авторизация -------------------------------------------------------
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::get('/register/clinic', [RegisterClinicController::class, 'create'])->name('register.clinic');
    Route::post('/register/clinic', [RegisterClinicController::class, 'store'])->middleware('throttle:auth');

    Route::get('/forgot-password', [PasswordResetController::class, 'requestForm'])->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'sendLink'])->middleware('throttle:password-reset')->name('password.email');
    Route::get('/password/reset/{token}', [PasswordResetController::class, 'resetForm'])->name('password.reset');
    Route::post('/password/reset', [PasswordResetController::class, 'reset'])->middleware('throttle:password-reset')->name('password.update');

    Route::get('/auth/social/link', [SocialLinkController::class, 'show'])->name('auth.social.link');
    Route::post('/auth/social/link', [SocialLinkController::class, 'confirm'])->middleware('throttle:auth')->name('auth.social.link.confirm');
});

Route::middleware('throttle:oauth-redirect')->group(function () {
    Route::get('/auth/yandex/redirect', [YandexOAuthController::class, 'redirect'])->name('auth.yandex.redirect');
    Route::get('/auth/vk/redirect', [VkOAuthController::class, 'redirect'])->name('auth.vk.redirect');
    Route::get('/auth/max/start', [MaxLoginController::class, 'start'])->name('auth.max.start');
});

Route::middleware('throttle:oauth-callback')->group(function () {
    Route::get('/auth/yandex/callback', [YandexOAuthController::class, 'callback'])->name('auth.yandex.callback');
    Route::get('/auth/vk/callback', [VkOAuthController::class, 'callback'])->name('auth.vk.callback');
});

Route::get('/auth/max/status/{code}', [MaxLoginController::class, 'status'])->middleware('throttle:max-login-status')->name('auth.max.status');
Route::get('/auth/max/complete/{code}', [MaxLoginController::class, 'complete'])->middleware(['signed', 'throttle:oauth-callback'])->name('auth.max.complete');

Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

Route::get('/invite/staff/{token}', [StaffInvitationController::class, 'show'])->name('staff.invite.show');
Route::post('/invite/staff/{token}', [StaffInvitationController::class, 'accept'])->middleware('auth')->name('staff.invite.accept');

Route::middleware('auth')->group(function () {
    Route::get('/email/verify', [EmailVerificationController::class, 'notice'])->name('verification.notice');
    Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware(['signed', 'throttle:email-verification'])
        ->name('verification.verify');
    Route::post('/email/verification-notification', [EmailVerificationController::class, 'send'])
        ->middleware('throttle:email-verification')
        ->name('verification.send');
});

Route::middleware('signed')->get('/account/email/confirm/{id}', [AccountController::class, 'confirmEmailChange'])
    ->whereNumber('id')
    ->name('account.email.confirm');

Route::middleware('auth')->group(function () {
    Route::post('/clinics/{slug}/reviews', [ReviewController::class, 'store'])->middleware('throttle:reviews')->name('reviews.store');
    Route::post('/reviews/{review}/complaints', [ReviewController::class, 'complain'])->middleware('throttle:reviews')->name('reviews.complain');
    Route::post('/collections/toggle', [CollectionController::class, 'toggle'])->name('collections.toggle');
    Route::post('/collections/sync', [CollectionController::class, 'sync'])->name('collections.sync');
});

// --- Личный кабинет пользователя ----------------------------------------
Route::middleware(['auth', 'verified'])->prefix('account')->name('account.')->group(function () {
    Route::get('/', [AccountController::class, 'overview'])->name('overview');
    Route::get('/profile', [AccountController::class, 'profile'])->name('profile');
    Route::put('/profile', [AccountController::class, 'updateProfile'])->name('profile.update');
    Route::put('/password', [AccountController::class, 'updatePassword'])->name('password.update');
    Route::post('/email', [AccountController::class, 'requestEmailChange'])->middleware('throttle:email-verification')->name('email.request');
    Route::delete('/social/{provider}', [AccountController::class, 'unlinkSocial'])->name('social.unlink');
    Route::delete('/', [AccountController::class, 'destroy'])->name('destroy');

    Route::get('/leads', [AccountController::class, 'leads'])->name('leads');
    Route::post('/leads/{lead}/cancel', [AccountController::class, 'cancelLead'])->name('leads.cancel');
    Route::get('/appointments', [AccountAppointmentController::class, 'index'])->name('appointments');
    Route::post('/appointments/{appointment}/cancel', [AccountAppointmentController::class, 'cancel'])->whereNumber('appointment')->name('appointments.cancel');
    Route::post('/appointments/{appointment}/reschedule', [AccountAppointmentController::class, 'reschedule'])->whereNumber('appointment')->middleware('throttle:booking')->name('appointments.reschedule');
    Route::get('/favorites', [AccountController::class, 'favorites'])->name('favorites');
    Route::get('/compare', [AccountController::class, 'compare'])->name('compare');
    Route::get('/history', [AccountController::class, 'history'])->name('history');
    Route::delete('/history', [AccountController::class, 'clearHistory'])->name('history.clear');

    Route::get('/reviews', [AccountController::class, 'reviews'])->name('reviews');
    Route::put('/reviews/{review}', [AccountController::class, 'updateReview'])->name('reviews.update');
    Route::delete('/reviews/{review}', [AccountController::class, 'deleteReview'])->name('reviews.delete');

    Route::get('/notifications', [AccountController::class, 'notifications'])->name('notifications');
    Route::put('/notification-preferences', [AccountController::class, 'updateNotificationPreferences'])->name('notification-preferences.update');
    Route::post('/push-subscription', [PushSubscriptionController::class, 'store'])->name('push-subscription.store');
    Route::delete('/push-subscription', [PushSubscriptionController::class, 'destroy'])->name('push-subscription.destroy');
    Route::post('/notifications/read-all', [AccountController::class, 'readAllNotifications'])->name('notifications.read-all');
    Route::post('/notifications/{notification}/read', [AccountController::class, 'readNotification'])->name('notifications.read');
});

// --- Кабинет клиники -----------------------------------------------------
Route::middleware(['clinic.owner', 'cabinet.ability'])->prefix('clinic-cabinet')->name('cabinet.')->group(function () {
    Route::get('/', [Cabinet\DashboardController::class, 'index'])->name('dashboard');
    Route::get('/stats', [Cabinet\DashboardController::class, 'stats'])->name('stats');

    Route::get('/organization', [Cabinet\OrganizationController::class, 'edit'])->name('organization.edit');
    Route::put('/organization', [Cabinet\OrganizationController::class, 'update'])->name('organization.update');
    Route::get('/settings', [Cabinet\SettingsController::class, 'index'])->name('settings');
    Route::put('/settings/notifications', [Cabinet\SettingsController::class, 'updateNotifications'])->name('settings.notifications');
    Route::put('/settings/assistant-leads', [Cabinet\SettingsController::class, 'updateAssistantLeads'])->name('settings.assistant-leads');

    Route::get('/staff', [Cabinet\StaffController::class, 'index'])->name('staff.index');
    Route::post('/staff/invite', [Cabinet\StaffController::class, 'invite'])->name('staff.invite');
    Route::delete('/staff/{staffMember}', [Cabinet\StaffController::class, 'revoke'])->name('staff.revoke')->whereNumber('staffMember');

    Route::get('/branches', [Cabinet\BranchController::class, 'index'])->name('branches');
    Route::get('/branches/create', [Cabinet\BranchController::class, 'create'])->name('branches.create');
    Route::post('/branches', [Cabinet\BranchController::class, 'store'])->name('branches.store');
    Route::get('/branches/{clinic:id}/edit', [Cabinet\BranchController::class, 'edit'])->name('branches.edit');
    Route::put('/branches/{clinic:id}', [Cabinet\BranchController::class, 'update'])->name('branches.update');
    Route::post('/branches/{clinic:id}/submit', [Cabinet\BranchController::class, 'submit'])->name('branches.submit');
    Route::post('/branches/{clinic:id}/publish', [Cabinet\BranchController::class, 'publish'])->name('branches.publish');
    Route::get('/schedule', [Cabinet\BranchController::class, 'schedule'])->name('schedule');
    Route::put('/schedule', [Cabinet\BranchController::class, 'updateSchedule'])->name('schedule.update');
    Route::get('/schedule/doctors', [Cabinet\DoctorScheduleController::class, 'index'])->name('schedule.doctors');
    Route::put('/schedule/doctors/{doctor:id}', [Cabinet\DoctorScheduleController::class, 'update'])->name('schedule.doctors.update');
    Route::post('/schedule/doctors/{doctor:id}/exceptions', [Cabinet\DoctorScheduleController::class, 'storeException'])->name('schedule.exceptions.store');
    Route::delete('/schedule/exceptions/{exception}', [Cabinet\DoctorScheduleController::class, 'destroyException'])->name('schedule.exceptions.destroy')->whereNumber('exception');

    Route::get('/broadcasts', [Cabinet\BroadcastController::class, 'index'])->name('broadcasts.index');
    Route::post('/broadcasts', [Cabinet\BroadcastController::class, 'store'])->middleware('throttle:10,1')->name('broadcasts.store');
    Route::post('/broadcasts/{broadcast}/submit', [Cabinet\BroadcastController::class, 'submit'])->whereNumber('broadcast')->name('broadcasts.submit');
    Route::post('/broadcasts/{broadcast}/start', [Cabinet\BroadcastController::class, 'start'])->whereNumber('broadcast')->name('broadcasts.start');

    Route::get('/card-bonuses', [Cabinet\CardBonusController::class, 'index'])->name('card-bonuses');
    Route::put('/card-bonuses', [Cabinet\CardBonusController::class, 'update'])->name('card-bonuses.update');

    Route::get('/doctors', [Cabinet\DoctorController::class, 'index'])->name('doctors');
    Route::get('/doctors/create', [Cabinet\DoctorController::class, 'create'])->name('doctors.create');
    Route::post('/doctors', [Cabinet\DoctorController::class, 'store'])->name('doctors.store');
    Route::get('/doctors/{doctor:id}/edit', [Cabinet\DoctorController::class, 'edit'])->name('doctors.edit');
    Route::put('/doctors/{doctor:id}', [Cabinet\DoctorController::class, 'update'])->name('doctors.update');
    Route::delete('/doctors/{doctor:id}', [Cabinet\DoctorController::class, 'destroy'])->name('doctors.destroy');

    Route::get('/prices', [Cabinet\PriceController::class, 'index'])->name('prices');
    Route::get('/prices/template', [Cabinet\PriceController::class, 'template'])->name('prices.template');
    Route::get('/prices/export', [Cabinet\PriceController::class, 'export'])->name('prices.export');
    Route::post('/prices/import', [Cabinet\PriceController::class, 'import'])->name('prices.import');
    Route::post('/prices', [Cabinet\PriceController::class, 'store'])->name('prices.store');
    Route::put('/prices/{price}', [Cabinet\PriceController::class, 'update'])->name('prices.update')->whereNumber('price');
    Route::delete('/prices/{price}', [Cabinet\PriceController::class, 'destroy'])->name('prices.destroy')->whereNumber('price');

    Route::get('/photos', [Cabinet\MediaController::class, 'photos'])->name('photos');
    Route::post('/photos', [Cabinet\MediaController::class, 'storePhoto'])->name('photos.store');
    Route::put('/photos/{photo}', [Cabinet\MediaController::class, 'updatePhoto'])->name('photos.update')->whereNumber('photo');
    Route::delete('/photos/{photo}', [Cabinet\MediaController::class, 'destroyPhoto'])->name('photos.destroy')->whereNumber('photo');

    Route::get('/posts', [Cabinet\PostController::class, 'index'])->name('posts');
    Route::post('/posts', [Cabinet\PostController::class, 'store'])->name('posts.store');
    Route::put('/posts/{post}', [Cabinet\PostController::class, 'update'])->name('posts.update')->whereNumber('post');
    Route::delete('/posts/{post}', [Cabinet\PostController::class, 'destroy'])->name('posts.destroy')->whereNumber('post');

    Route::get('/documents', [Cabinet\MediaController::class, 'documents'])->name('documents');
    Route::post('/documents', [Cabinet\MediaController::class, 'storeDocument'])->name('documents.store');
    Route::get('/documents/{document}/file', [Cabinet\MediaController::class, 'downloadDocument'])->name('documents.file')->whereNumber('document');
    Route::delete('/documents/{document}', [Cabinet\MediaController::class, 'destroyDocument'])->name('documents.destroy')->whereNumber('document');

    Route::get('/reviews', [Cabinet\ReviewController::class, 'index'])->name('reviews');
    Route::post('/reviews/{review}/reply', [Cabinet\ReviewController::class, 'reply'])->name('reviews.reply')->whereNumber('review');
    Route::post('/reviews/{review}/complaint', [Cabinet\ReviewController::class, 'complain'])->name('reviews.complain')->whereNumber('review');

    Route::get('/calendar', [Cabinet\AppointmentController::class, 'index'])->name('calendar');
    Route::post('/calendar', [Cabinet\AppointmentController::class, 'store'])->name('calendar.store');
    Route::put('/calendar/{appointment}', [Cabinet\AppointmentController::class, 'update'])->name('calendar.update')->whereNumber('appointment');
    Route::post('/calendar/{appointment}/status', [Cabinet\AppointmentController::class, 'status'])->name('calendar.status')->whereNumber('appointment');
    Route::post('/calendar/{appointment}/reschedule/approve', [Cabinet\AppointmentController::class, 'approveReschedule'])->name('calendar.reschedule.approve')->whereNumber('appointment');
    Route::post('/calendar/{appointment}/reschedule/reject', [Cabinet\AppointmentController::class, 'rejectReschedule'])->name('calendar.reschedule.reject')->whereNumber('appointment');

    Route::get('/leads', [Cabinet\LeadController::class, 'index'])->name('leads');
    Route::put('/leads/{lead}', [Cabinet\LeadController::class, 'update'])->name('leads.update')->whereNumber('lead');
    Route::post('/leads/{lead}/accept', [Cabinet\LeadController::class, 'accept'])->name('leads.accept')->whereNumber('lead');
    Route::post('/leads/{lead}/appointment', [Cabinet\LeadController::class, 'appointment'])->name('leads.appointment')->whereNumber('lead');

    Route::get('/payments', [Cabinet\PaymentController::class, 'index'])->name('payments.index');
    Route::post('/payments/tariffs/{tariff}/checkout', [Cabinet\PaymentController::class, 'checkout'])->name('payments.checkout')->whereNumber('tariff');
    Route::get('/payments/return/{payment}', [Cabinet\PaymentController::class, 'return'])->name('payments.return')->whereNumber('payment');
    Route::put('/payments/auto-renew', [Cabinet\PaymentController::class, 'updateAutoRenew'])->name('payments.auto-renew');

    Route::get('/promotions', [Cabinet\PromotionController::class, 'index'])->name('promotions');
    Route::post('/promotions/checkout', [Cabinet\PromotionController::class, 'checkout'])->name('promotions.checkout');
    Route::get('/promotions/return/{order}', [Cabinet\PromotionController::class, 'return'])->name('promotions.return')->whereNumber('order');
});

// --- Админ-панель --------------------------------------------------------
Route::middleware(['auth', 'perm:admin.dashboard'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [Admin\DashboardController::class, 'index'])->name('dashboard');
    Route::get('/appointments', [Admin\AppointmentController::class, 'index'])->middleware('perm:admin.appointments')->name('appointments');
    Route::middleware('perm:admin.reports')->group(function () {
        Route::get('/reports', [Admin\ReportController::class, 'index'])->name('reports');
        Route::post('/reports', [Admin\ReportController::class, 'store'])->name('reports.store');
        Route::get('/reports/{export}/download', [Admin\ReportController::class, 'download'])->name('reports.download')->whereNumber('export');
    });
    Route::get('/analytics', [Admin\AnalyticsController::class, 'index'])->middleware('perm:admin.analytics')->name('analytics');

    Route::middleware('perm:admin.dictionaries')->group(function () {
        Route::get('/geography', [Admin\GeographyController::class, 'index'])->name('geography');
        Route::post('/geography/import', [Admin\GeographyController::class, 'import'])->name('geography.import');
    });

    Route::middleware('perm:admin.users')->group(function () {
        Route::get('/users', [Admin\UserController::class, 'index'])->name('users');
        Route::get('/users/{user}', [Admin\UserController::class, 'show'])->name('users.show');
        Route::put('/users/{user}', [Admin\UserController::class, 'update'])->name('users.update');
    });

    Route::middleware('perm:admin.clinics')->group(function () {
        Route::get('/clinics', [Admin\ClinicController::class, 'index'])->name('clinics');
        Route::get('/clinics/create', [Admin\ClinicController::class, 'create'])->name('clinics.create');
        Route::post('/clinics', [Admin\ClinicController::class, 'store'])->name('clinics.store');
        Route::put('/clinics/{clinic}/profile', [Admin\ClinicController::class, 'updateProfile'])->name('clinics.profile');
        Route::get('/clinics/{clinic}', [Admin\ClinicController::class, 'show'])->name('clinics.show');
        Route::put('/clinics/{clinic}', [Admin\ClinicController::class, 'update'])->name('clinics.update');
        Route::post('/clinics/{clinic}/organization/block', [Admin\ClinicController::class, 'blockOrganization'])->name('clinics.organization.block');
        Route::post('/clinics/{clinic}/organization/unblock', [Admin\ClinicController::class, 'unblockOrganization'])->name('clinics.organization.unblock');
        Route::delete('/clinics/{clinic}', [Admin\ClinicController::class, 'destroy'])->name('clinics.destroy');
    });

    Route::middleware('perm:admin.doctors')->group(function () {
        Route::get('/doctors', [Admin\ClinicController::class, 'doctors'])->name('doctors');
        Route::put('/doctors/{doctor}', [Admin\ClinicController::class, 'updateDoctor'])->name('doctors.update');
    });

    Route::middleware('perm:admin.reviews')->group(function () {
        Route::get('/reviews', [Admin\ReviewController::class, 'index'])->name('reviews');
        Route::put('/reviews/{review}', [Admin\ReviewController::class, 'update'])->name('reviews.update');
    });

    Route::middleware('perm:admin.complaints')->group(function () {
        Route::get('/complaints', [Admin\ReviewController::class, 'complaints'])->name('complaints');
        Route::post('/complaints/{complaint}/resolve', [Admin\ReviewController::class, 'resolve'])->name('complaints.resolve');
    });

    Route::middleware('perm:admin.moderation')->group(function () {
        Route::get('/moderation', [Admin\ModerationController::class, 'index'])->name('moderation');
        Route::post('/moderation/settings', [Admin\ModerationController::class, 'updateSettings'])->name('moderation.settings');
        Route::post('/moderation/{type}/{id}', [Admin\ModerationController::class, 'decide'])->name('moderation.decide')->whereNumber('id');
        Route::get('/moderation/documents/{document}', [Admin\ModerationController::class, 'document'])->name('moderation.document')->whereNumber('document');
    });

    Route::middleware('perm:admin.duplicates')->group(function () {
        Route::get('/duplicates', [Admin\DuplicateController::class, 'index'])->name('duplicates');
        Route::post('/duplicates/dismiss', [Admin\DuplicateController::class, 'dismiss'])->name('duplicates.dismiss');
        Route::post('/duplicates/merge', [Admin\DuplicateController::class, 'merge'])->name('duplicates.merge');
    });

    // права на конкретный справочник проверяются в контроллере
    Route::get('/dictionaries/{resource}', [Admin\DictionaryController::class, 'index'])->name('dictionaries');
    Route::post('/dictionaries/{resource}', [Admin\DictionaryController::class, 'store'])->name('dictionaries.store');
    Route::put('/dictionaries/{resource}/{id}', [Admin\DictionaryController::class, 'update'])->name('dictionaries.update')->whereNumber('id');
    Route::delete('/dictionaries/{resource}/{id}', [Admin\DictionaryController::class, 'destroy'])->name('dictionaries.destroy')->whereNumber('id');

    Route::middleware('perm:admin.roles')->group(function () {
        Route::get('/roles', [Admin\RoleController::class, 'index'])->name('roles');
        Route::post('/roles', [Admin\RoleController::class, 'store'])->name('roles.store');
        Route::put('/roles/{role}', [Admin\RoleController::class, 'update'])->name('roles.update');
        Route::delete('/roles/{role}', [Admin\RoleController::class, 'destroy'])->name('roles.destroy');
    });

    Route::get('/audit', [Admin\AuditController::class, 'index'])->middleware('perm:admin.audit')->name('audit');

    Route::middleware('perm:admin.assistant')->prefix('assistant')->name('assistant.')->group(function () {
        Route::get('/', [AdminAssistantController::class, 'edit'])->name('edit');
        Route::get('/conversations/{conversation}', [AdminAssistantController::class, 'show'])->name('conversations.show');
        Route::put('/', [AdminAssistantController::class, 'update'])->name('update');
        Route::post('/kb', [AdminAssistantController::class, 'storeKb'])->name('kb.store');
        Route::put('/kb/{entry}', [AdminAssistantController::class, 'updateKb'])->name('kb.update');
        Route::delete('/kb/{entry}', [AdminAssistantController::class, 'destroyKb'])->name('kb.destroy');
    });

    Route::middleware('perm:admin.integrations')->prefix('integrations')->name('integrations.')->group(function () {
        Route::get('/max-publish', [Admin\MaxPublishController::class, 'index'])->name('max-publish');
        Route::get('/', [Admin\IntegrationController::class, 'index'])->name('index');
        Route::put('/{group}', [Admin\IntegrationController::class, 'update'])->name('update');
        Route::post('/{group}/check', [Admin\IntegrationController::class, 'check'])->middleware('throttle:20,1')->name('check');
        Route::post('/web_push/generate', [Admin\IntegrationController::class, 'generateVapid'])->middleware('throttle:5,1')->name('web_push.generate');
        Route::post('/web_push/test', [Admin\IntegrationController::class, 'sendTestWebPush'])->middleware('throttle:10,1')->name('web_push.test');
    });

    Route::middleware('perm:admin.broadcasts')->prefix('broadcasts')->name('broadcasts.')->group(function () {
        Route::get('/', [Admin\BroadcastController::class, 'index'])->name('index');
        Route::post('/', [Admin\BroadcastController::class, 'store'])->middleware('throttle:10,1')->name('store');
        Route::put('/clinic-settings', [Admin\BroadcastController::class, 'updateClinicSettings'])->name('clinic-settings');
        Route::get('/{broadcast}', [Admin\BroadcastController::class, 'show'])->whereNumber('broadcast')->name('show');
        Route::put('/{broadcast}', [Admin\BroadcastController::class, 'update'])->name('update');
        Route::get('/{broadcast}/estimate', [Admin\BroadcastController::class, 'estimate'])->middleware('throttle:120,1')->name('estimate');
        Route::post('/{broadcast}/preview', [Admin\BroadcastController::class, 'preview'])->middleware('throttle:60,1')->name('preview');
        Route::post('/{broadcast}/test', [Admin\BroadcastController::class, 'test'])->middleware('throttle:10,1')->name('test');
        Route::post('/{broadcast}/build', [Admin\BroadcastController::class, 'build'])->middleware('throttle:10,1')->name('build');
        Route::post('/{broadcast}/start', [Admin\BroadcastController::class, 'start'])->name('start');
        Route::post('/{broadcast}/pause', [Admin\BroadcastController::class, 'pause'])->name('pause');
        Route::post('/{broadcast}/cancel', [Admin\BroadcastController::class, 'cancel'])->name('cancel');
        Route::post('/{broadcast}/schedule', [Admin\BroadcastController::class, 'schedule'])->name('schedule');
        Route::post('/{broadcast}/moderate', [Admin\BroadcastController::class, 'moderate'])->name('moderate');
    });

    Route::middleware('perm:offers.manage')->group(function () {
        Route::prefix('offers')->name('offers.')->group(function () {
            Route::get('/', [Admin\OfferController::class, 'index'])->name('index');
            Route::post('/', [Admin\OfferController::class, 'store'])->middleware('throttle:30,1')->name('store');
            Route::put('/settings', [Admin\OfferController::class, 'updateSettings'])->name('settings');
            Route::post('/stop-list', [Admin\OfferController::class, 'storeStop'])->name('stop.store');
            Route::delete('/stop-list/{entry}', [Admin\OfferController::class, 'destroyStop'])->name('stop.destroy');
            Route::put('/applications/{application}', [Admin\OfferController::class, 'updateApplication'])->name('applications.update');
            Route::put('/demo-links/{demoLink}', [Admin\OfferController::class, 'updateDemo'])->name('demo.update');
            Route::post('/demo-links/{demoLink}/revoke', [Admin\OfferController::class, 'revokeDemo'])->name('demo.revoke');

            Route::get('/templates/create', [Admin\OfferTemplateController::class, 'create'])->name('templates.create');
            Route::post('/templates', [Admin\OfferTemplateController::class, 'store'])->name('templates.store');
            Route::post('/templates/preview', [Admin\OfferTemplateController::class, 'preview'])->middleware('throttle:120,1')->name('templates.preview');
            Route::post('/templates/test', [Admin\OfferTemplateController::class, 'test'])->middleware('throttle:10,1')->name('templates.test');
            Route::get('/templates/{template}', [Admin\OfferTemplateController::class, 'edit'])->name('templates.edit');
            Route::put('/templates/{template}', [Admin\OfferTemplateController::class, 'update'])->name('templates.update');

            Route::get('/{offer}', [Admin\OfferController::class, 'show'])->whereNumber('offer')->name('show');
            Route::put('/{offer}/content', [Admin\OfferController::class, 'customize'])->whereNumber('offer')->name('customize');
            Route::post('/{offer}/revoke', [Admin\OfferController::class, 'revoke'])->whereNumber('offer')->name('revoke');
            Route::post('/{offer}/connect', [Admin\OfferController::class, 'connect'])->whereNumber('offer')->name('connect');
            Route::post('/{offer}/demo', [Admin\OfferController::class, 'reissueDemo'])->whereNumber('offer')->name('demo.reissue');
            Route::post('/bulk', [Admin\OfferController::class, 'bulk'])->middleware('throttle:10,1')->name('bulk');
            Route::post('/{offer}/send', [Admin\OfferController::class, 'send'])->whereNumber('offer')->middleware('throttle:30,1')->name('send');
            Route::put('/{offer}/extra', [Admin\OfferController::class, 'extra'])->whereNumber('offer')->name('extra');
            Route::post('/{offer}/improve', [Admin\OfferController::class, 'improve'])->whereNumber('offer')->middleware('throttle:20,1')->name('improve');
        });

        Route::prefix('campaigns')->name('campaigns.')->group(function () {
            Route::get('/', [Admin\CampaignController::class, 'index'])->name('index');
            Route::post('/', [Admin\CampaignController::class, 'store'])->middleware('throttle:10,1')->name('store');
            Route::post('/estimate', [Admin\CampaignController::class, 'estimate'])->middleware('throttle:120,1')->name('estimate');
            Route::get('/{campaign}', [Admin\CampaignController::class, 'show'])->whereNumber('campaign')->name('show');
            Route::post('/{campaign}/start', [Admin\CampaignController::class, 'start'])->name('start');
            Route::post('/{campaign}/pause', [Admin\CampaignController::class, 'pause'])->name('pause');
            Route::post('/{campaign}/rebuild', [Admin\CampaignController::class, 'rebuild'])->middleware('throttle:10,1')->name('rebuild');
            Route::get('/{campaign}/export', [Admin\CampaignController::class, 'export'])->name('export');
            Route::post('/recipients/{recipient}/mark', [Admin\CampaignController::class, 'mark'])->name('recipients.mark');
            Route::post('/recipients/{recipient}/retry', [Admin\CampaignController::class, 'retry'])->name('recipients.retry');
        });
    });

    Route::middleware('perm:admin.parser')->prefix('parser')->name('parser.')->group(function () {
        Route::get('/', [Admin\ParserController::class, 'index'])->name('index');
        Route::get('/activity', [Admin\ParserController::class, 'activity'])->middleware('throttle:60,1')->name('activity');
        Route::post('/tasks', [Admin\ParserController::class, 'storeTask'])->middleware('throttle:10,1')->name('tasks.store');
        Route::post('/tasks/{task}/refresh', [Admin\ParserController::class, 'refreshTask'])->middleware('throttle:30,1')->name('tasks.refresh')->whereNumber('task');
        Route::post('/tasks/{task}/cancel', [Admin\ParserController::class, 'cancelTask'])->name('tasks.cancel')->whereNumber('task');
        Route::post('/sync', [Admin\ParserController::class, 'sync'])->middleware('throttle:10,1')->name('sync');
        Route::post('/organizations/import', [Admin\ParserController::class, 'importMany'])->name('organizations.import-many');
        Route::post('/organizations/status', [Admin\ParserController::class, 'updateMany'])->name('organizations.status-many');
        Route::get('/organizations/{parsed}', [Admin\ParserController::class, 'show'])->name('organizations.show')->whereNumber('parsed');
        Route::post('/organizations/{parsed}/import', [Admin\ParserController::class, 'import'])->name('organizations.import')->whereNumber('parsed');
        Route::post('/organizations/{parsed}/status', [Admin\ParserController::class, 'updateStatus'])->name('organizations.status')->whereNumber('parsed');
        Route::post('/organizations/{parsed}/emails', [Admin\ParserController::class, 'findEmails'])->middleware('throttle:20,1')->name('organizations.emails')->whereNumber('parsed');
        Route::post('/organizations/{parsed}/contacts', [Admin\ParserController::class, 'storeContact'])->name('organizations.contacts.store')->whereNumber('parsed');
        Route::put('/contacts/{contact}', [Admin\ParserController::class, 'updateContact'])->name('contacts.update')->whereNumber('contact');
        Route::delete('/contacts/{contact}', [Admin\ParserController::class, 'destroyContact'])->name('contacts.destroy')->whereNumber('contact');
    });

    Route::middleware('perm:admin.site_display')->group(function () {
        Route::get('/site-display', [Admin\SiteDisplayController::class, 'index'])->name('site-display');
        Route::put('/site-display', [Admin\SiteDisplayController::class, 'update'])->name('site-display.update');
    });

    Route::middleware('perm:admin.promotions')->group(function () {
        Route::get('/card-bonuses', [Admin\CardBonusTypeController::class, 'index'])->name('card-bonuses');
        Route::put('/card-bonuses', [Admin\CardBonusTypeController::class, 'update'])->name('card-bonuses.update');
        Route::get('/clinic-card-appearance', [Admin\ClinicCardAppearanceController::class, 'index'])->name('clinic-card-appearance');
        Route::put('/clinic-card-appearance', [Admin\ClinicCardAppearanceController::class, 'update'])->name('clinic-card-appearance.update');
    });

    Route::middleware('perm:admin.tariffs')->group(function () {
        Route::get('/tariffs', [Admin\TariffController::class, 'index'])->name('tariffs.index');
        Route::post('/tariffs', [Admin\TariffController::class, 'store'])->name('tariffs.store');
        Route::put('/tariffs/trial', [Admin\TariffController::class, 'trial'])->name('tariffs.trial');
        Route::put('/tariffs/{tariff}', [Admin\TariffController::class, 'update'])->name('tariffs.update')->whereNumber('tariff');
    });

    Route::middleware('perm:admin.finance')->group(function () {
        Route::get('/finance', [Admin\FinanceController::class, 'index'])->name('finance.index');
        Route::put('/finance/settings', [Admin\FinanceController::class, 'updateSettings'])->name('finance.settings');
        Route::post('/finance/payments/{payment}/refund', [Admin\FinanceController::class, 'refund'])->name('finance.refund')->whereNumber('payment');
    });

    Route::middleware('perm:admin.promotions')->prefix('promotions')->name('promotions.')->group(function () {
        Route::get('/', [Admin\PromotionController::class, 'index'])->name('index');
        Route::post('/products', [Admin\PromotionController::class, 'storeProduct'])->name('products.store');
        Route::put('/products/{product}', [Admin\PromotionController::class, 'updateProduct'])->name('products.update');
        Route::post('/packages', [Admin\PromotionController::class, 'storePackage'])->name('packages.store');
        Route::put('/packages/{package}', [Admin\PromotionController::class, 'updatePackage'])->name('packages.update');
        Route::post('/prices', [Admin\PromotionController::class, 'storePrice'])->name('prices.store');
        Route::delete('/prices/{price}', [Admin\PromotionController::class, 'destroyPrice'])->name('prices.destroy');
        Route::post('/settings', [Admin\PromotionController::class, 'storeSetting'])->name('settings.store');
        Route::post('/orders/{order}/approve', [Admin\PromotionController::class, 'approveOrder'])->name('orders.approve');
        Route::post('/orders/{order}/reject', [Admin\PromotionController::class, 'rejectOrder'])->name('orders.reject');
    });
});

// --- Городские страницы (последними, чтобы не перехватывать служебные URL) ---
Route::prefix('{city}')->group(function () {
    Route::get('/clinics', [CatalogController::class, 'clinics'])->name('city.clinics');
    Route::get('/doctors', [CatalogController::class, 'doctors'])->name('city.doctors');
    Route::get('/directions', [CatalogController::class, 'directions'])->name('city.directions');
    Route::get('/directions/{specialty}', [CatalogController::class, 'direction'])->name('city.direction');
    Route::get('/prices', [CatalogController::class, 'prices'])->name('city.prices');
    Route::get('/reviews', [CatalogController::class, 'reviews'])->name('city.reviews');
    Route::get('/concerns/{concern}', [CatalogController::class, 'concern'])->name('city.concern');
});
