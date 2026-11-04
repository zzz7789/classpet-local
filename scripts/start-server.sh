#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
command -v docker >/dev/null 2>&1 || { echo 'Install Docker Engine and the Docker Compose plugin first.'; exit 1; }
docker info >/dev/null
if [ ! -f .env.server ]; then
  umask 077
  app_secret=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
  root_secret=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
  printf 'APP_HOST=0.0.0.0\nAPP_PORT=21117\nMYSQL_HOST=127.0.0.1\nMYSQL_PORT=21119\nMYSQL_PASSWORD=%s\nMYSQL_ROOT_PASSWORD=%s\n' "$app_secret" "$root_secret" > .env.server
fi
if grep -q '=replace_before_first_start' .env.server; then
  echo 'Set unique database passwords in .env.server before starting.'; exit 1
fi
if [ -f images.tar ]; then
  docker load -i images.tar
  docker compose --env-file .env.server -p classpet-server -f docker-compose.yml -f docker-compose.server.yml up -d --no-build --pull never --wait --wait-timeout 240
else
  docker compose --env-file .env.server -p classpet-server -f docker-compose.yml -f docker-compose.server.yml up -d --build --wait --wait-timeout 240
fi
port=$(sed -n 's/^APP_PORT=//p' .env.server | head -1)
echo "Ready: http://SERVER_IP:${port:-21117}"
echo 'Use .env.server and project classpet-server for subsequent management commands.'
