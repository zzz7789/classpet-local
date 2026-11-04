#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups
file="backups/classpet-$(date +%Y%m%d-%H%M%S).sql"
umask 077
docker compose exec -T mysql sh /usr/local/bin/classpet-backup > "$file"
echo "Saved: $file"
