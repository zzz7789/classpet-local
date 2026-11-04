#!/usr/bin/env sh
# 在全新 Linux 服务器安装 Docker Engine + Compose v2 插件（需要联网）。
# 已安装则直接检查版本并退出。
set -eu

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "Docker 已安装：$(docker --version)"
  echo "Compose：$(docker compose version --short 2>/dev/null || docker compose version)"
  exit 0
fi

if [ "$(id -u)" -ne 0 ]; then
  echo '请用 root 或 sudo 运行：sudo sh scripts/install-docker.sh' >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo '缺少 curl，请先安装：apt-get install -y curl / dnf install -y curl' >&2
  exit 1
fi

echo '正在通过官方脚本安装 Docker Engine ...'
curl -fsSL https://get.docker.com | sh

if command -v systemctl >/dev/null 2>&1; then
  systemctl enable --now docker
fi

docker --version
docker compose version
docker info >/dev/null && echo 'Docker 就绪。'
