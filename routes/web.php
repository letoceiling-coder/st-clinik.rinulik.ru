<?php

use App\Http\Controllers\Account\AccountController;
use App\Http\Controllers\Admin;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Cabinet;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\CityController;
use App\Http\Controllers\ClinicController;
use App\Http\Controllers\CollectionController;
use App\Http\Controllers\CollectionPagesController;
use App\Http\Controllers\DemoAccessController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\PaymentWebhookController;
use App\Http\Controllers\PromotionTrackingController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SeoController;
use Illuminate\Support\Facades\Route;

// --- SEO ---------------------------------------------------------------
Route::get('/robots.txt', [SeoController::class, 'robots']);
Route::get('/sitemap.xml', [SeoController::class, 'sitemap']);

// --- Публичные страницы ------------------------------------------------
Route::get('/', HomeController::class)->name('home');
Route::get('/search', [SearchController::class, 'index'])->name('search');
Route::get('/clinics/{slug}', [ClinicController::class, 'show'])->name('clinics.show');
Route::get('/doctors/{slug}', [DoctorController::class, 'show'])->name('doctors.show');
Route::get('/pages/{slug}', [PageController::class, 'show'])->name('pages.show');
foreach (['privacy', 'consent', 'review-rules', 'terms', 'about', 'for-clinics'] as $alias) {
    Route::get("/$alias", [PageController::class, 'show'])->defaults('slug', $alias)->name("alias.$alias");
}

Route::get('/favorites', [CollectionPagesController::class, 'favorites'])->name('favorites');
Route::get('/compare', [CollectionPagesController::class, 'compare'])->name('compare');
Route::post('/city/{city}', [CityController::class, 'switch'])->name('city.switch');
Route::post('/payments/yookassa/webhook', [PaymentWebhookController::class, 'yookassa'])->name('payments.yookassa.webhook');
Route::get('/promotions/{promotion}/click', [PromotionTrackingController::class, 'click'])->name('promotions.click')->whereNumber('promotion');
Route::get('/promotions/{promotion}/impression', [PromotionTrackingController::class, 'impression'])->name('promotions.impression')->whereNumber('promotion');

// --- Временные демо-входы для согласования с заказчиком -----------------
if (config('demo.enabled')) {
    Route::get('/clinic-cabinet-demo', [DemoAccessController::class, 'cabinet'])->name('demo.cabinet');
    Route::get('/admin-demo', [DemoAccessController::class, 'admin'])->name('demo.admin');
}

// --- Действия посетителей ----------------------------------------------
Route::post('/leads', [LeadController::class, 'store'])->middleware('throttle:leads')->name('leads.store');

// --- Авторизация -------------------------------------------------------
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
});
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

Route::middleware('auth')->group(function () {
    Route::post('/clinics/{slug}/reviews', [ReviewController::class, 'store'])->middleware('throttle:reviews')->name('reviews.store');
    Route::post('/reviews/{review}/complaints', [ReviewController::class, 'complain'])->middleware('throttle:reviews')->name('reviews.complain');
    Route::post('/collections/toggle', [CollectionController::class, 'toggle'])->name('collections.toggle');
    Route::post('/collections/sync', [CollectionController::class, 'sync'])->name('collections.sync');
});

// --- Личный кабинет пользователя ----------------------------------------
Route::middleware('auth')->prefix('account')->name('account.')->group(function () {
    Route::get('/', [AccountController::class, 'overview'])->name('overview');
    Route::get('/profile', [AccountController::class, 'profile'])->name('profile');
    Route::put('/profile', [AccountController::class, 'updateProfile'])->name('profile.update');
    Route::put('/password', [AccountController::class, 'updatePassword'])->name('password.update');
    Route::delete('/', [AccountController::class, 'destroy'])->name('destroy');

    Route::get('/leads', [AccountController::class, 'leads'])->name('leads');
    Route::post('/leads/{lead}/cancel', [AccountController::class, 'cancelLead'])->name('leads.cancel');
    Route::get('/favorites', [AccountController::class, 'favorites'])->name('favorites');
    Route::get('/compare', [AccountController::class, 'compare'])->name('compare');
    Route::get('/history', [AccountController::class, 'history'])->name('history');
    Route::delete('/history', [AccountController::class, 'clearHistory'])->name('history.clear');

    Route::get('/reviews', [AccountController::class, 'reviews'])->name('reviews');
    Route::put('/reviews/{review}', [AccountController::class, 'updateReview'])->name('reviews.update');
    Route::delete('/reviews/{review}', [AccountController::class, 'deleteReview'])->name('reviews.delete');

    Route::get('/notifications', [AccountController::class, 'notifications'])->name('notifications');
    Route::post('/notifications/read-all', [AccountController::class, 'readAllNotifications'])->name('notifications.read-all');
    Route::post('/notifications/{notification}/read', [AccountController::class, 'readNotification'])->name('notifications.read');
});

// --- Кабинет клиники -----------------------------------------------------
Route::middleware(['auth', 'clinic.owner'])->prefix('clinic-cabinet')->name('cabinet.')->group(function () {
    Route::get('/', [Cabinet\DashboardController::class, 'index'])->name('dashboard');
    Route::get('/stats', [Cabinet\DashboardController::class, 'stats'])->name('stats');

    Route::get('/branches', [Cabinet\BranchController::class, 'index'])->name('branches');
    Route::get('/branches/create', [Cabinet\BranchController::class, 'create'])->name('branches.create');
    Route::post('/branches', [Cabinet\BranchController::class, 'store'])->name('branches.store');
    Route::get('/branches/{clinic:id}/edit', [Cabinet\BranchController::class, 'edit'])->name('branches.edit');
    Route::put('/branches/{clinic:id}', [Cabinet\BranchController::class, 'update'])->name('branches.update');
    Route::post('/branches/{clinic:id}/submit', [Cabinet\BranchController::class, 'submit'])->name('branches.submit');
    Route::get('/schedule', [Cabinet\BranchController::class, 'schedule'])->name('schedule');
    Route::put('/schedule', [Cabinet\BranchController::class, 'updateSchedule'])->name('schedule.update');

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

    Route::get('/leads', [Cabinet\LeadController::class, 'index'])->name('leads');
    Route::put('/leads/{lead}', [Cabinet\LeadController::class, 'update'])->name('leads.update')->whereNumber('lead');

    Route::get('/promotions', [Cabinet\PromotionController::class, 'index'])->name('promotions');
    Route::post('/promotions/checkout', [Cabinet\PromotionController::class, 'checkout'])->name('promotions.checkout');
    Route::get('/promotions/return/{order}', [Cabinet\PromotionController::class, 'return'])->name('promotions.return')->whereNumber('order');
});

// --- Админ-панель --------------------------------------------------------
Route::middleware(['auth', 'perm:admin.dashboard'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [Admin\DashboardController::class, 'index'])->name('dashboard');

    Route::middleware('perm:admin.users')->group(function () {
        Route::get('/users', [Admin\UserController::class, 'index'])->name('users');
        Route::put('/users/{user}', [Admin\UserController::class, 'update'])->name('users.update');
    });

    Route::middleware('perm:admin.clinics')->group(function () {
        Route::get('/clinics', [Admin\ClinicController::class, 'index'])->name('clinics');
        Route::put('/clinics/{clinic}', [Admin\ClinicController::class, 'update'])->name('clinics.update');
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

    Route::middleware('perm:admin.integrations')->prefix('integrations')->name('integrations.')->group(function () {
        Route::get('/', [Admin\IntegrationController::class, 'index'])->name('index');
        Route::put('/{group}', [Admin\IntegrationController::class, 'update'])->name('update');
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
