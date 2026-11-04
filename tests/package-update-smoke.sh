#!/bin/sh
# Isolated command mocks: no Docker socket or classroom database is accessed.
set -eu
root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT
mkdir -p "$root/bundle" "$root/deploy/scripts" "$root/bin"
cp /bundle/update.sh "$root/bundle/update.sh"
printf 'fixture' > "$root/bundle/images.tar"
(cd "$root/bundle" && sha256sum images.tar update.sh > SHA256SUMS)
touch "$root/deploy/.env.server" "$root/deploy/docker-compose.yml" "$root/deploy/docker-compose.server.yml"
export TEST_LOG="$root/log" TEST_DEPLOY="$root/deploy"
cat > "$root/deploy/scripts/server.sh" <<'SH'
#!/bin/sh
case "$1" in
 ps) if [ "${2:-}" = '-q' ]; then printf 'fixture-container\n'; fi ;;
 up) printf 'up %s\n' "$*" >> "$TEST_LOG" ;;
 *) exit 1 ;;
esac
SH
cat > "$root/deploy/scripts/backup-server.sh" <<'SH'
#!/bin/sh
printf 'backup\n' >> "$TEST_LOG"
[ "${FAIL_BACKUP:-0}" = 0 ] || exit 1
mkdir -p "$TEST_DEPLOY/backups"
printf 'fixture backup' > "$TEST_DEPLOY/backups/fixture.sql"
SH
cat > "$root/bin/docker" <<'SH'
#!/bin/sh
printf '%s\n' "$*" >> "$TEST_LOG"
if [ "$1" = inspect ]; then printf 'sha256:fixture-image\n'; fi
SH
chmod +x "$root/bin/docker"
export PATH="$root/bin:$PATH"
sh "$root/bundle/update.sh" "$root/deploy" >/dev/null
[ "$(head -1 "$TEST_LOG")" = backup ]
grep -q '^load -i ' "$TEST_LOG"
grep -q '^up up -d --no-build --no-deps --pull never --wait --wait-timeout 180 backend frontend$' "$TEST_LOG"
[ "$(find "$TEST_DEPLOY/backups" -name 'rollback-images-*.txt' | wc -l)" -eq 1 ]
: > "$TEST_LOG"
if FAIL_BACKUP=1 sh "$root/bundle/update.sh" "$root/deploy" >/dev/null 2>&1; then
  echo 'FAIL: backup failure was ignored'; exit 1
fi
[ "$(cat "$TEST_LOG")" = backup ]
echo 'PASS: backup before image load; only frontend/backend recreated; rollback tags retained; backup failure stops upgrade.'
