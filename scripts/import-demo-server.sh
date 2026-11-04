#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
[ -f demo-data.sql ] || { echo 'demo-data.sql is missing.'; exit 1; }
# Pause API writes while checking and importing; always restart it on exit.
sh scripts/server.sh stop backend
trap 'sh scripts/server.sh start backend >/dev/null' EXIT
# Only initialize an empty server, never replace an existing classroom or account.
count=$(sh scripts/server.sh exec -T mysql sh -c 'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql -u "$MYSQL_USER" --batch --skip-column-names "$MYSQL_DATABASE" -e "SELECT COUNT(*) FROM teachers;"')
[ "$count" = '0' ] || { echo 'Import refused: accounts already exist. Existing data is unchanged.'; exit 1; }
sh scripts/server.sh exec -T mysql sh /usr/local/bin/classpet-restore < demo-data.sql
echo 'Demo imported. Teacher account: zhanglinlin; password supplied with this package.'
