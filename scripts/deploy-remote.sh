#!/usr/bin/env sh
# 本机一键部署到云服务器：上传离线包 -> 校验 -> 解压 -> 启动。
# 用法：sh scripts/deploy-remote.sh root@1.2.3.4 [ssh端口]
set -eu

target=${1:?用法: sh scripts/deploy-remote.sh root@服务器IP [ssh端口]}
port=${2:-22}

cd "$(dirname "$0")/.."
pkg=release/classpet-server-clean-linux-amd64.tar.gz
[ -f "$pkg" ] || { echo "缺少 $pkg，请先运行 python .build/pack-server-clean.py" >&2; exit 1; }
[ -f "$pkg.sha256" ] || { echo "缺少 $pkg.sha256" >&2; exit 1; }

name=$(basename "$pkg")
sum=$(awk '{print $1}' "$pkg.sha256")

echo "== 1/3 上传 $name ($(du -h "$pkg" | cut -f1)) 到 $target:/root/"
scp -P "$port" "$pkg" "$target:/root/"

echo "== 2/3 远程校验并解压"
ssh -p "$port" "$target" "set -eu
cd /root
echo '$sum  $name' | sha256sum -c -
rm -rf classpet-server-clean
tar -xzf '$name'
cd classpet-server-clean
sha256sum -c SHA256SUMS > /dev/null
echo '解压完成'"

echo "== 3/3 远程启动"
ssh -p "$port" "$target" "set -eu
cd /root/classpet-server-clean
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo '服务器未安装 Docker 或 Compose 插件，请先执行：'
  echo '  cd /root/classpet-server-clean && sh scripts/install-docker.sh'
  exit 1
fi
if [ ! -f .env.server ]; then
  echo '注意：首次启动将生成 .env.server（含随机数据库密码），请及时备份。'
fi
sh scripts/start-server.sh
sh scripts/server.sh ps"

echo
echo "部署完成。记得在云安全组放行 TCP 21117，然后访问 http://<服务器IP>:21117"
