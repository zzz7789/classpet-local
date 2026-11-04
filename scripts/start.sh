#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
command -v docker >/dev/null 2>&1 || { echo 'Install Docker and the Docker Compose plugin first.'; exit 1; }
docker info >/dev/null
if [ ! -f .env ]; then
  umask 077
  app_secret=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
  root_secret=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
  printf 'APP_HOST=127.0.0.1\nAPP_PORT=8080\nMYSQL_PASSWORD=%s\nMYSQL_ROOT_PASSWORD=%s\n' "$app_secret" "$root_secret" > .env
fi
docker compose up -d --build --wait --wait-timeout 240
port=$(sed -n 's/^APP_PORT=//p' .env | head -1)
echo "Ready: http://localhost:${port:-8080}"
