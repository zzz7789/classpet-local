#!/bin/sh
set -eu
export MYSQL_PWD="$MYSQL_PASSWORD"
exec mysql -u "$MYSQL_USER" "$MYSQL_DATABASE"
