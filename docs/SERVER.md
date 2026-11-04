# Linux x86_64 Docker 部署

部署包包含 Linux amd64 的前端、后端、MySQL 镜像，及可选导入的示例数据。服务器需预装 Docker Engine 和支持 `--wait` 的 Docker Compose 插件。首次启动无需访问镜像仓库或构建依赖。

## 启动

上传并解压部署包后，在解压目录运行：

```sh
sh scripts/start-server.sh
sh scripts/import-demo-server.sh
sh scripts/server.sh ps
```

启动脚本自动生成独立 `.env.server`，数据库密码随机生成。请保留此文件；已有数据卷的密码不会随文件修改而自动改变。

示例数据只允许导入空账号库，包含一个班级、30名虚构学生、两个老师、伙伴与作业；现有服务器有账号时会拒绝导入，不覆盖已有数据。主账号为 `zhanglinlin`，密码为 `123456`；协作账号 `demo_teacher_2` 的密码沿用创建时返回的值。

访问 **http://服务器IP:21117**。服务器防火墙及云安全组需允许 TCP 21117。

## 端口与数据库

| 服务 | 宿主机地址 | 容器内部 |
| --- | --- | --- |
| 网页 | 0.0.0.0:21117 | frontend:80 |
| MySQL | 127.0.0.1:21119 | mysql:3306 |

后端始终连接 `mysql:3306`，21119用于服务器本机管理数据库。数据库绑定本机，不需要放行公网21119；远程管理可用 SSH 隧道：

```sh
ssh -L 21119:127.0.0.1:21119 用户名@服务器IP
```

然后连接本机127.0.0.1:21119，数据库/业务用户均为classpet，密码取服务器的.env.server。需要改变绑定地址时编辑MYSQL_HOST；端口由MYSQL_PORT控制。

## 管理与备份

所有命令在部署目录执行。服务器使用项目名classpet-server和.env.server，与本地classpet-local隔离。

```sh
sh scripts/server.sh logs --tail=100
sh scripts/backup-server.sh
sh scripts/server.sh stop
sh scripts/server.sh start
```

备份位于backups目录。保留.env.server及Docker的mysql_data、auth_keys卷。不要执行down -v或手工删除数据卷。

健康验证：

```sh
curl -f http://127.0.0.1:21117/healthz
curl -o /dev/null -s -w '%{http_code}\n' http://127.0.0.1:21117/api/state
```

前者返回成功，后者未登录应返回401。使用zhanglinlin登录后应看到示例班级和30名学生。

部署包内没有本机.env、数据库root密码、会话或其他班级数据。服务器尚未实际部署；本地隔离容器的验证结果见随包验证说明。
