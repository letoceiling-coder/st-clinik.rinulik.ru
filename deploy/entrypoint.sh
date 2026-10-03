#!/bin/sh
set -eu

cd /var/www/html

if [ ! -f .env ]; then
    echo "Missing .env" >&2
    exit 1
fi

if ! grep -q '^APP_KEY=base64:' .env; then
    php artisan key:generate --force
fi

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs storage/app/public database
if [ ! -f database/database.sqlite ]; then
    touch database/database.sqlite
fi
chown -R www-data:www-data storage bootstrap/cache database

if [ -d /var/www/html/public-export ]; then
    cp -a /var/www/html/public/. /var/www/html/public-export/
fi

php artisan package:discover --ansi >/dev/null 2>&1 || true
php artisan migrate --force
if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
    if [ ! -f storage/app/.seeded ]; then
        php artisan db:seed --force
        touch storage/app/.seeded
    fi
fi

php artisan storage:link --force >/dev/null 2>&1 || true
php artisan config:cache
php artisan route:cache
php artisan view:cache

exec docker-php-entrypoint "$@"
