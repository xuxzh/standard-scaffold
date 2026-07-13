# Hermes MES AI 聊天实施计划

> **面向 Agent 执行者：** REQUIRED SUB-SKILL：使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务执行。所有步骤使用复选框追踪，并严格遵守 RED -> GREEN -> REFACTOR。L3 的密钥、Hermes Profile 安装、数据库授权和多用户开放步骤必须由人工明确批准。

**目标：** 在现有管理后台增加全局 Hermes MES 数据分析聊天，支持持久会话、SSE 流式回答、停止生成和查询依据，并在 macOS 完成单用户 PoC。

**实现方式：** 新增只读 MSSQL stdio MCP 供专用 Hermes Profile 调用；`apps/api` 管理业务会话、版本化上下文、Hermes 适配和流式状态；`apps/web` 在 `AppHeader` 挂载右侧聊天 Sheet。浏览器不直接访问 Hermes 或 MSSQL。

**技术栈：** React 19、TanStack Query、NestJS 11、Prisma/PostgreSQL、TypeScript、MCP SDK、`mssql`、Hermes API Server、SSE、Vitest、Testing Library、Playwright、i18next、shadcn Sheet。

## 全局约束

- 范围级别为 `L3`，全部实现必须在 `.worktrees/` 隔离工作区进行。
- 阶段 1 仅支持当前 macOS 开发机单用户演示，不得向内网多用户开放。
- Hermes API Server 只监听 `127.0.0.1`；浏览器只调用 `apps/api`。
- MSSQL 使用专用只读账号，授予必要 `SELECT`/`VIEW DEFINITION`，禁止写入、DDL 和 `EXECUTE`。
- 公共上下文是业务约束，不是安全边界。
- 所有显示文案实现中不得硬编码中文，必须同步中英文资源。
- 同一业务会话最多一个活动 run；每个业务会话独占一个 Hermes session。
- 查询超时 30 秒、最多 1,000 行、序列化结果最多 2 MiB。
- 不实现文件上传、页面上下文、联网搜索、语音、通用终端和 Agent 切换。
- 阶段 1 聊天记录不自动过期；会话删除为软删除，不实现物理清理任务。
- 新依赖固定为 `@modelcontextprotocol/sdk@1.29.0`、`mssql@12.7.0`、`@types/mssql@12.3.0`、`zod@4.4.3`、`yaml@2.9.0`、`react-markdown@10.1.0`、`remark-gfm@4.0.1`；升级需另行审批。

---

## 文件结构

新增主要文件：

- `apps/mes-data-mcp/`：MCP 入口、MSSQL client、工具 schema、单测和环境示例。
- `apps/api/src/ai-chat/`：controller、service、Hermes client、上下文 loader、event broker、DTO 和单测。
- `apps/api/config/ai/mes/`：版本化 MES 上下文。
- `apps/web/src/features/ai-chat/`：contract、service、SSE parser、Sheet 组件和测试。
- `deploy/hermes/mes-data-analyst/`：无密钥 Profile 模板与安装脚本。
- `docs/ai/runbooks/`：macOS PoC 和 Ubuntu 部署运行手册。

修改主要文件：

- `apps/api/prisma/schema.prisma`、`apps/api/src/app.module.ts`、`apps/api/.env.example`。
- `apps/web/src/components/layout/app-header.tsx`、`apps/web/vite.config.ts`、中英文 i18n 资源。
- `apps/web-e2e/` 的页面对象、fixture 和 AI 聊天用例。
- 根 `pnpm-lock.yaml`（仅由 `pnpm install` 产生）。

## 任务 1：TDD 建立只读 MSSQL MCP 工作区

**文件：**

- 新增：`apps/mes-data-mcp/package.json`
- 新增：`apps/mes-data-mcp/tsconfig.json`
- 新增：`apps/mes-data-mcp/src/config.ts`
- 新增：`apps/mes-data-mcp/src/mes-database.ts`
- 新增：`apps/mes-data-mcp/src/tools.ts`
- 新增：`apps/mes-data-mcp/src/main.ts`
- 新增：`apps/mes-data-mcp/src/mes-database.test.ts`
- 新增：`apps/mes-data-mcp/src/tools.test.ts`
- 新增：`apps/mes-data-mcp/.env.example`
- 修改：`pnpm-lock.yaml`

**接口：**

```ts
export type MesDatabaseConfig = {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  queryTimeoutMs: 30000;
  maxRows: 1000;
  maxResultBytes: 2097152;
};

export type MesQueryResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
  truncated: boolean;
};
```

- [ ] **步骤 1：创建 workspace 清单并安装固定依赖**

`package.json` 使用 `@repo/mes-data-mcp`，提供 `dev`、`build`、`lint`、`test`、`typecheck` 和 `start`。执行：

```bash
pnpm --filter @repo/mes-data-mcp add --save-exact @modelcontextprotocol/sdk@1.29.0 mssql@12.7.0 zod@4.4.3
pnpm --filter @repo/mes-data-mcp add -D --save-exact @types/mssql@12.3.0
```

开发工具 TypeScript、Vitest、ESLint 与仓库版本一致。

执行：

```bash
pnpm install
```

预期：lockfile 只出现上述直接依赖及其传递依赖；`pnpm --filter @repo/mes-data-mcp typecheck` 当前因源文件未创建而失败。

- [ ] **步骤 2：先写配置与数据库限制失败测试**

测试必须覆盖：缺失每个必需环境变量时抛出不含密钥的配置错误；工具输入不能覆盖连接目标；请求设置 30 秒 timeout 和 1,000 行限制；2 MiB 后截断；MSSQL 错误经过脱敏。

关键断言：

```ts
expect(() => loadMesDatabaseConfig({})).toThrow("MES_DB_SERVER is required");
expect(JSON.stringify(error)).not.toContain("secret-password");
expect(result.rows).toHaveLength(1000);
expect(result.truncated).toBe(true);
```

运行：

```bash
pnpm --filter @repo/mes-data-mcp test
```

预期：因 `loadMesDatabaseConfig`、`MesDatabase` 和工具注册不存在而 RED。

- [ ] **步骤 3：实现最小 config 与 `MesDatabase`**

`loadMesDatabaseConfig` 只读取 `MES_DB_SERVER`、`MES_DB_PORT`、`MES_DB_DATABASE`、`MES_DB_USER`、`MES_DB_PASSWORD`、`MES_DB_ENCRYPT`、`MES_DB_TRUST_SERVER_CERTIFICATE`。连接池启用 read-only intent；`query(sql, signal?)` 返回 `MesQueryResult`，不把连接信息写入错误。

环境示例只写占位值：

```env
MES_DB_SERVER=192.168.0.20
MES_DB_PORT=1433
MES_DB_DATABASE=MES
MES_DB_USER=mes_ai_reader
MES_DB_PASSWORD=replace-me
MES_DB_ENCRYPT=true
MES_DB_TRUST_SERVER_CERTIFICATE=false
```

- [ ] **步骤 4：实现两个 MCP 工具并转绿**

工具 schema 固定为：

```ts
describe_mes_schema: {
  schema?: string;
}

query_mes_data: {
  sql: string;
}
```

`describe_mes_schema` 查询 `INFORMATION_SCHEMA` 和外键元数据；`query_mes_data` 返回 JSON content。禁止把 server、database、user、password 定义为工具参数。stdio 入口除 MCP 协议外不得向 stdout 输出日志，日志只写 stderr。

运行：

```bash
pnpm --filter @repo/mes-data-mcp test
pnpm --filter @repo/mes-data-mcp typecheck
pnpm --filter @repo/mes-data-mcp lint
pnpm --filter @repo/mes-data-mcp build
```

预期：全部 0 退出，`dist/main.js` 可由 `node` 启动。

- [ ] **步骤 5：使用测试 MSSQL 做权限集成验证**

由人工提供只读测试账号，执行固定 SELECT、超时查询、超过 1,000 行查询，以及 INSERT/UPDATE/DELETE/CREATE/EXECUTE。预期 SELECT 成功并受资源限制，其余均被数据库拒绝；日志不含密码。

- [ ] **步骤 6：提交切片**

```bash
git add apps/mes-data-mcp pnpm-lock.yaml
git commit -m "feat(mcp): add read-only MES data tools"
```

## 任务 2：TDD 增加版本化 MES 上下文

**文件：**

- 新增：`apps/api/config/ai/mes/assistant.yaml`
- 新增：`apps/api/config/ai/mes/database-schema.yaml`
- 新增：`apps/api/config/ai/mes/metrics.yaml`
- 新增：`apps/api/config/ai/mes/glossary.yaml`
- 新增：`apps/api/config/ai/mes/prompt.md`
- 新增：`apps/api/src/ai-chat/context/mes-context.service.ts`
- 新增：`apps/api/src/ai-chat/context/mes-context.service.test.ts`
- 修改：`apps/api/package.json`
- 修改：`pnpm-lock.yaml`

**接口：**

```ts
export type MesConversationScope = {
  companyCode: string;
  factoryCode: string;
  userKey: string;
  userName?: string;
  now: Date;
};

export type CompiledMesContext = {
  version: string;
  systemPrompt: string;
};

export class MesContextService {
  compile(scope: MesConversationScope): CompiledMesContext;
}
```

- [ ] **步骤 1：先写 schema 校验、稳定摘要和模板失败测试**

测试使用临时 fixture 目录，覆盖文件缺失、YAML 结构错误、排序稳定、任一内容变化导致 version 变化，以及 prompt 必须包含公司、工厂、用户、时区、当前时间、指标和只读约束。

```ts
expect(first.version).toMatch(/^[a-f0-9]{64}$/);
expect(first.version).toBe(second.version);
expect(first.systemPrompt).toContain("RUIHUI");
expect(first.systemPrompt).toContain("FACTORY-01");
expect(first.systemPrompt).toContain("Asia/Shanghai");
```

运行 `pnpm --filter @repo/api test -- mes-context`，预期因 service 不存在而 RED。

- [ ] **步骤 2：编写实际 MES 上下文配置**

由业务方填写真实 B 机 schema 和指标定义。`metrics.yaml` 至少完整定义 `daily_output` 和 `daily_completed_work_orders` 的时间字段、状态、数量字段、排除条件和时区；不能保留占位符、推测字段或示例表名。

- [ ] **步骤 3：实现 loader、校验和 SHA-256 version**

先执行：

```bash
pnpm --filter @repo/api add --save-exact yaml@2.9.0
```

使用 `yaml` 解析结构化文件，启动时一次加载并深冻结。按固定文件名顺序拼接原始内容计算 SHA-256；`compile` 只插入当前 scope 和当前时间，不改变 version。配置错误使 API 启动失败，不静默降级为空上下文。

- [ ] **步骤 4：运行测试和静态检查**

```bash
pnpm --filter @repo/api test -- mes-context
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api lint
```

预期：全部通过，测试证明同一发布配置对不同用户产生相同 `version`，但 prompt 中租户范围不同。

- [ ] **步骤 5：提交切片**

```bash
git add apps/api/config/ai/mes apps/api/src/ai-chat/context apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): add versioned MES AI context"
```

## 任务 3：TDD 建立聊天持久化模型与仓储

**文件：**

- 修改：`apps/api/prisma/schema.prisma`
- 新增：`apps/api/src/ai-chat/ai-chat.types.ts`
- 新增：`apps/api/src/ai-chat/ai-chat.repository.ts`
- 新增：`apps/api/src/ai-chat/ai-chat.repository.test.ts`

**接口：**

```ts
type AiActorScope = {
  companyCode: string;
  factoryCode: string;
  userKey: string;
  userName?: string;
};

interface AiChatRepository {
  createConversation(scope: AiActorScope, input: {
    title: string;
    hermesSessionId: string;
    contextVersion: string;
  }): Promise<AiConversationDto>;
  listConversations(scope: AiActorScope): Promise<AiConversationDto[]>;
  getConversation(scope: AiActorScope, id: string): Promise<AiConversationDto>;
  softDeleteConversation(scope: AiActorScope, id: string): Promise<void>;
  createRun(scope: AiActorScope, conversationId: string, content: string): Promise<StartAiRunRecord>;
  completeRun(runId: string, content: string): Promise<void>;
  stopRun(runId: string, content: string): Promise<void>;
  failRun(runId: string, errorCode: string): Promise<void>;
  interruptActiveRuns(): Promise<number>;
}
```

- [ ] **步骤 1：先写租户/用户隔离和状态转换失败测试**

测试必须证明三字段 scope 全部进入查询条件；不同 `userKey` 不能读取、删除或发送消息到别人的会话；同一会话已有 active run 时拒绝创建；complete/stop/fail 同时更新 run 与 assistant message；恢复逻辑把残留状态改为 interrupted。

- [ ] **步骤 2：扩展 Prisma schema**

按 spec 增加四个 enum、`AiConversation`、`AiMessage`、`AiRun`、`AiQueryEvidence`，使用 UUID 主键、关系、`createdAt`/`updatedAt`、会话软删除索引，以及 `(companyCode, factoryCode, userKey, deletedAt)` 查询索引。消息增加单调 `sequence` 并在 `(conversationId, sequence)` 上唯一。

- [ ] **步骤 3：生成 Prisma Client 并实现最小仓储**

```bash
pnpm --filter @repo/api prisma:generate
```

仓储所有会话入口必须消费 `AiActorScope`，不得提供忽略 scope 的公开方法。`createRun` 使用事务创建 user message、assistant placeholder 和 run，并在事务内检查活动 run。

- [ ] **步骤 4：运行测试并同步本地 schema**

```bash
pnpm --filter @repo/api test -- ai-chat.repository
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api db:push
```

预期：测试通过；`db:push` 只增加 AI 表、enum、索引和关系，不删除现有 `PackagingType` 数据。

- [ ] **步骤 5：提交切片**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/ai-chat/ai-chat.types.ts apps/api/src/ai-chat/ai-chat.repository.ts apps/api/src/ai-chat/ai-chat.repository.test.ts
git commit -m "feat(api): persist AI conversations and runs"
```

## 任务 4：TDD 实现 Hermes client 与事件 broker

**文件：**

- 新增：`apps/api/src/ai-chat/hermes/hermes-client.ts`
- 新增：`apps/api/src/ai-chat/hermes/hermes-client.test.ts`
- 新增：`apps/api/src/ai-chat/runs/ai-run-event-broker.ts`
- 新增：`apps/api/src/ai-chat/runs/ai-run-event-broker.test.ts`
- 修改：`apps/api/.env.example`

**接口：**

```ts
export type HermesStreamEvent =
  | { type: "assistant.delta"; delta: string }
  | { type: "tool.started"; toolName: string; args: unknown }
  | { type: "tool.completed"; toolName: string; preview?: string; durationMs?: number }
  | { type: "assistant.completed"; content: string }
  | { type: "run.completed"; content: string }
  | { type: "run.failed"; message: string };

export interface HermesClient {
  health(signal?: AbortSignal): Promise<void>;
  createSession(input: { id: string; title: string; systemPrompt: string }): Promise<void>;
  streamSession(input: {
    sessionId: string;
    message: string;
    signal: AbortSignal;
  }): AsyncIterable<HermesStreamEvent>;
}
```

- [ ] **步骤 1：先写 Hermes HTTP/SSE 失败测试**

使用本地 fake HTTP server 覆盖 Bearer header、超时、非 2xx、分块 SSE、keepalive、跨 chunk JSON、未知事件忽略、敏感错误脱敏和 abort。禁止在测试中调用真实 Hermes。

- [ ] **步骤 2：实现 Hermes client**

只读取：

```env
HERMES_API_BASE_URL=http://127.0.0.1:8650
HERMES_API_KEY=replace-me
HERMES_REQUEST_TIMEOUT_MS=1800000
```

使用原生 `fetch` 调用 `/health`、`/api/sessions` 和 `/api/sessions/:id/chat/stream`。使用结构化 SSE parser，不用按单行临时拆字符串；只映射白名单事件，不记录 Authorization header、system prompt 或原始工具结果。

- [ ] **步骤 3：先写 broker 并发、回放和停止失败测试**

broker 为每个业务 run 保存最多 256 个公开事件和一个 `AbortController`。测试订阅者晚到可回放、完成后关闭、stop 幂等、未知 run 返回 false、cleanup 后释放引用。

- [ ] **步骤 4：实现 broker 并运行验证**

```bash
pnpm --filter @repo/api test -- hermes-client ai-run-event-broker
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api lint
```

预期：全部通过；abort fake stream 后不再产生 delta。

- [ ] **步骤 5：提交切片**

```bash
git add apps/api/src/ai-chat/hermes apps/api/src/ai-chat/runs apps/api/.env.example
git commit -m "feat(api): add Hermes streaming adapter"
```

## 任务 5：TDD 实现 AI Chat API 与状态编排

**文件：**

- 新增：`apps/api/src/ai-chat/dto/ai-chat.dto.ts`
- 新增：`apps/api/src/ai-chat/ai-chat.service.ts`
- 新增：`apps/api/src/ai-chat/ai-chat.service.test.ts`
- 新增：`apps/api/src/ai-chat/ai-chat.controller.ts`
- 新增：`apps/api/src/ai-chat/ai-chat.controller.test.ts`
- 新增：`apps/api/src/ai-chat/ai-chat.module.ts`
- 修改：`apps/api/src/app.module.ts`

**REST/SSE 契约：** 使用设计 spec 中的八个 endpoint 和 `AiRunEvent` union；REST 继续使用 `XzHttpResponse`，SSE 使用 `text/event-stream` 原始响应。

- [ ] **步骤 1：先写 service 主流程与失败路径测试**

覆盖：`userId` 与 `userName` 都缺失时拒绝；优先把 `userId` 字符串化为 `userKey`，否则使用非空 `userName`；Hermes 不健康不创建会话；创建会话固定 contextVersion；首条消息生成标题；同会话并发拒绝；delta 聚合；工具事件生成/更新 evidence；完成以最终内容覆盖草稿；停止保留部分文本；Hermes/MCP 失败保留用户消息；启动恢复标记 interrupted。

关键错误码固定为：

```text
AI_USER_CONTEXT_REQUIRED
AI_SERVICE_UNAVAILABLE
AI_CONVERSATION_NOT_FOUND
AI_CONVERSATION_BUSY
AI_RUN_NOT_FOUND
AI_RUN_FAILED
```

- [ ] **步骤 2：实现 service 的单一 run 状态机**

后台 stream 每累计 500ms 或 2KiB delta 保存一次草稿，避免逐 token 写数据库。只识别 `mcp_mes_data_*` 工具事件；SQL 从 `tool.started.args.sql` 读取并保存，`tool.completed.preview` 仅通过明确 JSON schema 提取 rowCount/truncated，解析失败保持 null 而不是猜测。

- [ ] **步骤 3：先写 controller 契约与 SSE 测试**

使用 Nest testing module 覆盖 DTO whitelist、scope 传递、404/409 错误、SSE content type、事件名与 JSON data、客户端断开清理、stop 幂等和 health 输出。SSE 测试不得经过全局 JSON interceptor。

- [ ] **步骤 4：实现 controller/module 并接入 AppModule**

`DELETE conversations/:id` 软删除；`POST messages` 返回 202；`POST stop` 返回最终 run；`GET health` 只返回 `available`、Hermes version/capabilities 摘要，不返回地址、Key 或 Profile 环境。

- [ ] **步骤 5：运行 API 全量验证**

```bash
pnpm --filter @repo/api test
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api lint
pnpm --filter @repo/api build
```

预期：全部 0 退出，无开放 handle、未捕获 Promise 或敏感日志。

- [ ] **步骤 6：提交切片**

```bash
git add apps/api/src/ai-chat apps/api/src/app.module.ts
git commit -m "feat(api): expose persistent Hermes chat API"
```

## 任务 6：创建受控 Hermes Profile 模板与 macOS runbook

**文件：**

- 新增：`deploy/hermes/mes-data-analyst/SOUL.md`
- 新增：`deploy/hermes/mes-data-analyst/config.overlay.yaml`
- 新增：`deploy/hermes/mes-data-analyst/profile.env.example`
- 新增：`deploy/hermes/mes-data-analyst/install-macos.sh`
- 新增：`docs/ai/runbooks/hermes-mes-ai-chat-macos.md`

- [ ] **步骤 1：写静态验证脚本的失败检查**

runbook 先定义检查：模板不得出现真实 key/password；API host 必须为 `127.0.0.1`；Profile 只启用 api_server；MCP server 配置键固定为 `mes_data`；api_server toolset 只包含 `mes_data`；MCP command 指向仓库 `apps/mes-data-mcp/dist/main.js`；端口不得与当前 default gateway 的 8642 冲突。

- [ ] **步骤 2：编写无密钥模板**

Profile 名固定 `mes-data-analyst`，PoC 默认端口 8650。创建命令固定：

```bash
hermes profile create mes-data-analyst --no-skills --description "Read-only MES data analysis for standard-scaffold"
```

脚本必须在 Profile 已存在时停止并给出人工检查命令，不能覆盖 `.env`、活跃 gateway 或用户现有配置。模板只提供需要合并的配置，禁止复制当前 default Profile 的微信/飞书配置。

- [ ] **步骤 3：编写 macOS 配置与验证 runbook**

runbook 包含：构建 MCP、创建 Profile、人工填密钥、设置 `chmod 600`、启动 gateway、检查 `/health` 与 `/v1/capabilities`、确认 toolsets、执行固定测试查询、停止专用 gateway。明确禁止 kill 全局 `gateway.lock` 持有者和切换/破坏 default Profile。

- [ ] **步骤 4：人工批准后执行本机 Profile 安装**

这是 L3 审批点。执行前展示将写入的 `~/.hermes/profiles/mes-data-analyst/` 文件和端口；用户批准后才运行脚本。验证：default gateway PID 仍存活，专用 gateway 监听 8650，`mes-data-mcp` 子进程存在，查询只读测试库成功。

- [ ] **步骤 5：提交模板与 runbook**

```bash
git add deploy/hermes/mes-data-analyst docs/ai/runbooks/hermes-mes-ai-chat-macos.md
git commit -m "docs(ai): add Hermes MES profile setup"
```

## 任务 7：TDD 实现 Web AI chat contract、service 与 SSE parser

**文件：**

- 新增：`apps/web/src/features/ai-chat/ai-chat-contract.ts`
- 新增：`apps/web/src/features/ai-chat/ai-chat-client.ts`
- 新增：`apps/web/src/features/ai-chat/ai-chat-client.test.ts`
- 新增：`apps/web/src/features/ai-chat/ai-chat-service.ts`
- 新增：`apps/web/src/features/ai-chat/ai-chat-service.test.ts`
- 新增：`apps/web/src/features/ai-chat/ai-run-stream.ts`
- 新增：`apps/web/src/features/ai-chat/ai-run-stream.test.ts`
- 修改：`apps/web/vite.config.ts`

**接口：**

```ts
export function listAiConversations(signal?: AbortSignal): Promise<AiConversation[]>;
export function createAiConversation(signal?: AbortSignal): Promise<AiConversation>;
export function listAiMessages(conversationId: string, signal?: AbortSignal): Promise<AiMessage[]>;
export function startAiRun(conversationId: string, content: string, signal?: AbortSignal): Promise<StartAiRunResponse>;
export function stopAiRun(runId: string, signal?: AbortSignal): Promise<AiRun>;
export function subscribeAiRun(runId: string, options: {
  signal: AbortSignal;
  onEvent: (event: AiRunEvent) => void;
}): Promise<void>;
```

- [ ] **步骤 1：先写专用同源 client 与 REST contract 失败测试**

新增 `getAiChatClient`/`setAiChatTransportForTests`，固定 root-relative `/api/ai`，不读取现有远程 `VITE_API_BASE_URL`。请求带 Bearer token，并从 `tenant-context-store` 与 `user-display-store` 加入阶段 1 的 `x-company-code`、`x-factory-code`、`x-user-name`；若 JWT 明确提供数字 `UserId` 再加入 `x-user-id`。测试覆盖所有路径、202 响应、AbortSignal、统一响应解包和错误传播。DTO 字段严格与 API 对齐，不暴露 `hermesSessionId`。

- [ ] **步骤 2：先写浏览器 SSE parser 失败测试**

构造分块 `ReadableStream`，覆盖 CRLF、跨 chunk data、多事件、keepalive、未知事件、畸形 JSON、abort 和 EOF。畸形公开事件抛出 `AI_STREAM_PROTOCOL_ERROR`，未知事件忽略。

- [ ] **步骤 3：实现 service 和 fetch SSE client**

REST 使用专用 `ai-chat-client`。SSE 使用原生 fetch，并复用该 client 导出的 `createAiChatHeaders()` 和 root-relative URL；不得依赖 `EventSource`，因为需要 Authorization header、阶段 1 上下文 headers 和 AbortSignal。新增 `/api/ai` 到本机 API 的 Vite 代理，target 为 `http://127.0.0.1:3000` 且不 rewrite 路径；不改变既有 `/api/app`、`/api/wms`、`/api/mes`、`/api/print` 代理语义。

- [ ] **步骤 4：运行验证并提交**

```bash
pnpm --filter @repo/web test -- ai-chat-service ai-run-stream
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

```bash
git add apps/web/src/features/ai-chat apps/web/vite.config.ts
git commit -m "feat(web): add AI chat transport"
```

## 任务 8：TDD 实现全局聊天 Sheet

**文件：**

- 新增：`apps/web/src/features/ai-chat/ai-chat-trigger.tsx`
- 新增：`apps/web/src/features/ai-chat/ai-chat-sheet.tsx`
- 新增：`apps/web/src/features/ai-chat/conversation-list.tsx`
- 新增：`apps/web/src/features/ai-chat/message-list.tsx`
- 新增：`apps/web/src/features/ai-chat/chat-composer.tsx`
- 新增：`apps/web/src/features/ai-chat/ai-chat-sheet.test.tsx`
- 修改：`apps/web/src/components/layout/app-header.tsx`
- 修改：`apps/web/src/i18n/resources/zh-CN/common.ts`
- 修改：`apps/web/src/i18n/resources/en-US/common.ts`
- 修改：`apps/web/src/app.test.tsx`
- 修改：`apps/web/package.json`
- 修改：`pnpm-lock.yaml`

- [ ] **步骤 1：先写全局入口和 Sheet 失败测试**

在 authenticated app test 中断言顶部栏存在可访问名称为“AI 助手”的 Bot 图标；点击后出现 dialog/sheet，关闭后页面内容保留。英文切换后使用英文可访问名称。预期当前入口不存在而 RED。

- [ ] **步骤 2：实现 Header 入口和稳定 Sheet 尺寸**

`AiChatTrigger` 放在 `LanguageToggle` 前；使用 Lucide `Bot` 和 Tooltip。Sheet 使用现有 shadcn 组件，桌面 `w-[440px] max-w-[min(440px,100vw)]`，移动端 `w-full`，内部 grid/flex 使用 `min-h-0` 和独立滚动区，禁止嵌套卡片和文字按钮替代熟悉图标。

- [ ] **步骤 3：先写会话、消息和生成状态失败测试**

覆盖空状态自动创建/手动新建、历史切换、软删除确认、发送后 user/assistant placeholder、delta 流式追加、完成覆盖、停止按钮、失败重试、关闭后继续生成、重新打开恢复、刷新重新读取、同会话生成时禁发、查询依据折叠区。

- [ ] **步骤 4：实现 React Query 与局部流状态**

服务端数据使用 React Query；当前 Sheet open、选中 conversation 和当前 delta 使用 feature 内局部 state。活动 run ID 来自 API，不写全局 app store。SSE 完成/停止/失败后 invalidate 当前 messages/conversations；断线时先重新获取消息，禁止自动重复提交。

- [ ] **步骤 5：实现安全 Markdown 与查询依据**

执行：

```bash
pnpm --filter @repo/web add --save-exact react-markdown@10.1.0 remark-gfm@4.0.1
```

使用 `react-markdown` 与 `remark-gfm`，不启用 `rehype-raw`。代码块允许横向滚动；SQL 依据放在可折叠 section，默认关闭，展示 scope、时间、rowCount、duration、truncated 和 status。工具原始结果、reasoning 和 system prompt 不渲染。

- [ ] **步骤 6：补齐中英文文案并运行验证**

文案至少覆盖入口、标题、新会话、历史、空状态、输入 placeholder、发送、停止、重试、删除、查询依据、服务不可用、会话忙、流中断和截断提示。

```bash
pnpm --filter @repo/web test -- ai-chat-sheet app.test
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

预期：全部通过，无 act warning、overflow 和可访问性定位失败。

- [ ] **步骤 7：提交切片**

```bash
git add apps/web/src/features/ai-chat apps/web/src/components/layout/app-header.tsx apps/web/src/i18n/resources apps/web/src/app.test.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add global MES AI chat"
```

## 任务 9：增加 E2E、故障验证与 macOS 演示验收

**文件：**

- 新增：`apps/web-e2e/pages/ai-chat.page.ts`
- 新增：`apps/web-e2e/tests/ai-chat.spec.ts`
- 新增：`apps/web-e2e/helpers/fake-hermes-server.ts`
- 修改：`apps/web-e2e/package.json`
- 修改：`pnpm-lock.yaml`

- [ ] **步骤 1：建立可控 fake Hermes 集成环境**

fake server 实现 health、session create 和 session stream，能按用例发 delta、tool、completed、failed、slow stream，并记录 stop/abort。E2E 不调用真实模型或生产 MSSQL，保证确定性。

- [ ] **步骤 2：编写 E2E 主流程**

用 `getByRole` 和稳定文案覆盖：顶部入口、创建会话、发送“今日产量”、看到流式内容、展开 SQL 依据、切换历史、刷新恢复、删除会话、中英文切换。

- [ ] **步骤 3：编写停止和故障 E2E**

覆盖：slow stream 点击停止后无新 token；Hermes health 失败；MCP 查询失败；SSE 中断；API 重启后的 interrupted 状态。断言用户问题保留、错误可重试、浏览器响应不含 Key/password。

- [ ] **步骤 4：运行确定性 E2E**

```bash
pnpm --filter @repo/web-e2e test:e2e -- ai-chat.spec.ts
```

预期：桌面与项目现有移动 viewport 均通过，无文本重叠、横向页面溢出或 Sheet 空白。

- [ ] **步骤 5：人工批准后执行真实 macOS 演示验收**

使用专用只读测试库的固定日期数据，先运行人工确认 SQL 得到期望值，再在 UI 提问“今日产量”和“今日完成工单数”。验收 AI 的数值、公司、工厂、时间范围、口径和展开 SQL一致；不要求回答逐字一致。

- [ ] **步骤 6：提交切片**

```bash
git add apps/web-e2e pnpm-lock.yaml
git commit -m "test(e2e): cover MES AI chat flow"
```

## 任务 10：Ubuntu 部署 runbook 与最终验证

**文件：**

- 新增：`docs/ai/runbooks/hermes-mes-ai-chat-ubuntu.md`
- 新增：`deploy/systemd/standard-scaffold-api.service.example`
- 新增：`deploy/systemd/hermes-mes-data-analyst.service.example`
- 新增：`deploy/nginx/standard-scaffold.conf.example`
- 修改：`apps/api/README.md`
- 修改：`docs/ai/context-index.md`

- [ ] **步骤 1：编写 Ubuntu 单机部署 runbook**

固定 Nginx 同源托管 Web 和代理 `/api`；NestJS 与 Hermes 使用独立 systemd service/user；Hermes API 仍只绑定 loopback；`.env`/Profile 权限 600；MCP 不监听端口。包含安装、发布、回滚、日志、health、开机启动和密钥轮换命令。

- [ ] **步骤 2：写明多用户上线硬门禁**

runbook 必须提供可勾选证据：API 已验证 token claims；不再信任客户端 tenant headers；已实现后端受控工具层或 MSSQL 行级安全；跨用户/工厂越权测试失败；并发、配额、保留和监控已配置。任一项缺失即标记“禁止内网多用户开放”。

- [ ] **步骤 3：运行 workspace 验证**

```bash
pnpm lint
pnpm typecheck
pnpm --filter @repo/mes-data-mcp test
pnpm --filter @repo/api test
pnpm --filter @repo/web test
pnpm build
pnpm --filter @repo/web-e2e test:e2e -- ai-chat.spec.ts
```

预期：全部 0 退出。若仓库存在与本任务无关的基线失败，必须在 `main` 同命令复现并记录；不得把基线失败包装成本任务通过。

- [ ] **步骤 4：执行安全与差异审计**

```bash
git diff origin/main...HEAD --check
git diff origin/main...HEAD --stat
git status --short
rg -n "MES_DB_PASSWORD=.+|HERMES_API_KEY=.+|password.*[A-Za-z0-9]{8}" apps deploy docs --glob '!*.example' --glob '!*.test.*'
```

确认没有真实凭据、调试输出、无关格式化、对 default Hermes Profile 的修改或对外 Hermes 端口。

- [ ] **步骤 5：浏览器视觉检查**

启动本地服务后使用 Playwright 对桌面和移动 viewport 截图，验证 Header 图标、Sheet 宽度、长 Markdown、长 SQL、错误状态、会话列表和输入区不重叠、不溢出，按钮有 tooltip 和可访问名称。

- [ ] **步骤 6：提交最终文档与验证修正**

```bash
git add docs/ai/runbooks/hermes-mes-ai-chat-ubuntu.md deploy/systemd deploy/nginx apps/api/README.md docs/ai/context-index.md
git commit -m "docs(ai): add MES AI chat deployment runbook"
```

## 完成验收

- 顶部栏全局入口和右侧聊天 Sheet 在 macOS PoC 可用。
- 历史会话、流式输出、停止、失败重试、刷新恢复和查询依据均通过测试。
- 专用 Hermes Profile 不含通用终端/文件/网络工具，只加载 MES MCP。
- MSSQL 写入、DDL 和存储过程由数据库权限拒绝。
- 固定数据集的今日产量和完成工单数与确定 SQL 一致。
- 所有实际验证命令、通过结果、未运行项及原因在交付说明中记录。
- Ubuntu runbook 明确多用户上线硬门禁，阶段 1 不被误当作多租户生产方案。
