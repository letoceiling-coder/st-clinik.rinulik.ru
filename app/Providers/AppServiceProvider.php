<?php

namespace App\Providers;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Notifications\Channels\LoggedMailChannel;
use App\Notifications\Channels\MaxChannel;
use App\Notifications\Channels\WebPushChannel;
use App\Repositories\Contracts\CatalogRepository;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Contracts\DoctorRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Eloquent\EloquentCatalogRepository;
use App\Repositories\Eloquent\EloquentClinicRepository;
use App\Repositories\Eloquent\EloquentDoctorRepository;
use App\Repositories\Eloquent\EloquentReviewRepository;
use App\Services\IntegrationSettings;
use App\Services\Seo;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\ChannelManager;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use SocialiteProviders\Manager\SocialiteWasCalled;
use SocialiteProviders\Yandex\Provider as YandexProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Репозитории: подмена реализации (например, на внешний API) не затрагивает контроллеры.
        $this->app->bind(CatalogRepository::class, EloquentCatalogRepository::class);
        $this->app->bind(ClinicRepository::class, EloquentClinicRepository::class);
        $this->app->bind(DoctorRepository::class, EloquentDoctorRepository::class);
        $this->app->bind(ReviewRepository::class, EloquentReviewRepository::class);
        $this->app->singleton(Seo::class);

        // До boot всех провайдеров: пакетам (Sentry, почта, диски) нужны ключи из админки уже при их загрузке.
        $this->app->booting(function (): void {
            try {
                if (Schema::hasTable('integration_settings')) {
                    app(IntegrationSettings::class)->applyToConfig();
                }
            } catch (\Throwable) {
                // БД может быть недоступна при сборке образа или до миграций.
            }
        });
    }

    public function boot(): void
    {
        $appUrl = (string) config('app.url');
        if ($appUrl !== '') {
            URL::forceRootUrl($appUrl);
            if (str_starts_with($appUrl, 'https://')) {
                URL::forceScheme('https');
            }
        }

        Route::pattern('city', '(?!account|admin|admin-demo|clinic-cabinet|clinic-cabinet-demo|api|login|register|storage|build|forgot-password|password|email|auth|webhooks)[a-z0-9\-]+');

        $this->syncSocialiteConfig();

        Event::listen(function (SocialiteWasCalled $event): void {
            $event->extendSocialite('yandex', YandexProvider::class);
        });
        Route::bind('city', function (string $slug) {
            return app(CatalogRepository::class)->city($slug) ?? abort(404);
        });

        Route::bind('doctor', function (string $value) {
            $query = Doctor::query();

            return ctype_digit($value)
                ? $query->where('id', $value)->firstOrFail()
                : $query->where('slug', $value)->firstOrFail();
        });

        Route::bind('clinic', function (string $value) {
            $query = Clinic::query();

            return ctype_digit($value)
                ? $query->where('id', $value)->firstOrFail()
                : $query->where('slug', $value)->firstOrFail();
        });

        RateLimiter::for('leads', fn (Request $r) => [
            Limit::perMinute(3)->by($r->ip()),
            Limit::perHour(12)->by($r->ip()),
        ]);
        RateLimiter::for('booking', fn (Request $r) => [
            Limit::perMinute(5)->by($r->ip()),
            Limit::perHour(20)->by($r->ip()),
        ]);
        RateLimiter::for('slots', fn (Request $r) => Limit::perMinute(60)->by($r->ip()));
        RateLimiter::for('reviews', fn (Request $r) => Limit::perHour(5)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('auth', fn (Request $r) => Limit::perMinute(8)->by($r->ip()));
        RateLimiter::for('oauth-redirect', fn (Request $r) => Limit::perMinute(40)->by($r->ip()));
        RateLimiter::for('oauth-callback', fn (Request $r) => Limit::perMinute(40)->by($r->ip()));
        RateLimiter::for('password-reset', fn (Request $r) => Limit::perMinute(3)->by($r->ip()));
        RateLimiter::for('email-verification', fn (Request $r) => Limit::perMinute(6)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('max-login-status', fn (Request $r) => Limit::perMinute(90)->by($r->ip()));
        RateLimiter::for('api', fn (Request $r) => Limit::perMinute(90)->by($r->ip()));
        RateLimiter::for('promo-tracking', fn (Request $r) => Limit::perMinute(120)->by($r->ip()));
        RateLimiter::for('max-bot', fn () => Limit::perSecond(25));
        RateLimiter::for('assistant', fn (Request $r) => Limit::perMinute(30)->by($r->user()?->id ?: $r->ip()));

        Notification::resolved(function (ChannelManager $manager): void {
            $manager->extend('logged_mail', fn ($app) => $app->make(LoggedMailChannel::class));
            $manager->extend('max', fn ($app) => $app->make(MaxChannel::class));
            $manager->extend('webpush', fn ($app) => $app->make(WebPushChannel::class));
        });
    }

    private function syncSocialiteConfig(): void
    {
        $clientId = config('services.yandex_oauth.client_id');
        if (! filled($clientId)) {
            return;
        }

        $redirect = config('services.yandex_oauth.redirect_uri');

        config([
            'services.yandex' => [
                'client_id' => $clientId,
                'client_secret' => config('services.yandex_oauth.client_secret'),
                'redirect' => filled($redirect) ? $redirect : url('/auth/yandex/callback'),
            ],
        ]);
    }
}
