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

if [ -d .git ] && [ "${SKIP_GIT_PULL:-0}" != "1" ]; then
    if git fetch origin && git checkout "$BRANCH" && git pull --ff-only origin "$BRANCH"; then
        echo "Git pull OK."
    else
        echo "Warning: git pull failed — continuing with files already on disk." >&2
    fi
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
docker cp "${APP_DIR}/resources/views/." "${CONTAINER}:/var/www/html/resources/views/" 2>/dev/null || true
docker cp "${APP_DIR}/database/migrations/." "${CONTAINER}:/var/www/html/database/migrations/" 2>/dev/null || true
docker cp "${APP_DIR}/database/seeders/." "${CONTAINER}:/var/www/html/database/seeders/" 2>/dev/null || true
docker cp "${APP_DIR}/lang/." "${CONTAINER}:/var/www/html/lang/" 2>/dev/null || true
docker cp "${APP_DIR}/deploy/entrypoint.sh" "${CONTAINER}:/entrypoint.sh"

echo "==> Running migrations and clearing caches"
docker exec "$CONTAINER" php artisan migrate --force --no-interaction
docker exec "$CONTAINER" php artisan config:cache
docker exec "$CONTAINER" php artisan route:clear
docker exec "$CONTAINER" php artisan view:clear

echo "Deploy finished. Assets:"
grep -E 'app-.*\.(css|js)' "${APP_DIR}/public/build/manifest.json" | head -2 || true
