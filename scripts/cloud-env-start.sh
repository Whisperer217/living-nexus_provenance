#!/usr/bin/env bash
set -euo pipefail

# Per-boot MariaDB for Cloud Agent pods (idempotent).
if ! command -v mariadbd >/dev/null 2>&1; then
  echo "[cloud-env-start] mariadbd not installed; skipping DB start"
  exit 0
fi

sudo mkdir -p /run/mysqld
sudo chown -R mysql:mysql /run/mysqld /var/lib/mysql 2>/dev/null || true

if ! mysqladmin ping -h127.0.0.1 --silent 2>/dev/null; then
  sudo mariadbd --user=mysql --datadir=/var/lib/mysql --bind-address=127.0.0.1 &
  for _ in $(seq 1 30); do
    if mysqladmin ping -h127.0.0.1 --silent 2>/dev/null; then
      break
    fi
    sleep 1
  done
fi

mysqladmin ping -h127.0.0.1 --silent

# Ensure local app database/user exist (dev-only credentials; never production).
sudo mysql -e "CREATE DATABASE IF NOT EXISTS living_nexus; CREATE USER IF NOT EXISTS 'ln'@'127.0.0.1' IDENTIFIED BY 'lnpass'; CREATE USER IF NOT EXISTS 'ln'@'localhost' IDENTIFIED BY 'lnpass'; GRANT ALL PRIVILEGES ON living_nexus.* TO 'ln'@'127.0.0.1'; GRANT ALL PRIVILEGES ON living_nexus.* TO 'ln'@'localhost'; FLUSH PRIVILEGES;" 2>/dev/null || true

if [[ ! -f .env ]]; then
  cat > .env <<'ENV'
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://ln:lnpass@127.0.0.1:3306/living_nexus
JWT_SECRET=dev-local-jwt-secret-change-me
MCP_READ_TOKEN=dev-local-mcp-read-token
VITE_APP_ID=dev-app-id
VITE_OAUTH_PORTAL_URL=https://oauth.example.com
ENV
fi

echo "[cloud-env-start] MariaDB ready"
