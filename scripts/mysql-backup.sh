#!/bin/sh
set -eu
export MYSQL_PWD="$MYSQL_PASSWORD"
exec mysqldump -u "$MYSQL_USER" --single-transaction --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE"
