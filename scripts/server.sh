#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
exec docker compose --env-file .env.server -p classpet-server -f docker-compose.yml -f docker-compose.server.yml "$@"
