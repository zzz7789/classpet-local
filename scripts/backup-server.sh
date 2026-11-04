#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
file="backups/classpet-server-$(date +%Y%m%d-%H%M%S).sql"
if sh scripts/server.sh exec -T mysql sh /usr/local/bin/classpet-backup > "$file"; then
  echo "Saved: $file"
else
  rm -f "$file"
  echo 'Backup failed.' >&2
  exit 1
fi
