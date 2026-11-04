# 备份与恢复

## 界面导出

“班级设置 → 备份班级数据”会下载该老师有权访问的完整班级JSON快照。它适合查看、归档或进一步数据转换。

**JSON快照不包含老师密码或登录加密密钥，也没有网页一键还原功能。**要完整迁移本地项目数据，请使用下面的MySQL备份。

## 完整数据库备份

Windows双击根目录`backup.bat`。或者：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backup.ps1
```

Linux / macOS：

```sh
sh scripts/backup.sh
```

生成文件如`backups/classpet-20261019-140000.sql`。备份包含老师账号密码摘要、班级、积分、作业、背包和会话。脚本不会把数据库密码输出到终端，也不会把密码写入备份文件。

## 恢复SQL备份

恢复会覆盖备份中同名的表，先备份当前数据并暂停其他老师操作。

Windows：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/restore.ps1 -File backups/classpet-20261019-140000.sql
```

按提示输入`RESTORE`确认。

Linux / macOS：

```sh
sh scripts/restore.sh backups/classpet-20261019-140000.sql
```

还原后建议重启后端：`docker compose restart backend`。迁到另一台机器时，重新登录老师账号即可；原Cookie可能因加密密钥不同而失效，不影响恢复的班级数据。

若要完整保留已经登录的Cookie，还需妥善备份`auth_keys`命名卷。通常不需要迁移它，重新登录即可。

## 不会自动迁移云端站点数据

此本地工程与原Cloudflare站点是独立的数据环境。云端导出的JSON格式、原账号密码摘要与MySQL备份不同，不能直接当作SQL导入。包内没有用户真实数据或线上密码。
