#!/usr/bin/env bash
# Run on server as root. Writes APP_KEY into /opt/st-clinik/.env if missing/empty.
set -euo pipefail
ENV_FILE="${ENV_FILE:-/opt/st-clinik/.env}"
KEY="base64:$(openssl rand -base64 32 | tr -d '\n')"
if grep -q '^APP_KEY=base64:' "$ENV_FILE" 2>/dev/null; then
    echo "APP_KEY already set in $ENV_FILE"
    exit 0
fi
sed -i "s|^APP_KEY=.*|APP_KEY=${KEY}|" "$ENV_FILE"
echo "APP_KEY written to $ENV_FILE"
