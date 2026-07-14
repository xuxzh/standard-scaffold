# Hermes MES AI Chat macOS 运行手册

本文用于在 A 机安装并验证独立的 `mes-data-analyst` Hermes Profile。该 Profile 只通过 `mes_data` MCP 读取 B 机 MSSQL，并仅在 `127.0.0.1:8650` 暴露 API Server。

## 安全边界

- 必须使用只授予目标对象 `SELECT` 与必要 `VIEW DEFINITION` 的专用 SQL 登录；禁止使用 `sa`、应用写账号、`db_owner` 或带 `EXECUTE`/DDL 权限的账号。
- 不得把 API Key、模型 Key、数据库密码或生成后的 `.env` 提交到 Git。
- 不得复制 default Profile 的微信、飞书、Telegram、Discord、WhatsApp 或 Slack 配置。
- 不得切换 default Profile，不得删除全局 `gateway.lock`，不得 kill 其持有进程。
- 安装脚本不会启动或替换任何 gateway，也不会覆盖已存在的 `mes-data-analyst` Profile。
- Hermes 当前版本会在创建 Profile 时生成空的 `.env`；安装脚本不会向其中写入任何密钥或连接信息。
- Hermes 会过滤 stdio MCP 子进程环境；`config.yaml` 必须通过 `${MES_DB_*}` 引用显式传递七个数据库变量，不能依赖自动继承 Profile `.env`。

## 1. 构建与静态检查

从仓库根目录执行：

```bash
pnpm --filter @repo/mes-data-mcp test
pnpm --filter @repo/mes-data-mcp build
deploy/hermes/mes-data-analyst/install-macos.sh --check
deploy/hermes/mes-data-analyst/install-macos.sh
```

最后一条命令只展示将写入的目录、文件和端口，不改变系统。确认输出为：Profile `mes-data-analyst`、目录 `~/.hermes/profiles/mes-data-analyst/`、API Server `127.0.0.1:8650`。

同时记录 default gateway 状态，后续验收必须保持同一 PID 存活：

```bash
hermes gateway list
lsof -nP -iTCP:8642 -sTCP:LISTEN
lsof -nP -iTCP:8650 -sTCP:LISTEN
```

如 8650 已被占用，停止安装并人工选择新的专用端口；需同步修改模板、spec/plan 和应用环境，不得临时复用 8642。

## 2. 审批后创建 Profile

这是 L3 人工审批点。审批范围仅包括创建以下内容，不包括启动 gateway：

```text
~/.hermes/profiles/mes-data-analyst/config.yaml
~/.hermes/profiles/mes-data-analyst/SOUL.md
```

批准后执行：

```bash
deploy/hermes/mes-data-analyst/install-macos.sh --apply
```

脚本内部使用固定创建命令：

```bash
hermes profile create mes-data-analyst --no-skills --description "Read-only MES data analysis for standard-scaffold"
```

若 Profile 已存在，脚本会停止。先用以下命令人工检查，禁止覆盖：

```bash
hermes profile show mes-data-analyst
hermes gateway list
```

如果 `--apply` 已成功创建 Profile，但在生成 `config.yaml` 前因兼容问题中断，并且该 Profile 仍没有 `config.yaml`，可在确认 gateway 未启动后执行一次：

```bash
deploy/hermes/mes-data-analyst/install-macos.sh --resume
```

`--resume` 仅接受同时存在 `profile.yaml`、`.no-bundled-skills` 且不存在 `config.yaml` 的未完成 Profile；其他已存在 Profile 一律拒绝修改。

## 3. 人工配置密钥与模型

将 `deploy/hermes/mes-data-analyst/profile.env.example` 中的变量逐项合并到 Profile 自己的 `.env`，替换所有 `REPLACE_WITH_...`。API Key 使用强随机值：

```bash
openssl rand -hex 32
chmod 600 ~/.hermes/profiles/mes-data-analyst/.env
chmod 600 ~/.hermes/profiles/mes-data-analyst/config.yaml
chmod 600 ~/.hermes/profiles/mes-data-analyst/SOUL.md
```

不要在 shell history 中直接拼接密码。数据库侧应先由 DBA 核验专用账号只有 `SELECT` 与必要的 `VIEW DEFINITION`，再填写 Profile `.env`。根据 Hermes 当前版本为该 Profile 设置模型；操作时显式指定该 Profile 的 `HERMES_HOME`，不要运行 `hermes profile use`。

应用 API 的 `.env` 另行设置：

```dotenv
HERMES_API_BASE_URL=http://127.0.0.1:8650
HERMES_API_KEY=与该Profile的API_SERVER_KEY相同
HERMES_REQUEST_TIMEOUT_MS=1800000
```

## 4. 启动并验证专用 gateway

在单独终端中启动，保持 default Profile 不变：

```bash
HERMES_HOME="$HOME/.hermes/profiles/mes-data-analyst" hermes gateway run
```

另一个终端中安全加载 Profile 环境并检查 API；命令不会打印 Key：

```bash
set -a
source "$HOME/.hermes/profiles/mes-data-analyst/.env"
set +a
curl --fail --silent http://127.0.0.1:8650/health
curl --fail --silent http://127.0.0.1:8650/v1/capabilities \
  -H "Authorization: Bearer $API_SERVER_KEY"
curl --fail --silent http://127.0.0.1:8650/v1/toolsets \
  -H "Authorization: Bearer $API_SERVER_KEY"
```

验收 `/v1/toolsets` 时，`api_server` 的有效工具集只能包含 `mes_data`；不得出现 `terminal`、`file`、`web` 或 `hermes-cli`。同时确认进程拓扑：

```bash
lsof -nP -iTCP:8642 -sTCP:LISTEN
lsof -nP -iTCP:8650 -sTCP:LISTEN
pgrep -af 'apps/mes-data-mcp/dist/main.js'
```

default gateway 的 8642 PID 必须仍与安装前一致。

## 5. 固定只读查询

先创建临时 Hermes session，再发送固定问题。`companyCode`、`factoryCode` 和指标口径必须替换为已批准的测试值；禁止在口径未确认时把答案当成生产结论。

```bash
SESSION_ID="mes-readonly-smoke-$(date +%s)"
curl --fail --silent -X POST http://127.0.0.1:8650/api/sessions \
  -H "Authorization: Bearer $API_SERVER_KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$SESSION_ID\",\"title\":\"MES read-only smoke test\",\"system_prompt\":\"Use companyCode TEST_COMPANY and factoryCode TEST_FACTORY. Read-only access only.\"}"

curl --fail --no-buffer -X POST "http://127.0.0.1:8650/api/sessions/$SESSION_ID/chat/stream" \
  -H "Authorization: Bearer $API_SERVER_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"message":"Describe the authorized MES schema, then report today output and completed work orders with calculation basis and time range."}'
```

通过条件：只调用 `describe_mes_schema`/`query_mes_data`，SQL 带公司与工厂过滤，返回统计口径、时间范围和数据截止时间；MCP 日志、Hermes 响应与应用数据中均不出现密码或连接字符串。

## 6. 停止与复核

前台 `gateway run` 使用 `Ctrl-C` 停止。若后续经人工批准安装为 launchd 服务，只能在相同 `HERMES_HOME` 下执行该 Profile 的停止命令。停止后检查：

```bash
lsof -nP -iTCP:8650 -sTCP:LISTEN
lsof -nP -iTCP:8642 -sTCP:LISTEN
hermes gateway list
```

8650 应不再监听，default gateway 的 8642 PID 应继续存活。禁止使用 `pkill hermes`、删除全局锁文件或 `gateway run --replace`。
