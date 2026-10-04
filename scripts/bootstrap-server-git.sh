#!/usr/bin/env bash
# One-time: turn /opt/st-clinik into a git checkout (keeps .env and docker volumes).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/st-clinik}"
REPO="${REPO:-git@github.com:letoceiling-coder/st-clinik.rinulik.ru.git}"
BRANCH="${DEPLOY_BRANCH:-master}"

if [ ! -f "${APP_DIR}/.env" ]; then
    echo "Missing ${APP_DIR}/.env — create it before bootstrap." >&2
    exit 1
fi

cp "${APP_DIR}/.env" /tmp/st-clinik.env.backup

if [ -d "${APP_DIR}/.git" ]; then
    echo "Already a git repository."
else
    rm -rf "${APP_DIR}.bak"
    mv "${APP_DIR}" "${APP_DIR}.bak"
    git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
    cp /tmp/st-clinik.env.backup "${APP_DIR}/.env"
    chmod 600 "${APP_DIR}/.env"
fi

cd "$APP_DIR"
git remote set-url origin "$REPO"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
chmod +x scripts/deploy-production.sh

echo "Git checkout ready at ${APP_DIR}. Run scripts/deploy-production.sh to deploy."
