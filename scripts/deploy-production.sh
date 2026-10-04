#!/usr/bin/env bash
# Deploy st-clinik on production (run on the server as root).
# One-time setup:
#   git clone git@github.com:letoceiling-coder/st-clinik.rinulik.ru.git /opt/st-clinik
#   cp /path/to/.env /opt/st-clinik/.env
#   cd /opt/st-clinik && docker compose -f deploy/docker-compose.yml up -d --build
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/st-clinik}"
COMPOSE="docker compose -f ${APP_DIR}/deploy/docker-compose.yml"
BRANCH="${DEPLOY_BRANCH:-master}"
CONTAINER="${APP_CONTAINER:-st-clinik-app}"
PUBLIC_VOLUME="${PUBLIC_VOLUME:-st-clinik-public}"

cd "$APP_DIR"

if [ -f .env ] && [ ! -f .env.production.backup ]; then
    cp .env .env.production.backup
fi

if [ -d .git ] && [ "${SKIP_GIT_PULL:-0}" != "1" ]; then
    git fetch origin
    git checkout "$BRANCH"
    # Сбрасываем артефакты сборки на сервере, иначе pull может не пройти.
    git reset --hard "origin/${BRANCH}"
    git clean -fd -- bootstrap/ssr public/build 2>/dev/null || true
    echo "Git sync OK (${BRANCH} @ $(git rev-parse --short HEAD))."
else
    echo "Skipping git pull (no repo or SKIP_GIT_PULL=1)." >&2
fi

echo "==> Building frontend assets"
npm ci
npm run build

echo "==> Syncing Vite build to nginx volume"
docker run --rm \
    -v "${APP_DIR}/public/build:/src:ro" \
    -v "${PUBLIC_VOLUME}:/vol" \
    alpine sh -c '
        rm -rf /vol/build
        cp -a /src /vol/build
        find /vol/build -type d -exec chmod 755 {} +
        find /vol/build -type f -exec chmod 644 {} +
    '

echo "==> Syncing PWA and static public root files"
docker run --rm \
    -v "${APP_DIR}/public:/src:ro" \
    -v "${PUBLIC_VOLUME}:/vol" \
    alpine sh -c '
        for f in favicon.svg manifest.webmanifest sw.js robots.txt; do
            if [ -f "/src/${f}" ]; then
                cp "/src/${f}" "/vol/${f}"
            fi
        done
        if [ -d /src/icons ]; then
            mkdir -p /vol/icons
            cp -a /src/icons/. /vol/icons/
        fi
    '

echo "==> Linking public/storage for nginx"
docker run --rm \
    -v "${PUBLIC_VOLUME}:/vol" \
    alpine sh -c 'rm -f /vol/storage && ln -sfn ../storage/app/public /vol/storage'

if [ -d "${APP_DIR}/public/downloads" ]; then
    echo "==> Syncing public downloads to nginx volume"
    docker run --rm \
        -v "${APP_DIR}/public/downloads:/src:ro" \
        -v "${PUBLIC_VOLUME}:/vol" \
        alpine sh -c 'mkdir -p /vol/downloads && cp -a /src/. /vol/downloads/'
fi

echo "==> Rebuilding and restarting app container"
$COMPOSE build app
$COMPOSE up -d app web

echo "==> Syncing build manifest into running app container"
docker cp "${APP_DIR}/public/build/." "${CONTAINER}:/var/www/html/public/build/"

echo "==> Copying application code into container"
docker cp "${APP_DIR}/app/." "${CONTAINER}:/var/www/html/app/"
docker cp "${APP_DIR}/bootstrap/app.php" "${CONTAINER}:/var/www/html/bootstrap/app.php"
docker cp "${APP_DIR}/resources/js/." "${CONTAINER}:/var/www/html/resources/js/" 2>/dev/null || true
docker cp "${APP_DIR}/resources/css/." "${CONTAINER}:/var/www/html/resources/css/" 2>/dev/null || true
docker cp "${APP_DIR}/routes/." "${CONTAINER}:/var/www/html/routes/"
docker cp "${APP_DIR}/tz.md" "${CONTAINER}:/var/www/html/tz.md" 2>/dev/null || true
docker cp "${APP_DIR}/config/integrations.php" "${CONTAINER}:/var/www/html/config/integrations.php" 2>/dev/null || true
docker cp "${APP_DIR}/config/yookassa.php" "${CONTAINER}:/var/www/html/config/yookassa.php" 2>/dev/null || true
docker cp "${APP_DIR}/config/permissions.php" "${CONTAINER}:/var/www/html/config/permissions.php" 2>/dev/null || true
docker cp "${APP_DIR}/config/services.php" "${CONTAINER}:/var/www/html/config/services.php" 2>/dev/null || true
docker cp "${APP_DIR}/resources/views/." "${CONTAINER}:/var/www/html/resources/views/" 2>/dev/null || true
docker cp "${APP_DIR}/database/migrations/." "${CONTAINER}:/var/www/html/database/migrations/" 2>/dev/null || true
docker cp "${APP_DIR}/database/seeders/." "${CONTAINER}:/var/www/html/database/seeders/" 2>/dev/null || true
docker cp "${APP_DIR}/lang/." "${CONTAINER}:/var/www/html/lang/" 2>/dev/null || true
docker cp "${APP_DIR}/deploy/entrypoint.sh" "${CONTAINER}:/entrypoint.sh"
docker exec "$CONTAINER" chmod +x /entrypoint.sh

echo "==> Running migrations and clearing caches"
docker exec "$CONTAINER" php artisan migrate --force --no-interaction
docker exec "$CONTAINER" php artisan config:cache
docker exec "$CONTAINER" php artisan route:clear
docker exec "$CONTAINER" php artisan view:clear
docker exec "$CONTAINER" sh -c 'kill -USR2 1 2>/dev/null || true'

echo "Deploy finished. Assets:"
grep -E 'app-.*\.(css|js)' "${APP_DIR}/public/build/manifest.json" | head -2 || true
