# 像素伙伴｜本地教室版

**Vue 3 + ASP.NET Core 10 + MySQL 8.4 + Docker Compose**。

老师统一管理班级，学生不用注册、绑定码或登录。保留像素伙伴风格：录入名单自动分配宠物，课堂表现加分，作业打卡，购买补给，背包喂养，升级成长。

## 最快启动（Windows）

1. 安装并打开 **Docker Desktop**，使用 Linux containers。已经装好则跳过。
2. 把压缩包完整解压到一个本地文件夹，例如 `D:\ClassPet`。
3. 双击根目录的 **`start.bat`**。
4. 等待构建完成，会自动打开 **http://localhost:8080**。
5. 第一次使用点“创建老师账号”，然后创建班级、粘贴学生名单。

第一次启动需要联网下载 Docker 镜像、npm 和 NuGet 依赖，可能需要几分钟；以后运行不依赖 OpenAI、Cloudflare 或外部网站服务。启动脚本会在没有 `.env` 时自动生成随机数据库密码。**首次构建完成前请保持 Docker Desktop 运行。**

`stop.bat` 停止服务，**不会删除数据库**。`backup.bat` 将数据库备份到 `backups` 文件夹。

## 用命令启动

在项目根目录打开终端：

```sh
# 可以直接启动，使用默认的本地数据库参数
# 如需自己指定参数，请先把 .env.example 复制为 .env 并修改。
docker compose up -d --build --wait --wait-timeout 240
```

访问 **http://localhost:8080**。老师账号自行注册，没有默认的管理员用户名或密码。

Linux / macOS 也可以执行（会自动生成 `.env`）：

```sh
sh scripts/start.sh
```

常用命令：

```sh
docker compose ps                  # 查看状态
docker compose logs -f backend     # 看接口日志
docker compose logs --tail=100     # 看最近日志
docker compose down               # 停止，保留数据
docker compose up -d               # 再次启动
```

## 班级里的日常操作

- **班级宠物**：逐行粘贴学生名字，系统自动为每人分配伙伴和口粮；点卡片看宠物，点“+3 回答问题”直接奖励。
- **作业打卡**：新增作业，勾选完成的学生，点“确认完成”。每项作业每人只奖励一次。
- **排行榜**：切换积分榜、成长榜、打卡榜，查看前三位学生和全班排名；同分并列，支持查找学生及打开伙伴档案。积分榜累计奖励减去人工扣分，购买补给或装扮不影响排名，仅统计当前班级在册学生。
- **伙伴档案**：购买补给、背包使用、改名、更换伙伴；切换伙伴保留积分和经验。
- **伙伴种类**：除原有三只伙伴外，新增芽芽兔、月牙狐、冰团企鹅、星瞳猫头鹰、蘑菇熊、云朵猫。在学生的伙伴档案中展开“更换伙伴”，可直接看图选择；新录入名单会轮流分配九种伙伴。
- **批量加分**：选择学生后统一奖励；自定义奖励可填写负数用于纠正，不能扣成负余额。
- **积分记录**：查看和导出最近200条收支；在班级设置下载完整班级JSON快照。
- **班级设置**：修改班级名称、恢复移出学生、修改老师密码、再建班级。

课堂回答由教师直接记录，不会作为学生任务。每位学生每天最多获得5次课堂回答奖励，以北京时间划分日期。班级默认仅创建者可见，已加入本班的协作老师共享管理权限。

## 多位老师共同管理

在“班级设置 → 本班老师”中，班级创建者可填写已注册的老师用户名，添加协作老师；也可将协作老师移出本班。协作老师共同管理学生、作业、积分与伙伴，并可导出本班数据；只有创建者能添加或移除老师。移除后原会话立即失去本班权限。每班最多20位老师，原有单老师班级无需手工迁移。未加入本班的其他老师无法访问。

## 示例班级

本机示例班级为“示例班级 · 星光三班”，含30名虚构学生、两位老师、九种伙伴和两项作业。示例账号为 `zhanglinlin`（创建者）、`demo_teacher_2`（协作老师），账号密码在创建或修改时返回，不写入文档。

其他环境可执行 `python scripts/seed-demo.py --url http://127.0.0.1:8080` 创建示例。脚本只新增独立账号与班级，通过正常接口生成积分、库存和作业数据，不会覆盖现有账号。账号已存在时停止；需要另一套示例时传入新的 `--prefix`。请保存脚本输出的随机密码。

## 文件结构

```text
classpet-local/
├─ frontend/                Vue 3、Vite、像素素材、Nginx
├─ backend/                 ASP.NET Core Minimal API
├─ database/001-schema.sql   MySQL 初始化SQL
├─ docker-compose.yml       三服务编排与持久化卷
├─ .env.example             本地参数示例
├─ start.bat                Windows双击启动
├─ stop.bat                 停止但不删数据
├─ backup.bat               Windows数据库备份
├─ scripts/                 PowerShell / shell 辅助脚本
├─ tests/                   API验收与成长公式测试
└─ docs/                    开发、备份和验证说明
```

前端依赖已锁定在 `frontend/package-lock.json`；后端依赖已锁定在 `backend/packages.lock.json`。前端使用原生CSS，不从CDN加载脚本、字体或图片。

## 数据保存在哪里

- `mysql_data`：老师账号、班级、学生、积分账本、作业、背包、宠物数据。
- `auth_keys`：ASP.NET Core Cookie 加密密钥，重启后登录凭据可继续验证。
- 浏览器仅保存最近选中的班级ID，不把积分等业务记录存在浏览器。

**不要执行 `docker compose down -v`**：`-v` 会删除持久化卷和全部数据。正常停止只用 `docker compose down`。

这份项目创建的是独立的本地数据库，**不会自动复制线上站点的账号或班级数据，也不会修改线上站点**。线上旧密码哈希格式与本地 ASP.NET Core Identity 格式不同，未做账号自动迁移。

## 修改端口 / 让教室其他设备访问

编辑 `.env`：

```dotenv
APP_HOST=0.0.0.0
APP_PORT=8080
```

然后执行 `docker compose up -d`。其他设备访问 `http://这台电脑的局域网IP:8080`，例如 `http://192.168.1.20:8080`。电脑和设备须在同一局域网，必要时允许 Windows 防火墙访问此端口。

默认 `APP_HOST=127.0.0.1`，仅本机可访问。MySQL 和后端容器不直接映射公网端口。局域网使用时，Docker 所在电脑必须开机、服务保持运行。

## 常见问题

**Docker Desktop 已启动，但脚本提示找不到 Docker**：Windows 启动脚本会自动检查 Docker Desktop 的用户目录和系统目录安装位置，无需手动修改 PATH。

**localhost 打不开**：使用 `http://127.0.0.1:8080`（自定义端口时替换为实际端口）。Windows 启动脚本默认打开此地址。

**页面能打开，但接口返回 502**：前端 Nginx 配置使用 Docker DNS 动态解析后端地址，避免后端容器重建后仍连接旧 IP。更新此配置后执行 `docker compose up -d --build frontend`。检查接口时，未登录访问 `/api/state` 应返回 401，不能只用首页的 200 判断应用正常。

**8080端口占用**：将 `.env` 的 `APP_PORT` 改为 `8090`，再次 `docker compose up -d`，访问 `http://localhost:8090`。

**MySQL首次启动较慢**：Compose会等待数据库和接口健康，不需要反复点击启动。用 `docker compose logs -f mysql` 查看进度。

**镜像或依赖下载失败**：首次构建仍需能访问 Docker 镜像仓库、npm 和 NuGet。先确认 Docker Desktop 网络和代理设置，再重试构建。本包不附带数百MB的离线Docker镜像。

**改了数据库密码后连不上**：已有数据卷中的MySQL密码不会随 `.env` 自动更改；保留原 `.env`，或先在MySQL中修改用户密码，再同步修改 `.env`。不要为解决密码问题删除数据卷。

**忘记老师密码**：没有邮件找回功能，请保存自己的用户名密码；维护操作前先备份数据库。

## 开发和验证

见 `docs/DEVELOPMENT.md`、`docs/BACKUP.md`、`docs/VALIDATION.md`。

## 服务器部署

Linux x86_64 Docker部署（网页21117、MySQL21119）见 docs/SERVER.md。使用独立.env.server与classpet-server项目，本地.env配置保持不变。
