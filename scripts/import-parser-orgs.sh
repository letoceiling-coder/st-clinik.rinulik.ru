#!/usr/bin/env bash
# Импорт организаций parser.rinulik.ru на сервере (Docker).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/st-clinik}"
CONTAINER="${APP_CONTAINER:-st-clinik-app}"

cd "$APP_DIR"

docker exec "$CONTAINER" php artisan migrate --force --no-interaction
docker exec "$CONTAINER" php artisan db:seed --class=FoundationSeeder --force --no-interaction

if [ -f "${APP_DIR}/storage/app/parser-orgs-raw.json" ]; then
    docker cp "${APP_DIR}/storage/app/parser-orgs-raw.json" "${CONTAINER}:/var/www/html/storage/app/parser-orgs-raw.json"
    docker exec "$CONTAINER" php artisan parser:sync-organizations --import --photos --publish
else
    docker exec "$CONTAINER" php artisan parser:sync-organizations --fetch --import --photos --publish
fi

docker exec "$CONTAINER" php artisan cache:clear
echo "Import finished."
