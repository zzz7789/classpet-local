# 开发与接口

## 技术选型

- 前端：Vue 3 + Vite + JavaScript，使用Vue单文件组件，不包含React或Next.js运行时。
- 后端：ASP.NET Core 10 Minimal API，C#，Dapper + MySqlConnector。
- 数据库：MySQL 8.4 / InnoDB，utf8mb4。
- 登录：ASP.NET Core Cookie Authentication + Identity PasswordHasher，密码PBKDF2摘要，会话由MySQL校验。
- 部署：Nginx + ASP.NET Core + MySQL 三容器，Docker Compose v2。

## 不用Docker开发前后端

需 Node.js 22.12+、.NET SDK 10、MySQL 8.4。也可以只用Docker启动MySQL：

```sh
# 首次先复制 .env.example 为 .env；使用其中的数据库密码。
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mysql
```

本机开发MySQL端口默认3306，已占用可在`.env`增加`MYSQL_DEV_PORT=3307`，同时调整下方连接串。

PowerShell启动后端：

```powershell
$env:ConnectionStrings__Default = "Server=127.0.0.1;Port=3306;Database=classpet;User ID=classpet;Password=classpet_local_change_me;DateTimeKind=Utc;"
# 如果 .env 改过密码，请替换成 .env 中的实际MYSQL_PASSWORD。
dotnet run --project backend --urls http://localhost:5050
```

另一个终端启动Vue：

```sh
cd frontend
npm ci
npm run dev
```

访问 http://localhost:5173，Vite会把`/api`转发到5050端口，无需额外配置CORS。

如果不用Docker运行MySQL，先自行创建`classpet`数据库与具有该库权限的`classpet`用户。接口启动时会执行`backend/Database/schema.sql`中幂等的首版建表语句。

## 主要接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health/ready` | 检查后端和MySQL连接 |
| POST | `/api/account` | 注册、登录、退出、修改密码 |
| GET | `/api/state` | 当前老师及班级列表 |
| GET | `/api/state?classId=...` | 本班名单、作业、积分 |
| GET | `/api/state?classId=...&seatId=...` | 本班指定学生的伙伴和背包 |
| GET | `/api/state?classId=...&export=1` | 下载完整班级JSON快照 |
| POST | `/api/action` | 班级、学生、作业、积分、道具操作 |

账号操作：`register`、`login`、`logout`、`changePassword`。

业务操作：`createClass`、`renameClass`、`importStudents`、`renameStudent`、`toggleStudent`、`createTask`、`editTask`、`closeTask`、`completeTasks`、`award`、`buy`、`feed`、`interact`、`renamePet`、`changeSpecies`。

账号请求示例：

```json
{"action":"register","username":"王老师","password":"your-password-123"}
```

业务请求需要浏览器Cookie、同源`Origin`和`Idempotency-Key`请求头；用curl等工具测试时也要提供Origin，例如`http://localhost:8080`。

```json
{"action":"award","classId":"班级UUID","ids":["学生UUID"],"delta":3,"reason":"课堂回答","classroom":true}
```

`GET /api/state`成功响应结构为`{ data: {...业务数据}, user: {name}, account: {kind,username} }`。字段名与在线旧版略有调整，本包Vue页面已适配。

排行榜复用班级状态接口：`members[].points` 为完整账本的累计奖励减去人工扣分，汇总所有正向流水及 `reference_id` 以 `award:` 开头的扣分，购买补给、装扮的负向流水不计入。没有流水时为0，不受最近200条记录窗口限制。成长榜使用 `members[].xp`，打卡榜按 `completions` 中每位学生的不同作业计数，包括已关闭作业。前端仅展示在册学生，按指标降序，同分共享名次，后续名次按人数顺延（如1、1、3）；同分行按姓名、学生ID稳定排序，搜索在排名完成后进行。

## 数据一致性与权限

- 所有业务请求从Cookie读取老师ID，不接受客户端指定操作人。
- 所有班级查询和写入都校验`owner_id`。
- 一个业务操作使用一个MySQL事务；同班级写操作锁定同一班级行，避免并发超扣。
- 积分余额、流水、库存、经验一起提交；失败一起回滚。
- `(teacher_id,request_key)`唯一，请求正文摘要相同则重放之前的结果，不同则返回409。
- 作业完成记录的`(task_id,student_id)`唯一，多次点击不重复加分。
- 积分纠正新增流水，接口不提供删除/覆盖账本操作。
- 改密码会撤销旧会话；退出会撤销当前会话；Cookie加密密钥保存在持久化卷。
- 写接口检查Origin；账号操作按来源IP限流为每15分钟30次。

## 构建与测试

```sh
npm ci --prefix frontend
npm run build --prefix frontend
dotnet restore backend/ClassPet.Api.csproj --locked-mode
dotnet build backend/ClassPet.Api.csproj -c Release --no-restore
node tests/frontend.test.mjs
node tests/pet-personality.test.mjs
node tests/leaderboard.test.mjs
python tests/integration.py --url http://localhost:8080
python tests/leaderboard-api.py --url http://localhost:8080
python tests/shared-class.py --url http://localhost:8080
```

API测试会创建独立的`test_...`老师和测试班级，不会操作已有老师的班级。测试通过的主要链路包括登录、跨老师隔离、名单、加分、作业确认、道具购买/使用、并发、防重复与改密码退出。

## 数据库升级

`database/001-schema.sql`与`backend/Database/schema.sql`内容一致，只负责首版初始化。已经有数据时修改SQL不会自动改表；以后新增字段应另写顺序迁移SQL，先备份再执行，勿删除数据卷重建。
