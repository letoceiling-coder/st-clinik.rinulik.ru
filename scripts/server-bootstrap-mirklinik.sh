#!/usr/bin/env bash
# One-time: mirklinik.ru on fresh Ubuntu (Docker + nginx + st-clinik).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/st-clinik}"
REPO_URL="${REPO_URL:-https://github.com/letoceiling-coder/st-clinik.rinulik.ru.git}"
BRANCH="${BRANCH:-master}"

DB_PASS="${DB_PASSWORD:-$(openssl rand -base64 24)}"

mkdir -p "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

chmod +x "$APP_DIR/scripts/deploy-production.sh"

install -d -m 755 /var/www/certbot

if [ ! -f /etc/ssl/private/mirklinik.self.key ]; then
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/ssl/private/mirklinik.self.key \
        -out /etc/ssl/certs/mirklinik.self.crt \
        -subj "/CN=mirklinik.ru"
    chmod 640 /etc/ssl/private/mirklinik.self.key
fi

cat > /etc/nginx/sites-available/mirklinik.ru << 'NGX'
server {
    listen 80;
    server_name mirklinik.ru www.mirklinik.ru;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}
server {
    listen 443 ssl http2;
    server_name mirklinik.ru www.mirklinik.ru;
    ssl_certificate /etc/ssl/certs/mirklinik.self.crt;
    ssl_certificate_key /etc/ssl/private/mirklinik.self.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    client_max_body_size 12m;
    access_log /var/log/nginx/mirklinik.ru.access.log;
    error_log  /var/log/nginx/mirklinik.ru.error.log;
    location ^~ /max {
        proxy_hide_header X-Frame-Options;
        proxy_pass http://172.17.0.1:18744;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 60s;
    }
    location / {
        add_header X-Frame-Options SAMEORIGIN always;
        proxy_pass http://172.17.0.1:18744;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 60s;
    }
}
NGX

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/mirklinik.ru /etc/nginx/sites-enabled/mirklinik.ru
nginx -t
systemctl reload nginx

if [ ! -f "$APP_DIR/.env" ]; then
    APP_KEY_VALUE="base64:$(openssl rand -base64 32 | tr -d '\n')"
    cat > "$APP_DIR/.env" << ENVFILE
APP_NAME="МирКлиник"
APP_ENV=production
APP_DEBUG=false
APP_KEY=${APP_KEY_VALUE}
APP_URL=https://mirklinik.ru
APP_TIMEZONE=Europe/Moscow
SEO_NOINDEX=false
APP_DEMO_ROUTES=false
SEED_DEMO=false

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=st_clinik
DB_USERNAME=st_clinik
DB_PASSWORD=${DB_PASS}

SESSION_DRIVER=database
SESSION_LIFETIME=120
QUEUE_CONNECTION=redis
CACHE_STORE=redis
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local

REDIS_CLIENT=phpredis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=log
MAIL_FROM_ADDRESS="hello@mirklinik.ru"
MAIL_FROM_NAME="МирКлиник"

LOG_CHANNEL=stack
LOG_LEVEL=error
ENVFILE
    chmod 600 "$APP_DIR/.env"
    echo "Created $APP_DIR/.env with generated DB_PASSWORD."
else
    echo "Keep existing $APP_DIR/.env"
fi

cd "$APP_DIR"
export SKIP_GIT_PULL=1
bash scripts/deploy-production.sh

echo "Bootstrap done. If DB was new, password is in /opt/st-clinik/.env (DB_PASSWORD)."
