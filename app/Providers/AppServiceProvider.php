<?php

namespace App\Providers;

use App\Models\Clinic;
use App\Models\Doctor;
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
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

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
    }

    public function boot(): void
    {
        if (Schema::hasTable('integration_settings')) {
            app(IntegrationSettings::class)->applyToConfig();
        }

        $appUrl = (string) config('app.url');
        if ($appUrl !== '') {
            URL::forceRootUrl($appUrl);
            if (str_starts_with($appUrl, 'https://')) {
                URL::forceScheme('https');
            }
        }

        Route::pattern('city', '(?!account|admin|admin-demo|clinic-cabinet|clinic-cabinet-demo|api|login|register|storage|build)[a-z0-9\-]+');
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
        RateLimiter::for('reviews', fn (Request $r) => Limit::perHour(5)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('auth', fn (Request $r) => Limit::perMinute(8)->by($r->ip()));
        RateLimiter::for('api', fn (Request $r) => Limit::perMinute(90)->by($r->ip()));
    }
}
