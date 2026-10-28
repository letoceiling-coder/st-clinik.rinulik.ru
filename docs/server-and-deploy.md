# МирКлиник — сервер, окружение и деплой

Документ для разработчиков и смежных проектов: где крутится приложение, как к нему подключиться и как выкатывать изменения.

## Кратко

| Параметр | Значение |
|----------|----------|
| Публичный сайт | **https://st-clinik.rinulik.ru** |
| Сервер (SSH) | `root@93.189.229.117` |
| Каталог на сервере | `/opt/st-clinik` |
| Стек | Laravel (PHP 8.3) + Inertia/React, Vite, SSR |
| Прод: оркестрация | Docker Compose (`deploy/docker-compose.yml`) |
| БД на проде | PostgreSQL 17 + pgvector (контейнер `st-clinik-postgres`, том `st-clinik-pgdata`) |
| Кэш и очереди | Redis 7 (контейнер `st-clinik-redis`), воркер `st-clinik-queue`, планировщик `st-clinik-scheduler` |
| Репозиторий | `git@github.com:letoceiling-coder/st-clinik.rinulik.ru.git` (ветка по умолчанию `master`) |

Смежный сервис импорта клиник: **https://parser.rinulik.ru** (ключ и URL в `.env`: `PARSER_AI_KEY`, `PARSER_AI_BASE_URL`).

---

## Архитектура на сервере

```
Интернет → nginx на хосте (st-clinik.rinulik.ru, TLS)
              → proxy_pass http://172.17.0.1:18744
                    → контейнер st-clinik-web (nginx)
                          → PHP-FPM контейнер st-clinik-app
```

- **Отдельный vhost** для `st-clinik.rinulik.ru` — не смешивать с блоками основного `rinulik.ru`. Пример конфига: `deploy/nginx/st-clinik.rinulik.conf` (прокси на порт **18744**).
- Compose-проект **`st-clinik`**, сеть `st-clinik_net`.
- Контейнеры:
  - **`st-clinik-app`** — PHP 8.3-FPM, код Laravel, artisan.
  - **`st-clinik-web`** — nginx, отдаёт статику из тома и проксирует PHP в `app`.
  - **`st-clinik-postgres`** — PostgreSQL 17 (pgvector), наружу не публикуется.
  - **`st-clinik-redis`** — Redis 7 (кэш, очереди), наружу не публикуется.
  - **`st-clinik-queue`** — `php artisan queue:work`; перезапускается деплоем через `queue:restart`.
  - **`st-clinik-scheduler`** — `php artisan schedule:work` (ежедневно в 03:30 `db:backup`).
- Порты compose: `127.0.0.1:18744:80` и `172.17.0.1:18744:80` (доступ с хоста для внешнего nginx).

### Docker-тома (данные переживают пересборку)

| Том | Назначение |
|-----|------------|
| `st-clinik-storage` | `storage/` (загрузки, логи, кэш файлов) |
| `st-clinik-pgdata` | Данные PostgreSQL |
| `st-clinik-redis` | Данные Redis (AOF) |
| `st-clinik-sqlite` | Старая SQLite-база (источник переноса, хранится для отката) |
| `st-clinik-public` | Собранные Vite-ассеты и корень `public/` для nginx |

Резервные копии БД: `storage/app/backups/db-*.sql.gz` в томе `st-clinik-storage` (последние 14). Ручной запуск: `docker exec -u www-data st-clinik-app php artisan db:backup`. Копии перед переходом на PostgreSQL: `/opt/st-clinik/backups/`.

Файл **`.env` на сервере** лежит в `/opt/st-clinik/.env`, монтируется в контейнер read-only. Секреты в git не коммитить.

---

## Локальная разработка

Требования: PHP 8.3, Composer, Node.js (в Docker-образе — Node 22), SQLite (по умолчанию в `.env.example`).

```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
npm install
composer run dev   # Laravel + Vite (+ SSR в dev через @inertiajs/vite)
```

Сборка фронта:

```bash
npm run build      # client + SSR (bootstrap/ssr)
```

Тесты:

```bash
php artisan test --compact
vendor/bin/pint --dirty
```

Полезные правила агента/деплоя в репозитории: `.cursor/rules/deploy-after-changes.mdc`, `AGENTS.md`, `CLAUDE.md`.

---

## Деплой на production

Основной скрипт на сервере: **`/opt/st-clinik/scripts/deploy-production.sh`**.

Что делает скрипт (упрощённо):

1. При наличии git — `fetch` + `reset --hard origin/master` (если не задан `SKIP_GIT_PULL=1`).
2. `npm ci` и `npm run build`.
3. Копирует `public/build` и часть статики в том **`st-clinik-public`**.
4. `docker compose -f deploy/docker-compose.yml build app` и `up -d app web`.
5. `docker cp` актуальных `app/`, `routes/`, `config/` (выборочно), миграций, `resources/js|css` в **`st-clinik-app`**.
6. `php artisan migrate --force`, `specialties:seed-covers`, очистка/кэш конфига.
7. Печатает хеши главных ассетов из `manifest.json`.

Переменные окружения скрипта:

| Переменная | По умолчанию | Смысл |
|------------|--------------|--------|
| `APP_DIR` | `/opt/st-clinik` | Корень проекта на сервере |
| `SKIP_GIT_PULL` | `0` | `1` — не тянуть git (деплой из tarball) |
| `DEPLOY_BRANCH` | `master` | Ветка для pull |
| `APP_CONTAINER` | `st-clinik-app` | Имя контейнера PHP |
| `IMPORT_PARSER_ORGS` | `0` | `1` — тяжёлый импорт из parser (осторожно) |

### Вариант A — push в GitHub (CI)

Workflow **`.github/workflows/deploy.yml`**: при push в `master` / `main` SSH на сервер и запуск `scripts/deploy-production.sh`.

Секреты в GitHub Environment `production`:

- `DEPLOY_HOST` — IP сервера
- `DEPLOY_USER` — обычно `root`
- `DEPLOY_SSH_KEY` — приватный ключ

### Вариант B — деплой с рабочей машины (tar + scp)

Используется, когда на сервер нужно отдать изменения без merge в `master`:

```powershell
cd c:\Users\dsc-2\projects\st-clinik.rinulik.ru
npm run build

tar -czf $env:TEMP/st-clinik-deploy.tgz `
  app bootstrap/ssr database/migrations database/seeders `
  resources routes config scripts/deploy-production.sh deploy `
  package.json package-lock.json vite.config.ts public/build

scp $env:TEMP/st-clinik-deploy.tgz root@93.189.229.117:/tmp/st-clinik-deploy.tgz

ssh root@93.189.229.117 "cd /opt/st-clinik && tar -xzf /tmp/st-clinik-deploy.tgz && SKIP_GIT_PULL=1 bash scripts/deploy-production.sh"
```

На Linux/macOS замените путь к архиву на `/tmp/st-clinik-deploy.tgz`.

### Первичная настройка сервера (один раз)

Из комментариев в `deploy-production.sh`:

```bash
git clone git@github.com:letoceiling-coder/st-clinik.rinulik.ru.git /opt/st-clinik
cp /path/to/.env /opt/st-clinik/.env
cd /opt/st-clinik && docker compose -f deploy/docker-compose.yml up -d --build
bash scripts/deploy-production.sh
```

Если каталог уже был без git: `scripts/bootstrap-server-git.sh`.

---

## Работа на сервере после деплоя

Artisan только **внутри контейнера**:

```bash
docker exec -it st-clinik-app php artisan route:list
docker exec -it st-clinik-app php artisan tinker
docker logs -f st-clinik-app
docker logs -f st-clinik-web
```

Импорт организаций parser (отдельный сценарий): `scripts/import-parser-orgs.sh`.

---

## Важные URL приложения

| Раздел | Путь |
|--------|------|
| Главная / каталог | `/`, `/{city}/catalog` |
| Админка | `/admin` |
| ЛК клиники | `/clinic-cabinet` |
| Личный кабинет пользователя | `/account` |

Демо-логины и пароли сидов — в `.env.example` (`DEMO_*`, `SEED_PASSWORD_*`), на проде задавать свои значения.

---

## Что учесть другому проекту на том же сервере

1. **Не занимать порт 18744** и не переиспользовать имена томов `st-clinik-*` / контейнеров `st-clinik-app`, `st-clinik-web`.
2. **Отдельный server_name** и TLS-сертификат; прокси на свой локальный порт compose.
3. **Свой каталог** (например `/opt/other-project`), свой `.env`, свой `docker-compose.yml`.
4. Общий только хост **93.189.229.117** и, при необходимости, инфраструктура **rinulik.ru** / **parser.rinulik.ru** — по согласованию и отдельным ключам API.

---

## Обновление этого документа

При смене IP, домена, порта, ветки деплоя или схемы Docker — править этот файл и `scripts/deploy-production.sh` / `deploy/docker-compose.yml` синхронно.
