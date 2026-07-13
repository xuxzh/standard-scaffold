# Hermes MES AI Chat Ubuntu 部署手册

本文描述 Ubuntu A 机上的单实例部署草案：Nginx 同源托管 Web 并代理 `/api`，NestJS API 与专用 Hermes Profile 分别由 systemd 守护，Hermes 通过 stdio 启动 `mes-data-mcp`，再连接 B 机 MSSQL。

> 当前阶段只允许单用户受控演示。完成文末“多用户开放硬门禁”前，禁止向内网多用户开放。

## 1. 账号、目录与网络边界

- 分别创建无登录 shell 的 `standard-scaffold` 与 `hermes-mes` 系统用户；不要使用 root 运行服务。
- 代码发布到 `/opt/standard-scaffold/releases/<release-id>`，`/opt/standard-scaffold/current` 只作为原子切换软链接。
- API 只监听 `127.0.0.1:3000`；Hermes API Server 只监听 `127.0.0.1:8650`；MCP 不监听端口。
- `/etc/standard-scaffold/api.env` 与 `/etc/standard-scaffold/hermes-mes.env` 权限必须为 `600`，并分别归属对应服务账号。
- B 机数据库账号必须是专用只读登录，只授予批准对象的 `SELECT` 与必要 `VIEW DEFINITION`；禁止 `sa`、`db_owner`、写入、DDL 与 `EXECUTE`。

## 2. 安装与发布

安装 Node.js、pnpm、Nginx、PostgreSQL 客户端和当前 Hermes 版本。以发布账号执行：

```bash
pnpm install --frozen-lockfile
pnpm --filter @repo/mes-data-mcp build
pnpm --filter @repo/api build
pnpm --filter @repo/web build
```

API 当前使用 `tsx src/main.ts` 作为非 watch 的 systemd 入口，因此部署包必须保留 workspace、源码和完整 lockfile 依赖；不得把 Vite/Nest 开发服务器用于对外监听。

将无密钥模板复制到系统目录后再由管理员填写：

```bash
install -d -m 750 /etc/standard-scaffold
install -m 600 -o standard-scaffold -g standard-scaffold apps/api/.env.example /etc/standard-scaffold/api.env
install -m 600 -o hermes-mes -g hermes-mes deploy/hermes/mes-data-analyst/profile.env.example /etc/standard-scaffold/hermes-mes.env
```

`api.env` 至少配置 `DATABASE_URL`、`HERMES_API_BASE_URL=http://127.0.0.1:8650`、`HERMES_API_KEY`、`HERMES_REQUEST_TIMEOUT_MS` 与 `MES_CONTEXT_DIRECTORY=/opt/standard-scaffold/current/apps/api/config/ai/mes`。Hermes 环境按模板配置模型、API Key 与专用只读 MSSQL 账号。任何真实密钥不得进入仓库、命令行参数或日志。

把示例 service 与 Nginx 配置复制到系统目录，人工核对用户、路径和二进制位置后启用：

```bash
sudo cp deploy/systemd/hermes-mes-data-analyst.service.example /etc/systemd/system/hermes-mes-data-analyst.service
sudo cp deploy/systemd/standard-scaffold-api.service.example /etc/systemd/system/standard-scaffold-api.service
sudo cp deploy/nginx/standard-scaffold.conf.example /etc/nginx/sites-available/standard-scaffold
sudo ln -s /etc/nginx/sites-available/standard-scaffold /etc/nginx/sites-enabled/standard-scaffold
sudo systemctl daemon-reload
sudo nginx -t
sudo systemctl enable --now hermes-mes-data-analyst standard-scaffold-api nginx
```

## 3. 数据库与 Profile 准备

发布前从 `DATABASE_URL` 指向的 PostgreSQL 执行受控 schema 同步，并保存变更记录：

```bash
pnpm --filter @repo/api db:push
```

在独立 `HERMES_HOME=/var/lib/hermes-mes/profiles/mes-data-analyst` 下创建 Profile，合并 `config.overlay.yaml` 与 `SOUL.md`，替换模板路径，不得切换或复制 default Profile。Profile 的 `platform_toolsets.api_server` 只能包含 `mes_data`；不得出现 terminal、file、web、hermes-cli 或消息平台。

## 4. 健康检查、日志与开机启动

```bash
curl --fail --silent http://127.0.0.1:8650/health
curl --fail --silent http://127.0.0.1:3000/api/ai/health
curl --fail --silent http://127.0.0.1/api/ai/health
systemctl is-enabled hermes-mes-data-analyst standard-scaffold-api nginx
journalctl -u hermes-mes-data-analyst -u standard-scaffold-api --since today
```

日志不得包含数据库密码、连接字符串、Hermes/模型 Key、完整 system prompt 或原始查询结果。`/api` 的 SSE 代理必须关闭 buffering，并保留足够的 read timeout。

## 5. 发布验证与回滚

发布后用专用测试租户完成：创建会话、流式回答、停止、失败重试、刷新恢复、历史删除和查询依据检查。固定日期指标必须先由人工批准 SQL 得到期望值，再核对 AI 返回的数值、公司、工厂、时间范围、口径与 SQL。

回滚时切换 `current` 到上一 release，执行 `systemctl restart`。若 Prisma schema 与旧版本不兼容，必须使用发布前批准的数据库回滚方案；禁止用 `git reset --hard` 或删除聊天表代替迁移。回滚后重新执行三层 health 检查。

## 6. 密钥轮换

1. 生成新 Hermes API Server Key，同时更新 Profile 与 `api.env`。
2. 轮换模型 Key 和 MSSQL 只读账号密码；确认旧凭据已撤销。
3. 依次重启 Hermes、API，并执行 health 与只读查询。
4. 复核日志和历史记录不含旧/新密钥。

## 7. 多用户开放硬门禁

以下每项都必须有可审计证据；任一未满足即为“禁止内网多用户开放”：

- [ ] API 已验证业务 access token 的签名、issuer、audience 与有效期，并只从已验证 claims 构建用户、公司和工厂上下文。
- [ ] AI 接口不再信任浏览器自报的 `x-user-id`、`x-user-name`、`x-company-code` 或 `x-factory-code`。
- [ ] 已实现 API 受控指标工具层，或 MSSQL 已启用并集成验证行级安全。
- [ ] 跨用户、跨公司、跨工厂的会话、消息、run、证据和数据查询越权测试全部被拒绝。
- [ ] 已配置每用户并发、请求速率、会话/消息配额和模型/MSSQL 超时。
- [ ] 已确定聊天与证据保留期限、软删除后的物理清理和审计访问规则。
- [ ] 已配置 API、Hermes、MCP、PostgreSQL 与 MSSQL 的健康、错误率、延迟、容量和告警。
- [ ] 已完成专用只读账号的写入、DDL、存储过程拒绝验收，并保存 DBA 授权证据。

当前实现仍读取客户端 tenant headers，且租户过滤依赖 prompt 软约束，因此本清单当前不能勾选完成。
