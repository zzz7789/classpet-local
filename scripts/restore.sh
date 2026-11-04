#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
[ "$#" -eq 1 ] || { echo 'Usage: sh scripts/restore.sh backups/file.sql'; exit 1; }
[ -f "$1" ] || { echo 'Backup file not found.'; exit 1; }
echo 'This replaces existing tables. Back up current data first. Type RESTORE to continue:'
read -r answer
[ "$answer" = RESTORE ] || { echo 'Cancelled.'; exit 1; }
docker compose exec -T mysql sh /usr/local/bin/classpet-restore < "$1"
echo 'Restored. Run: docker compose restart backend'
