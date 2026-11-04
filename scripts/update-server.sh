#!/usr/bin/env sh
# Run from the extracted offline update bundle, passing the existing deployment.
set -eu
bundle=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target=${1:?Usage: sh update.sh /absolute/path/to/existing/deployment}
target=$(CDPATH= cd -- "$target" && pwd)
for file in .env.server docker-compose.yml docker-compose.server.yml scripts/server.sh scripts/backup-server.sh; do
  [ -f "$target/$file" ] || { echo "Missing deployment file: $file" >&2; exit 1; }
done
command -v docker >/dev/null
command -v sha256sum >/dev/null
(cd "$bundle" && sha256sum -c SHA256SUMS)
for service in backend frontend mysql; do
  [ -n "$(sh "$target/scripts/server.sh" ps -q "$service")" ] || {
    echo "Existing $service container is not running. Check the deployment path and service status." >&2; exit 1;
  }
done
# Backup must finish successfully before importing images or recreating containers.
sh "$target/scripts/backup-server.sh"
stamp=$(date +%Y%m%d-%H%M%S)
umask 077
rollback="$target/backups/rollback-images-$stamp.txt"
: > "$rollback"
for service in backend frontend; do
  container=$(sh "$target/scripts/server.sh" ps -q "$service")
  image=$(docker inspect --format '{{.Image}}' "$container")
  tag="classpet-rollback-$service:$stamp"
  docker image tag "$image" "$tag"
  printf '%s %s\n' "$service" "$tag" >> "$rollback"
done
docker load -i "$bundle/images.tar"
sh "$target/scripts/server.sh" up -d --no-build --no-deps --pull never --wait --wait-timeout 180 backend frontend
echo 'Updated backend and frontend. Existing database, settings and volumes retained.'
echo "Previous image tags: $rollback"
sh "$target/scripts/server.sh" ps
