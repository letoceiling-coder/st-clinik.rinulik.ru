# МирКлиник — сервер, окружение и деплой

Документ для разработчиков и смежных проектов: где крутится приложение, как к нему подключиться и как выкатывать изменения.

## Кратко

| Параметр | Значение |
|----------|----------|
| Публичный сайт | **https://mirklinik.ru** (прежний стенд: st-clinik.rinulik.ru) |
| Сервер (SSH) | `root@94.154.11.18`, **порт 2222** (`ssh -p 2222 root@94.154.11.18`; порт 22 закрыт) |
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
  - **`st-clinik-ssr`** — Node, серверный рендер Inertia (`bootstrap/ssr/app.js`, порт 13714 внутри сети compose); приложение ходит к нему по `INERTIA_SSR_URL=http://ssr:13714`. Если контейнер недоступен, страницы отдаются без SSR (клиентский рендер) — проверка в конце `deploy-production.sh` ищет `<h1>` в HTML главной.
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

## Резервные копии и восстановление

Копии делает планировщик: `php artisan db:backup` ежедневно в 03:30 (`pg_dump | gzip` → `storage/app/backups/db-YYYYMMDD-HHMMSS.sql.gz`, хранится 14 последних). Если в центре интеграций настроено S3-хранилище, копия дополнительно уходит во внешний бакет.

### Восстановление БД (пошагово)

1. Найти копию: `docker exec st-clinik-app ls -lh storage/app/backups` (или скачать из S3).
2. Остановить запись: `docker stop st-clinik-queue st-clinik-scheduler` и включить режим обслуживания `docker exec st-clinik-app php artisan down`.
3. Сделать страховочную копию текущей БД: `docker exec st-clinik-app php artisan db:backup`.
4. Пересоздать пустую БД и залить дамп (подставьте файл и реквизиты из `.env`):

```bash
docker exec st-clinik-postgres psql -U st_clinik -d postgres -c "DROP DATABASE st_clinik;" -c "CREATE DATABASE st_clinik OWNER st_clinik;"
docker exec st-clinik-app sh -c 'gunzip -c storage/app/backups/db-ФАЙЛ.sql.gz' | docker exec -i st-clinik-postgres psql -U st_clinik -d st_clinik
```

5. Проверить расширения `vector`, `btree_gist`, `pg_trgm` (`\dx`); при отсутствии — `php artisan migrate --force` создаст их.
6. Поднять сервисы: `docker exec st-clinik-app php artisan up && docker start st-clinik-queue st-clinik-scheduler`, затем `php artisan cache:clear`.
7. Смоук-тест: главная, каталог города, клиника, вход, кабинет клиники, админка.

Файлы пользователей лежат в томе `st-clinik-storage` (`storage/app/public`) и в дамп БД не входят — копируйте том отдельно (`docker run --rm -v st-clinik-storage:/s -v $PWD:/b alpine tar czf /b/storage.tgz -C /s .`).

**Проверка восстановления — раз в месяц** на staging или временном контейнере: развернуть последнюю копию и выполнить пункт 7.

---

## Нагрузочный тест

`tests/load/catalog.js` (k6): главная, каталог, врачи, подсказки поиска, слоты записи.

```bash
k6 run -e BASE_URL=https://staging.example.ru -e CITY=moskva -e CLINIC=slug-kliniki tests/load/catalog.js
```

Пороги: ошибки < 1 %, p95 страницы < 1,5 с, p95 подсказок < 400 мс. Запускать на staging, а не на проде.

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
