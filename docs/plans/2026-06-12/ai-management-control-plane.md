# AI 驱动研发管理控制面实施计划

> **面向 Agent 执行者：** 必须使用 `subagent-driven-development`（推荐）或 `executing-plans` 按任务执行。步骤使用复选框 `- [ ]` 跟踪。此任务为 `L3`，任何阶段都不能因为已有计划而绕过人工审批。

**目标：** 在当前 monorepo 中实现一个本机运行、单管理员、面向单仓库的研发管理控制面，跑通“缺陷录入 → AI 评估 → 人工批准执行合同 → Codex CLI 隔离修复 → 独立验证 → GitHub Draft PR”的 MVP 闭环。

**实现方式：** 新增独立的管理 Web、管理 API、管理 Worker、管理 E2E 和共享契约包。管理 API 是 PostgreSQL 的唯一访问者，通过事务性 Outbox 和内部租约 API 向 Worker 派发任务；Worker 通过可插拔 `AgentRunner` 和 `ScmProvider` 调用 Codex CLI 与 GitHub，并由平台独立校验实际 Git diff 和验证命令。

**技术栈：** `pnpm`、Turborepo、TypeScript、React 19、Vite、TanStack Router、TanStack Query、React Hook Form、Zod、i18next、NestJS 11、Prisma 6、PostgreSQL 16、Vitest、Playwright、Docker Compose、Codex CLI、GitHub REST API。

**关联设计：** `docs/specs/2026-06-12/ai-management-control-plane.md`

---

## L3 执行门禁

- [ ] 实施开始前确认当前不在 `main` / `master`，并使用 `.worktrees/` 下的独立 worktree。
- [ ] 每个阶段单独提交、验证和人工复核，不能把六个阶段合并为一次无人值守执行。
- [ ] 阶段 4 开始前，人工批准 Docker 隔离、Codex API Key 和网络策略。
- [ ] 阶段 5 开始前，人工批准 GitHub fine-grained PAT 权限与沙箱仓库。
- [ ] 阶段 6 开始前，人工批准真实 Codex/GitHub 端到端验收和 `.gitlab-ci.yml` 变更。
- [ ] 不实现自动合并、部署、回滚、GitLab Provider、Claude Code Runner、多用户 RBAC 或规则自动激活。
- [ ] 现有 `apps/web`、`apps/api` 和产品数据库不得被管理控制面复用或修改业务行为。

## 固定决策

| 项目 | MVP 决策 |
| --- | --- |
| 运行环境 | 开发者本机 |
| 数据库 | 独立 PostgreSQL 数据库 `standard_scaffold_management` |
| 数据库端口 | `127.0.0.1:5433` |
| 管理 API | `127.0.0.1:3100` |
| 管理 Web | `127.0.0.1:3101` |
| 用户模型 | 单管理员 |
| 管理认证 | 环境凭据 + 8 小时签名会话 Cookie |
| Worker 认证 | 独立 Bearer Token |
| 任务派发 | PostgreSQL Outbox + HTTP 租约协议 |
| Artifact | API 管理的本地文件存储 |
| Agent 接口 | 可插拔 `AgentRunner` |
| MVP Agent | `CodexCliRunner` |
| Codex 凭据 | 专用 `OPENAI_API_KEY` |
| SCM 接口 | 可插拔 `ScmProvider` |
| MVP SCM | `GitHubProvider` |
| GitHub 凭据 | 单仓库 fine-grained PAT |
| PR | Draft PR，禁止自动合并 |
| 管理 CI | 扩展现有 GitLab CI |

## Workspace 与文件边界

### 新增 workspace

```text
apps/
  management-api/
  management-web/
  management-worker/
  management-e2e/
packages/
  management-contracts/
```

### 主要职责

- `packages/management-contracts`：跨 Web、API、Worker 使用的 Zod schema、枚举和 TypeScript 类型。
- `apps/management-api`：认证、领域状态机、Prisma、审计、Outbox、Worker 内部 API 和 Artifact 下载。
- `apps/management-worker`：任务轮询、Git 工作区、Agent Runner、策略检查、独立验证和 SCM Provider。
- `apps/management-web`：缺陷录入、合同审批、运行证据、审计时间线和 PR 状态。
- `apps/management-e2e`：基于 Fake Agent/SCM 的完整管理流程 Playwright 测试。

### 根目录变更

- 修改 `package.json`，增加管理应用开发与验证脚本。
- 修改 `.gitignore`，忽略 `.management/`、管理应用 `.env` 和 E2E 产物。
- 新增 `infra/management/docker-compose.yml`，只启动 PostgreSQL。
- 阶段 6 修改 `.gitlab-ci.yml`，加入管理应用验证。
- 实现完成后更新 `AGENTS.md`、`docs/ai/context-index.md`、ADR 和 runbook。

## 公共契约

### 领域枚举

```ts
export const defectStatuses = [
  "DRAFT",
  "SUBMITTED",
  "ASSESSING",
  "WAITING_FOR_APPROVAL",
  "NEEDS_REVISION",
  "APPROVED",
  "EXECUTING",
  "VERIFYING",
  "REAPPROVAL_REQUIRED",
  "FAILED",
  "RETRY_APPROVAL",
  "PR_CREATED",
  "CHANGES_REQUESTED",
  "REJECTED",
  "RESOLVED",
] as const;

export const agentRunTypes = ["ASSESSMENT", "IMPLEMENTATION"] as const;
export const agentRunStatuses = [
  "QUEUED",
  "LEASED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCEL_REQUESTED",
  "CANCELLED",
] as const;
```

### 验证命令

验证命令禁止保存为 shell 字符串，使用结构化参数：

```ts
export const validationCommandSchema = z.object({
  executable: z.enum(["pnpm", "git"]),
  args: z.array(z.string().min(1)).max(32),
  cwd: z.string().min(1),
  timeoutSeconds: z.number().int().min(1).max(3600),
});
```

Worker 直接以 `spawn(executable, args, { shell: false })` 执行。`cwd` 必须解析到工作区内部，且不得包含 `..` 逃逸。

### 错误响应

所有管理 API 错误统一为：

```ts
export type ApiProblem = {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  traceId: string;
};
```

成功响应直接返回业务对象，不增加额外 envelope。

### Worker 任务

```ts
export type WorkerTask =
  | {
      type: "ASSESS_DEFECT";
      taskId: string;
      runId: string;
      defectId: string;
      repository: RepositorySnapshot;
    }
  | {
      type: "EXECUTE_CONTRACT";
      taskId: string;
      runId: string;
      defectId: string;
      contract: ApprovedExecutionContractSnapshot;
      repository: RepositorySnapshot;
    }
  | {
      type: "PUBLISH_CODE_CHANGE";
      taskId: string;
      runId: string;
      defectId: string;
      repository: RepositorySnapshot;
      verifiedCommit: string;
    }
  | {
      type: "SYNC_CHANGE_REQUEST";
      taskId: string;
      codeChangeId: string;
    };
```

### Agent 接口

```ts
export interface AgentRunner {
  getCapabilities(): Promise<AgentCapabilities>;
  execute(
    input: AgentExecutionInput,
    onEvent: (event: AgentEvent) => Promise<void>,
  ): Promise<AgentExecutionResult>;
  cancel(runId: string): Promise<void>;
}
```

### SCM 接口

```ts
export interface ScmProvider {
  getRepository(ref: RepositoryRef): Promise<RepositorySnapshot>;
  createBranch(input: CreateBranchInput): Promise<BranchRef>;
  pushCommit(input: PushCommitInput): Promise<CommitRef>;
  createChangeRequest(
    input: CreateChangeRequestInput,
  ): Promise<ChangeRequestRef>;
  getChangeRequest(
    ref: ChangeRequestRef,
  ): Promise<ChangeRequestSnapshot>;
}
```

## 数据模型

所有主键使用 UUID。`Defect.number` 使用数据库自增序列，UI 显示为 `DEF-${number.padStart(6, "0")}`。

### `Repository`

- `id`
- `name`
- `provider`
- `owner`
- `repositoryName`
- `cloneUrl`
- `defaultBranch`
- `enabled`
- `createdAt`
- `updatedAt`

MVP seed 仅创建当前 monorepo，Provider 为 `GITHUB`。

### `Defect`

- `id`
- `number`
- `repositoryId`
- `title`
- `description`
- `reproductionSteps`
- `expectedBehavior`
- `severity`
- `impact`
- `notes`
- `status`
- `version`
- `currentAssessmentId`
- `currentContractId`
- `currentRunId`
- `createdAt`
- `updatedAt`

`version` 用于乐观锁；所有命令必须提交当前版本。

### `Assessment`

- `id`
- `defectId`
- `runId`
- `rootCauseHypothesis`
- `evidenceJson`
- `riskLevel`
- `suggestedTaskLevel`
- `proposedSolution`
- `alternativesJson`
- `nonGoalsJson`
- `suggestedReadPathsJson`
- `suggestedWritePathsJson`
- `suggestedValidationCommandsJson`
- `agentRunner`
- `model`
- `promptVersion`
- `knowledgeVersion`
- `createdAt`

### `ExecutionContract`

- `id`
- `defectId`
- `assessmentId`
- `version`
- `status`：`DRAFT` 或 `APPROVED`
- `goal`
- `successCriteriaJson`
- `baseCommit`
- `readPathsJson`
- `writePathsJson`
- `validationCommandsJson`
- `forbiddenActionsJson`
- `policyJson`
- `riskLevel`
- `contentHash`
- `createdAt`
- `approvedAt`

同一缺陷的合同版本唯一。已批准合同不得更新；调整合同必须创建下一版本。

### `Approval`

- `id`
- `defectId`
- `contractId`
- `decision`
- `actor`
- `comment`
- `contractVersion`
- `contractHash`
- `baseCommit`
- `createdAt`

### `AgentRun`

- `id`
- `defectId`
- `contractId`
- `type`
- `runner`
- `runnerVersion`
- `model`
- `status`
- `attempt`
- `leaseOwner`
- `leaseExpiresAt`
- `heartbeatAt`
- `startedAt`
- `finishedAt`
- `exitReason`
- `failureCategory`
- `usageJson`
- `workspaceRef`
- `createdAt`

### `RunEvent`

- `id`
- `runId`
- `sequence`
- `type`
- `payloadJson`
- `createdAt`

`runId + sequence` 唯一，保证 Worker 重放事件不会重复写入。

### `Evidence` 与 `Artifact`

`Evidence` 保存结构化结果，`Artifact` 保存文件元数据：

- `Evidence`：`runId`、`type`、`status`、`summary`、`detailsJson`。
- `Artifact`：`runId`、`kind`、`relativePath`、`sha256`、`sizeBytes`、`mediaType`、`createdAt`。

Artifact 实际文件保存在 `.management/artifacts/<runId>/<artifactId>`，数据库不保存大文本或二进制内容。

### `CodeChange`

- `id`
- `defectId`
- `runId`
- `provider`
- `branchName`
- `commitSha`
- `changeRequestNumber`
- `changeRequestUrl`
- `changeRequestStatus`
- `idempotencyKey`
- `lastSyncedAt`
- `createdAt`

`idempotencyKey` 唯一，格式为 `publish:<repositoryId>:<contractId>:<runId>`。

### `AuditEvent`

- `id`
- `aggregateType`
- `aggregateId`
- `eventType`
- `actorType`
- `actorId`
- `fromState`
- `toState`
- `payloadJson`
- `createdAt`

只允许新增，不提供更新或删除 API。

### `OutboxTask`

- `id`
- `type`
- `aggregateId`
- `payloadJson`
- `idempotencyKey`
- `status`
- `availableAt`
- `attempts`
- `maxAttempts`
- `leaseOwner`
- `leaseExpiresAt`
- `lastError`
- `createdAt`
- `completedAt`

`idempotencyKey` 唯一。领取任务使用 `SELECT ... FOR UPDATE SKIP LOCKED`。

## HTTP API

### 管理员认证

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/session
```

登录请求：

```json
{
  "username": "admin",
  "password": "secret"
}
```

登录成功设置 `management_session` Cookie：

- `HttpOnly`
- `SameSite=Strict`
- `Path=/`
- 有效期 8 小时
- 非开发环境必须 `Secure`

Cookie 使用 `base64url(payload).base64url(hmacSha256(payload, SESSION_SECRET))`。Payload 只包含 `sub`、`issuedAt`、`expiresAt` 和随机 `sessionId`。

### 缺陷命令与查询

```text
GET    /api/defects
POST   /api/defects
GET    /api/defects/:id
PATCH  /api/defects/:id
POST   /api/defects/:id/submit
POST   /api/defects/:id/reassess
GET    /api/defects/:id/assessments
GET    /api/defects/:id/contracts
POST   /api/defects/:id/contracts
POST   /api/defects/:id/contracts/:contractId/approve
POST   /api/defects/:id/contracts/:contractId/reject
POST   /api/defects/:id/contracts/:contractId/request-revision
POST   /api/defects/:id/runs/:runId/cancel
POST   /api/defects/:id/runs/:runId/approve-retry
POST   /api/defects/:id/code-change/sync
POST   /api/defects/:id/resolve
```

列表支持：

- `page`
- `pageSize`
- `status`
- `severity`
- `search`

`pageSize` 最大 100，默认 20；默认按 `updatedAt desc`。

### 运行与证据查询

```text
GET    /api/defects/:id/runs
GET    /api/runs/:runId
GET    /api/runs/:runId/events
GET    /api/runs/:runId/evidence
GET    /api/artifacts/:artifactId
```

### Worker 内部 API

```text
POST   /internal/worker/tasks/lease
POST   /internal/worker/tasks/:taskId/heartbeat
POST   /internal/worker/tasks/:taskId/events
POST   /internal/worker/tasks/:taskId/artifacts
POST   /internal/worker/tasks/:taskId/complete
POST   /internal/worker/tasks/:taskId/fail
```

所有内部请求使用：

```text
Authorization: Bearer <MANAGEMENT_WORKER_TOKEN>
```

租约默认 60 秒，Worker 每 20 秒心跳。一次领取一项任务，MVP 单 Worker 并发为 1。

## 状态机命令

| 命令 | 前置状态 | 后置状态 |
| --- | --- | --- |
| `submitDefect` | `DRAFT` | `SUBMITTED` |
| `startAssessment` | `SUBMITTED` / `NEEDS_REVISION` | `ASSESSING` |
| `completeAssessment` | `ASSESSING` | `WAITING_FOR_APPROVAL` |
| `approveContract` | `WAITING_FOR_APPROVAL` | `APPROVED` |
| `rejectContract` | `WAITING_FOR_APPROVAL` | `REJECTED` |
| `requestRevision` | `WAITING_FOR_APPROVAL` | `NEEDS_REVISION` |
| `startImplementation` | `APPROVED` | `EXECUTING` |
| `startVerification` | `EXECUTING` | `VERIFYING` |
| `requireReapproval` | `EXECUTING` / `VERIFYING` | `REAPPROVAL_REQUIRED` |
| `failRun` | `ASSESSING` / `EXECUTING` / `VERIFYING` | `FAILED` |
| `approveRetry` | `FAILED` | `RETRY_APPROVAL` |
| `restartApprovedRun` | `RETRY_APPROVAL` | `APPROVED` |
| `recordPrCreated` | `VERIFYING` | `PR_CREATED` |
| `recordChangesRequested` | `PR_CREATED` | `CHANGES_REQUESTED` |
| `requestChangesRevision` | `CHANGES_REQUESTED` | `WAITING_FOR_APPROVAL` |
| `resolveDefect` | `PR_CREATED` | `RESOLVED` |

`resolveDefect` 还必须验证外部 Change Request 状态为 `MERGED`。

---

## 阶段 1：领域、数据库和认证基础

**阶段目标：** 建立可独立测试的管理领域、共享契约、独立数据库、状态机、审计、Outbox 和单管理员认证，不接入 Worker、Codex 或 GitHub。

### 任务 1.1：创建共享契约包

**文件：**

- 新建：`packages/management-contracts/package.json`
- 新建：`packages/management-contracts/tsconfig.json`
- 新建：`packages/management-contracts/eslint.config.js`
- 新建：`packages/management-contracts/src/index.ts`
- 新建：`packages/management-contracts/src/domain.ts`
- 新建：`packages/management-contracts/src/api.ts`
- 新建：`packages/management-contracts/src/worker.ts`
- 测试：`packages/management-contracts/src/contracts.test.ts`

- [ ] 编写失败测试，覆盖枚举拒绝未知值、验证命令禁止空参数、Worker discriminated union 和 API Problem schema。
- [ ] 运行 `pnpm --filter @repo/management-contracts test`，确认因 workspace 尚不存在而失败。
- [ ] 创建包骨架和 Zod schema，包名固定为 `@repo/management-contracts`。
- [ ] 运行：

```bash
pnpm --filter @repo/management-contracts test
pnpm --filter @repo/management-contracts typecheck
pnpm --filter @repo/management-contracts lint
```

预期：全部通过。

- [ ] 提交：

```bash
git add packages/management-contracts pnpm-lock.yaml
git commit -m "feat(management): add shared control plane contracts"
```

### 任务 1.2：创建管理 API 骨架

**文件：**

- 新建：`apps/management-api/package.json`
- 新建：`apps/management-api/tsconfig.json`
- 新建：`apps/management-api/tsconfig.build.json`
- 新建：`apps/management-api/vitest.config.ts`
- 新建：`apps/management-api/eslint.config.js`
- 新建：`apps/management-api/src/main.ts`
- 新建：`apps/management-api/src/app.module.ts`
- 新建：`apps/management-api/src/common/http/problem-details.filter.ts`
- 新建：`apps/management-api/src/common/http/trace-id.middleware.ts`
- 新建：`apps/management-api/src/common/validation/zod-validation.pipe.ts`
- 测试：对应 `*.test.ts`

- [ ] 先写测试：异常被映射为 `ApiProblem`，未知异常返回 `INTERNAL_ERROR`，请求具有稳定 `traceId`。
- [ ] 创建 NestJS 启动入口，前缀为 `/api`，监听 `127.0.0.1:3100`。
- [ ] 使用共享 Zod schema 校验请求，不复用现有 `apps/api` 的租户响应 envelope。
- [ ] 运行：

```bash
pnpm --filter @repo/management-api test
pnpm --filter @repo/management-api typecheck
pnpm --filter @repo/management-api lint
```

- [ ] 提交：

```bash
git add apps/management-api pnpm-lock.yaml
git commit -m "feat(management): scaffold management api"
```

### 任务 1.3：建立独立 Prisma 数据模型

**文件：**

- 新建：`apps/management-api/prisma/schema.prisma`
- 新建：`apps/management-api/prisma/migrations/<timestamp>_management_initial/migration.sql`
- 新建：`apps/management-api/src/prisma/prisma.module.ts`
- 新建：`apps/management-api/src/prisma/prisma.service.ts`
- 新建：`infra/management/docker-compose.yml`
- 新建：`apps/management-api/.env.example`
- 修改：`.gitignore`

- [ ] 先写数据库集成测试，断言可创建 Repository 和 Defect，`Defect.number` 自增，Outbox `idempotencyKey` 唯一。
- [ ] 创建 PostgreSQL 16 Compose 服务，端口固定为 `5433`，使用命名卷。
- [ ] 实现上文全部数据表、外键、唯一约束和索引。
- [ ] 使用 Prisma migration，不使用 `db:push` 作为正式迁移路径。
- [ ] 运行：

```bash
docker compose -f infra/management/docker-compose.yml up -d
pnpm --filter @repo/management-api prisma:generate
pnpm --filter @repo/management-api prisma:migrate:test
pnpm --filter @repo/management-api test:integration
```

预期：迁移成功，数据库集成测试通过。

- [ ] 提交：

```bash
git add apps/management-api/prisma apps/management-api/src/prisma infra/management .gitignore pnpm-lock.yaml
git commit -m "feat(management): add control plane database schema"
```

### 任务 1.4：实现缺陷状态机、审计和事务性 Outbox

**文件：**

- 新建：`apps/management-api/src/defects/defect-state-machine.ts`
- 新建：`apps/management-api/src/defects/defects.service.ts`
- 新建：`apps/management-api/src/defects/defects.controller.ts`
- 新建：`apps/management-api/src/defects/defects.module.ts`
- 新建：`apps/management-api/src/audit/audit.service.ts`
- 新建：`apps/management-api/src/outbox/outbox.service.ts`
- 测试：状态机单元测试和事务集成测试

- [ ] 先写状态机参数化测试，覆盖上文合法迁移表，并逐项断言非法迁移抛出 `INVALID_DEFECT_TRANSITION`。
- [ ] 先写事务测试：提交缺陷时 `Defect.status`、`AuditEvent`、`OutboxTask` 同时成功；强制 Outbox 写入失败时三者全部回滚。
- [ ] 实现显式命令方法，不提供通用 `setStatus`。
- [ ] 使用 `version` 条件更新实现乐观锁，冲突返回 `DEFECT_VERSION_CONFLICT`。
- [ ] 实现缺陷 CRUD、提交和查询 API。
- [ ] 运行：

```bash
pnpm --filter @repo/management-api test
pnpm --filter @repo/management-api test:integration
```

- [ ] 提交：

```bash
git add apps/management-api/src/defects apps/management-api/src/audit apps/management-api/src/outbox
git commit -m "feat(management): add defect workflow and transactional outbox"
```

### 任务 1.5：实现单管理员认证

**文件：**

- 新建：`apps/management-api/src/auth/auth.module.ts`
- 新建：`apps/management-api/src/auth/auth.controller.ts`
- 新建：`apps/management-api/src/auth/session.service.ts`
- 新建：`apps/management-api/src/auth/session.guard.ts`
- 新建：`apps/management-api/src/auth/origin.guard.ts`
- 新建：`apps/management-api/src/auth/login-rate-limiter.ts`
- 修改：`apps/management-api/.env.example`
- 测试：认证、Cookie、Origin 和限流测试

环境变量固定为：

```env
MANAGEMENT_ADMIN_USERNAME=admin
MANAGEMENT_ADMIN_PASSWORD_SCRYPT=
MANAGEMENT_SESSION_SECRET=
MANAGEMENT_ALLOWED_ORIGIN=http://127.0.0.1:3101
MANAGEMENT_WORKER_TOKEN=
```

- [ ] 先写测试：错误密码返回 401；五次失败后返回 429；Cookie 属性正确；过期或篡改会话被拒绝；写操作 Origin 不匹配返回 403。
- [ ] 使用 Node `crypto.scrypt` 验证密码哈希，使用 `timingSafeEqual` 比较摘要和 Worker Token。
- [ ] 会话有效期固定 8 小时，不实现刷新令牌。
- [ ] 为除登录和内部 Worker 路径外的 API 加会话 Guard。
- [ ] 运行：

```bash
pnpm --filter @repo/management-api test -- auth
pnpm --filter @repo/management-api typecheck
```

- [ ] 提交：

```bash
git add apps/management-api/src/auth apps/management-api/.env.example
git commit -m "feat(management): add single administrator authentication"
```

### 阶段 1 验收

- [ ] 运行：

```bash
pnpm --filter @repo/management-contracts lint
pnpm --filter @repo/management-contracts typecheck
pnpm --filter @repo/management-contracts test
pnpm --filter @repo/management-api lint
pnpm --filter @repo/management-api typecheck
pnpm --filter @repo/management-api test
pnpm --filter @repo/management-api test:integration
pnpm --filter @repo/management-api build
```

- [ ] 人工检查：未引入 Agent、GitHub、部署或现有产品 API 改动。

---

## 阶段 2：Worker 协议与 Fake 闭环

**阶段目标：** 在不运行 Codex、不访问 GitHub 的前提下，完成可靠任务租约、Fake Agent/SCM、Artifact、运行事件和完整后端假执行闭环。

### 任务 2.1：实现 Worker 内部租约 API

**文件：**

- 新建：`apps/management-api/src/worker/worker.module.ts`
- 新建：`apps/management-api/src/worker/worker.controller.ts`
- 新建：`apps/management-api/src/worker/task-lease.service.ts`
- 新建：`apps/management-api/src/worker/worker-token.guard.ts`
- 测试：租约并发、心跳、过期接管和幂等测试

- [ ] 先写 PostgreSQL 集成测试，两个并发领取者只能拿到一个任务。
- [ ] 使用事务和 `FOR UPDATE SKIP LOCKED` 领取 `availableAt <= now()` 的任务。
- [ ] 租约 60 秒、心跳 20 秒；过期任务允许重新领取，但原租约持有者后续写入被拒绝。
- [ ] 完成和失败端点必须校验 `taskId + leaseOwner`。
- [ ] 最大重试次数默认 3；超过后进入 `DEAD` 并写审计事件。
- [ ] 运行 Worker API 集成测试并提交。

### 任务 2.2：创建 Worker 骨架和 API Client

**文件：**

- 新建：`apps/management-worker/package.json`
- 新建：`apps/management-worker/tsconfig.json`
- 新建：`apps/management-worker/vitest.config.ts`
- 新建：`apps/management-worker/src/main.ts`
- 新建：`apps/management-worker/src/config.ts`
- 新建：`apps/management-worker/src/api/management-api-client.ts`
- 新建：`apps/management-worker/src/worker-loop.ts`
- 测试：轮询、心跳、取消和关停测试

环境变量：

```env
MANAGEMENT_API_URL=http://127.0.0.1:3100
MANAGEMENT_WORKER_TOKEN=
MANAGEMENT_WORKER_ID=local-worker
MANAGEMENT_POLL_INTERVAL_MS=2000
```

- [ ] 先写 Fake API Client 测试，确认 Worker 单并发领取、任务期间持续心跳、SIGTERM 停止领取新任务。
- [ ] 实现 `WorkerLoop`，任务处理错误必须回写失败，不能导致进程永久退出。
- [ ] 运行 Worker lint、typecheck、test 和 build。
- [ ] 提交 Worker 骨架。

### 任务 2.3：实现 ArtifactStore 和日志脱敏

**文件：**

- 新建：`apps/management-api/src/artifacts/artifact-store.ts`
- 新建：`apps/management-api/src/artifacts/local-artifact-store.ts`
- 新建：`apps/management-api/src/artifacts/artifacts.controller.ts`
- 新建：`apps/management-api/src/artifacts/artifacts.service.ts`
- 新建：`apps/management-api/src/security/redaction.ts`
- 测试：路径、摘要、下载授权和脱敏测试

环境变量：

```env
MANAGEMENT_ARTIFACT_ROOT=.management/artifacts
MANAGEMENT_ARTIFACT_RETENTION_DAYS=90
```

- [ ] 先写测试：拒绝路径穿越；上传后 SHA-256 和大小匹配；未登录不能下载；日志中的 API Key、Bearer Token、GitHub Token 被替换为 `[REDACTED]`。
- [ ] Worker 通过 multipart 内部 API 上传 Artifact，API 决定最终文件名和路径。
- [ ] 文件写入临时路径，完成摘要校验后原子 rename。
- [ ] 下载时只使用 Artifact ID，不能接受客户端提供文件路径。
- [ ] 提交 Artifact 和脱敏实现。

### 任务 2.4：实现 Fake Agent 和 Fake SCM

**文件：**

- 新建：`apps/management-worker/src/agents/agent-runner.ts`
- 新建：`apps/management-worker/src/agents/fake-agent-runner.ts`
- 新建：`apps/management-worker/src/scm/scm-provider.ts`
- 新建：`apps/management-worker/src/scm/fake-scm-provider.ts`
- 新建：`apps/management-worker/src/tasks/task-handler.ts`
- 测试：Agent/SCM 契约测试

- [ ] 创建复用契约测试套件，任何 `AgentRunner` 都必须通过事件顺序、取消、失败和终态测试。
- [ ] 创建 SCM 契约测试套件，覆盖重复创建分支、重复发布和重复创建 Change Request。
- [ ] `FakeAgentRunner` 从任务 fixture 返回固定评估或固定变更。
- [ ] `FakeScmProvider` 返回 `https://example.invalid/pull/1`，但保持幂等。
- [ ] Worker 按 `WorkerTask.type` 分发，不使用 `switch` 之外的动态任意命令执行。
- [ ] 提交 Fake 适配器。

### 任务 2.5：打通完整后端 Fake 流程

**文件：**

- 修改：缺陷、评估、合同、审批、运行和代码变更模块
- 测试：`apps/management-api/test/fake-workflow.integration.test.ts`
- 测试：`apps/management-worker/src/tasks/fake-workflow.test.ts`

- [ ] 先写失败集成测试：提交缺陷后生成评估任务；Fake Worker 完成后产生 Assessment 和合同草案；批准后产生实现任务；Fake 实现完成后产生 CodeChange 和 `PR_CREATED`。
- [ ] 评估输出使用 Zod schema 验证，格式错误进入 `FAILED`。
- [ ] 批准合同前计算规范化 JSON SHA-256；批准后禁止更新。
- [ ] 重试创建新 `AgentRun`，历史运行保持不变。
- [ ] 运行 API/Worker 全部测试并提交。

### 阶段 2 验收

```bash
pnpm --filter @repo/management-api test
pnpm --filter @repo/management-api test:integration
pnpm --filter @repo/management-worker test
pnpm --filter @repo/management-worker typecheck
pnpm --filter @repo/management-worker build
```

人工确认：没有调用真实 Codex、GitHub 或 Docker Agent 容器。

---

## 阶段 3：管理 Web 与 Mock E2E

**阶段目标：** 使用 Fake Agent/SCM 提供完整可操作 UI，验证缺陷、审批、运行证据和最终确认流程。

### 任务 3.1：创建管理 Web 骨架

**文件：**

- 新建：`apps/management-web/package.json`
- 新建：Vite、Vitest、TypeScript、ESLint 和 Tailwind 配置
- 新建：`apps/management-web/src/main.tsx`
- 新建：`apps/management-web/src/root-app.tsx`
- 新建：`apps/management-web/src/lib/api-client.ts`
- 新建：`apps/management-web/src/i18n/**`
- 新建：管理 Web 本地 shadcn 组件

- [ ] 先写 Router 和 API Client 测试。
- [ ] 使用 TanStack Router 代码式路由，使用 TanStack Query 管理远程状态。
- [ ] 本地端口固定为 `3101`，开发代理 `/api` 到 `3100`。
- [ ] Provider 顺序固定为 Theme → I18n → QueryClient → Router。
- [ ] 用户可见文案同时维护 `zh-CN` 和 `en-US`。
- [ ] 运行 Web lint、typecheck、test 和 build 后提交。

### 任务 3.2：实现登录与应用壳层

**文件：**

- 新建：`src/features/auth/**`
- 新建：`src/components/layout/**`
- 新建：对应中英文资源和测试

- [ ] 登录表单使用 React Hook Form、Zod、Field 和 Input。
- [ ] API Client 设置 `credentials: "include"`，不在 localStorage 保存密码或会话。
- [ ] 未认证访问业务路由跳转 `/login`。
- [ ] 应用壳层包含缺陷导航、语言切换和退出。
- [ ] 测试登录成功、失败、会话过期和退出。

### 任务 3.3：实现缺陷列表、录入与详情

**文件：**

- 新建：`src/features/defects/defect-list-page.tsx`
- 新建：`src/features/defects/defect-create-page.tsx`
- 新建：`src/features/defects/defect-detail-page.tsx`
- 新建：contract、service、queries、components 和测试

- [ ] 缺陷表单包含标题、描述、复现步骤、期望行为、严重级别、影响和备注。
- [ ] 草稿可编辑；提交后基础描述只读，后续变化通过审计记录表达。
- [ ] 列表支持搜索、状态、严重级别和分页。
- [ ] 详情页使用时间线展示状态、评估、审批、运行和 PR。
- [ ] 活动运行每 2 秒轮询，终态停止轮询。

### 任务 3.4：实现评估和执行合同审批

**文件：**

- 新建：`src/features/contracts/**`
- 新建：评估、合同、审批组件和测试

- [ ] 展示根因假设、证据、风险、建议方案、备选方案和非目标。
- [ ] 合同编辑器分别编辑目标、成功标准、读路径、写路径、验证命令和禁止事项。
- [ ] 验证命令使用结构化表单，不能输入任意 shell 字符串。
- [ ] 审批确认对话框展示合同版本、Hash 和基线 Commit。
- [ ] 已批准合同全部字段只读。

### 任务 3.5：实现运行、证据和 PR 页面

**文件：**

- 新建：`src/features/runs/**`
- 新建：`src/features/code-changes/**`
- 新建：日志、证据、Artifact 下载和审计组件

- [ ] 按 sequence 展示结构化 Agent 事件。
- [ ] 命令证据展示命令参数、cwd、耗时、退出码和状态。
- [ ] Artifact 通过认证下载端点打开。
- [ ] PR 卡片显示分支、Commit、Draft 状态和外部链接。
- [ ] 只有 PR 状态为 `MERGED` 时显示“确认解决”动作。

### 任务 3.6：创建管理 E2E

**文件：**

- 新建：`apps/management-e2e/package.json`
- 新建：`apps/management-e2e/playwright.config.ts`
- 新建：`apps/management-e2e/pages/**`
- 新建：`apps/management-e2e/tests/defect-workflow.spec.ts`

- [ ] E2E 使用独立测试数据库，并启动 API、Fake Worker 和 Web。
- [ ] 覆盖登录、录入、提交、评估、合同修改、批准、运行、证据和 Draft PR 展示。
- [ ] 覆盖非法越权按钮不可见和未登录跳转。
- [ ] 选择器优先 `getByRole` 和稳定文案，不依赖 Tailwind 类名。

### 阶段 3 验收

```bash
pnpm --filter @repo/management-web lint
pnpm --filter @repo/management-web typecheck
pnpm --filter @repo/management-web test
pnpm --filter @repo/management-web build
pnpm --filter @repo/management-e2e test:e2e
```

---

## 阶段 4：Codex CLI 与隔离验证

> **人工审批门：** 开始前必须明确批准 Docker socket 使用、专用 `OPENAI_API_KEY` 注入、模型名称和允许访问的模型 API 域名。

**阶段目标：** 在一次性 Docker 容器中运行 Codex CLI，完成只读评估、受限修复、实际 diff 校验和平台独立验证。

### 任务 4.1：实现 WorkspaceManager

**文件：**

- 新建：`apps/management-worker/src/workspace/workspace-manager.ts`
- 新建：`apps/management-worker/src/workspace/dependency-preparer.ts`
- 新建：`apps/management-worker/src/git/git-client.ts`
- 新建：`apps/management-worker/src/process/process-runner.ts`
- 测试：fixture 仓库集成测试

环境变量：

```env
MANAGEMENT_WORKSPACE_ROOT=.management/workspaces
MANAGEMENT_WORKSPACE_RETENTION_DAYS=7
```

- [ ] 使用参数数组执行 Git，不通过 shell。
- [ ] 每次运行创建 `<root>/<runId>`，检出合同 `baseCommit`。
- [ ] 成功后立即删除工作区；失败工作区保留 7 天。
- [ ] 拒绝符号链接逃逸、子模块和工作区外路径。
- [ ] 合同 `policy.allowDependencyInstall` 为 `true` 时，使用无 OpenAI/GitHub/Worker 凭据的独立准备容器执行固定命令 `pnpm install --frozen-lockfile --ignore-scripts`。
- [ ] MVP 不允许依赖安装脚本；需要 lifecycle script 的任务必须停止并重新审批，不得改成任意 shell 命令。
- [ ] 实现定期清理，并写审计事件。

### 任务 4.2：创建固定版本 Codex Agent 镜像

**文件：**

- 新建：`apps/management-worker/docker/codex-agent.Dockerfile`
- 新建：`apps/management-worker/docker/entrypoint.sh`
- 新建：`apps/management-worker/src/agents/codex/assessment-output.schema.json`
- 新建：`apps/management-worker/src/agents/codex/implementation-output.schema.json`
- 新建：`infra/management/agent-egress/squid.conf`
- 修改：`infra/management/docker-compose.yml`

- [ ] 基础镜像固定 Node 和 Codex CLI 版本，不使用 `latest`。
- [ ] 容器使用非 root 用户、只读根文件系统、禁用额外 Linux capabilities。
- [ ] 不挂载开发者 `CODEX_HOME`。
- [ ] Entrypoint 使用专用 `OPENAI_API_KEY` 初始化临时 Codex Home。
- [ ] Compose 增加只允许 `CONNECT api.openai.com:443` 的 Squid egress proxy；Agent 容器加入内部网络并通过 `HTTPS_PROXY` 访问模型 API，不能直接访问宿主机或公网。
- [ ] 依赖准备容器使用独立网络策略，且环境中不包含 OpenAI、GitHub 或 Worker 凭据。
- [ ] Codex 调用固定包含：

```text
codex exec
--ephemeral
--ignore-user-config
--strict-config
--json
--output-schema <schema>
--cd /workspace
-c approval_policy="never"
-m <CODEX_MODEL>
```

- [ ] 评估使用 `--sandbox read-only`；实现使用外部容器隔离并采用 `workspace-write`。

### 任务 4.3：实现 `CodexCliRunner`

**文件：**

- 新建：`apps/management-worker/src/agents/codex/codex-cli-runner.ts`
- 新建：`apps/management-worker/src/agents/codex/codex-event-parser.ts`
- 新建：`apps/management-worker/src/agents/codex/prompt-builder.ts`
- 测试：使用假 Codex 可执行文件的契约测试

- [ ] Prompt 分为系统规则、执行合同和不可信缺陷/仓库上下文，使用明确边界标签。
- [ ] JSONL 逐行解析并映射为统一 `AgentEvent`。
- [ ] 最终 JSON 必须通过 output schema；自然语言总结不作为成功条件。
- [ ] 支持超时、取消、异常退出和残缺 JSONL。
- [ ] 记录 Codex CLI 版本、模型和 usage；日志先脱敏再上传。

### 任务 4.4：实现路径策略和独立验证

**文件：**

- 新建：`apps/management-worker/src/policy/path-policy.ts`
- 新建：`apps/management-worker/src/policy/change-policy.ts`
- 新建：`apps/management-worker/src/verification/verification-runner.ts`
- 测试：越界、删除、重命名、符号链接和命令注入测试

- [ ] 使用 `git diff --name-status -z <baseCommit>` 获取实际变更。
- [ ] 所有变更路径必须匹配合同 `writePaths`。
- [ ] 删除、重命名、依赖文件、CI 文件和配置文件默认拒绝，除非合同策略显式允许。
- [ ] 发现越界时进入 `REAPPROVAL_REQUIRED`，不创建 Commit 或 PR。
- [ ] 平台重新执行全部验证命令，Agent 自报结果只作为辅助证据。
- [ ] 每条命令保存 stdout、stderr、退出码、耗时和 Artifact 摘要。

### 阶段 4 验收

```bash
pnpm --filter @repo/management-worker test
pnpm --filter @repo/management-worker test:integration
pnpm --filter @repo/management-worker typecheck
pnpm --filter @repo/management-worker build
docker build -f apps/management-worker/docker/codex-agent.Dockerfile .
```

人工验收使用本地 fixture 仓库和受控缺陷，不访问 GitHub。

---

## 阶段 5：GitHub Provider 与 Draft PR

> **人工审批门：** 开始前必须提供专用 GitHub 沙箱仓库和 fine-grained PAT。权限仅允许 Metadata 读、Contents 写、Pull Requests 写。

**阶段目标：** 把已通过平台独立验证的 Commit 幂等推送到 GitHub，并创建 Draft PR。

### 任务 5.1：实现 Git 发布工作流

**文件：**

- 新建：`apps/management-worker/src/git/publish-branch.ts`
- 新建：`apps/management-worker/src/git/commit-message.ts`
- 测试：本地 bare Git 仓库集成测试

- [ ] 分支名固定为 `ai-fix/defect-<number>-run-<short-id>`。
- [ ] Commit message 固定为 `fix(management): address DEF-<number>`.
- [ ] Worker 创建 Commit；Agent 不持有 Git 身份或远程凭据。
- [ ] 推送前再次确认 baseCommit、diff 和验证摘要未变化。
- [ ] 重复发布相同 run 必须复用已有 Commit。

### 任务 5.2：实现 `GitHubProvider`

**文件：**

- 新建：`apps/management-worker/src/scm/github/github-provider.ts`
- 新建：`apps/management-worker/src/scm/github/github-client.ts`
- 新建：`apps/management-worker/src/scm/github/github-mappers.ts`
- 测试：Mock HTTP 契约测试

环境变量：

```env
MANAGEMENT_GITHUB_TOKEN=
MANAGEMENT_GITHUB_OWNER=
MANAGEMENT_GITHUB_REPOSITORY=
```

- [ ] 使用 GitHub REST API，不调用交互式浏览器流程。
- [ ] 所有请求设置固定 User-Agent、超时和有限指数退避。
- [ ] 对 401/403、404、409、422 和限流分别映射稳定错误码。
- [ ] 不在日志中记录 Authorization Header 或带凭据的 clone URL。
- [ ] 通过通用 `ScmProvider` 契约测试。

### 任务 5.3：创建幂等 Draft PR

**文件：**

- 修改：代码变更服务、Worker 发布任务和 UI PR 卡片
- 测试：重复任务、API 超时和 PR 已存在测试

PR 标题：

```text
[AI Fix] DEF-<number>: <defect title>
```

PR Body 固定包含：

- Defect 编号与目标。
- 执行合同版本、Hash 和基线 Commit。
- 变更文件摘要。
- 平台独立验证结果。
- Agent、模型、Run ID。
- “需要人工评审，禁止自动合并”声明。

- [ ] 先按 head branch 查询现有 PR，再尝试创建。
- [ ] API 超时后重试必须先查询，避免重复 PR。
- [ ] PR 始终以 Draft 创建。
- [ ] 平台不提供 merge API。

### 任务 5.4：实现 PR 状态同步和最终确认

- [ ] `SYNC_CHANGE_REQUEST` 定时任务每 60 秒同步活动 PR。
- [ ] 状态映射为 `DRAFT`、`OPEN`、`CHANGES_REQUESTED`、`MERGED`、`CLOSED`。
- [ ] `MERGED` 只使“确认解决”可用，不自动进入 `RESOLVED`。
- [ ] 管理员最终确认后写入审计事件并进入 `RESOLVED`。
- [ ] `CHANGES_REQUESTED` 进入缺陷返工路径，必须重新审批新合同版本。

### 阶段 5 验收

```bash
pnpm --filter @repo/management-worker test
pnpm --filter @repo/management-worker test:integration
pnpm --filter @repo/management-api test
pnpm --filter @repo/management-web test
```

人工验收先使用 Mock GitHub API，再在沙箱仓库创建一个 Draft PR。

---

## 阶段 6：真实验收、CI 和治理回写

> **人工审批门：** 真实 Codex/GitHub 验收只允许在专用沙箱仓库运行。不得使用生产仓库、生产凭据或主分支写权限。

### 任务 6.1：新增统一本地验证脚本

修改根 `package.json`：

```json
{
  "scripts": {
    "dev:management": "turbo dev --filter=@repo/management-web --filter=@repo/management-api --filter=@repo/management-worker",
    "verify:management": "pnpm --filter @repo/management-contracts lint && pnpm --filter @repo/management-contracts typecheck && pnpm --filter @repo/management-contracts test && pnpm --filter @repo/management-api lint && pnpm --filter @repo/management-api typecheck && pnpm --filter @repo/management-api test && pnpm --filter @repo/management-worker lint && pnpm --filter @repo/management-worker typecheck && pnpm --filter @repo/management-worker test && pnpm --filter @repo/management-web lint && pnpm --filter @repo/management-web typecheck && pnpm --filter @repo/management-web test && pnpm --filter @repo/management-e2e test:e2e && pnpm --filter @repo/management-contracts build && pnpm --filter @repo/management-api build && pnpm --filter @repo/management-worker build && pnpm --filter @repo/management-web build"
  }
}
```

- [ ] 确保所有 workspace 的 `build`、`lint`、`typecheck`、`test` 脚本进入 Turbo 现有任务图。
- [ ] `verify:management` 默认只使用 Fake Agent/SCM，不需要真实秘密。

### 任务 6.2：扩展 GitLab CI

**文件：**

- 修改：`.gitlab-ci.yml`

- [ ] 增加 PostgreSQL 16 service 和管理测试数据库变量。
- [ ] 新增 `validate:management` job，执行 migration 和 `pnpm verify:management`。
- [ ] 保留现有 `validate:workspace` 行为，不把真实 Codex/GitHub 凭据放入普通 CI。
- [ ] 保留 Playwright 报告和管理 E2E 报告 Artifact。

### 任务 6.3：真实沙箱端到端验收

新增手工命令：

```text
pnpm --filter @repo/management-e2e test:e2e:real
```

运行前必须显式提供：

```env
MANAGEMENT_REAL_E2E=true
OPENAI_API_KEY=
CODEX_MODEL=
MANAGEMENT_GITHUB_TOKEN=
MANAGEMENT_GITHUB_OWNER=
MANAGEMENT_GITHUB_REPOSITORY=
```

- [ ] 测试拒绝在未设置 `MANAGEMENT_REAL_E2E=true` 时启动。
- [ ] 沙箱仓库准备一个稳定、可复现、测试可验证的缺陷。
- [ ] 完成录入、评估、审批、修复、验证和 Draft PR 创建。
- [ ] 人工检查 PR diff、证据、审计、凭据脱敏和禁止自动合并。
- [ ] 测试结束关闭 PR 和删除测试分支，但保留控制面审计记录。

### 任务 6.4：安全与恢复验证

- [ ] 模拟 Worker 崩溃，确认租约过期后可接管且不重复 PR。
- [ ] 模拟 GitHub API 创建 PR 超时，确认幂等查询复用已有 PR。
- [ ] 模拟路径越界、符号链接、删除和 CI 文件修改，确认中止并重新审批。
- [ ] 模拟 Codex 超时、无效 JSONL、错误 output schema 和测试失败。
- [ ] 验证 Artifact 清理、失败工作区 7 天保留和日志脱敏。
- [ ] 备份并恢复管理数据库与 Artifact 目录，确认审计和下载引用仍有效。

### 任务 6.5：回写治理文档

**文件：**

- 新建：`docs/adr/0005-ai-management-control-plane.md`
- 新建：`docs/ai/runbooks/management-control-plane-runbook.md`
- 新建：`docs/ai/runbooks/management-worker-security-runbook.md`
- 修改：`docs/adr/README.md`
- 修改：`docs/ai/context-index.md`
- 修改：`docs/ai/README.md`
- 修改：`AGENTS.md`

ADR 必须记录：

- PostgreSQL 是管理业务事实源。
- API 独占数据库访问。
- `AgentRunner` 和 `ScmProvider` 可插拔边界。
- AI 只执行已批准合同。
- “自进化”只能提出版本化改进建议。
- 自动合并和部署仍被明确拒绝。

Runbook 必须记录：

- 本地启动、迁移、备份和恢复。
- 管理员密码哈希生成和轮换。
- Worker Token、OpenAI Key、GitHub PAT 轮换。
- 租约卡死、Artifact 清理、失败任务和 PR 幂等排障。
- 紧急停止 Worker 和撤销凭据。

### 阶段 6 最终验证

```bash
pnpm verify:management
pnpm lint
pnpm typecheck
pnpm build
git diff --check
git status --short
```

现有产品 E2E 是否运行由人工根据改动范围确认；管理控制面不得改变现有产品路由和行为。

---

## 验收场景清单

### 正常流程

- [ ] 管理员登录。
- [ ] 创建并提交缺陷。
- [ ] 只读 Agent 完成评估。
- [ ] 管理员修改并批准合同。
- [ ] Worker 在隔离容器中执行修复。
- [ ] 平台独立验证通过。
- [ ] GitHub 创建唯一 Draft PR。
- [ ] PR 合并后管理员确认解决。

### 审批边界

- [ ] 未批准合同不能创建实现任务。
- [ ] 已批准合同不能修改。
- [ ] 合同变更创建新版本并重新审批。
- [ ] 基线 Commit 漂移进入重新审批。
- [ ] 越界修改进入重新审批且不创建 PR。

### 可靠性

- [ ] 重复 Outbox 投递不产生重复副作用。
- [ ] Worker 租约过期可接管。
- [ ] 旧租约持有者不能覆盖新运行结果。
- [ ] SCM 重试不重复运行 Agent。
- [ ] PR 创建超时不产生重复 PR。

### 安全

- [ ] Agent 无 GitHub PAT、主分支权限或生产凭据。
- [ ] 评估工作区只读。
- [ ] 命令执行不经过 shell。
- [ ] 路径穿越、符号链接和子模块被拒绝。
- [ ] 日志和 Artifact 不暴露 OpenAI Key、Worker Token 或 GitHub PAT。
- [ ] 未认证用户不能读取缺陷、日志或 Artifact。

## 明确延后

- `ClaudeCodeCliRunner`：在 MVP 稳定后单独建立 L2/L3 计划，只实现新 Runner 和契约测试。
- 多用户与 RBAC：在多人使用前单独设计身份、角色、审批职责分离和审计。
- 需求管理：复用缺陷闭环经验，但单独定义需求状态机。
- 发布、部署、回滚和通知：必须独立 L3 spec，不复用 Worker 的仓库凭据作为部署凭据。
- 规则改进实验：先积累运行数据，再设计提案、试验、指标和回滚模型。

## 完成定义

只有同时满足以下条件，MVP 才能称为完成：

- 六个阶段均通过各自验证和人工审批门。
- Fake E2E 稳定通过。
- 真实沙箱仓库成功创建一个可审阅 Draft PR。
- 没有自动合并、部署或生产访问能力。
- 所有运行、审批、证据和外部代码变更可追溯。
- Codex 和 GitHub 均通过适配接口接入，领域层不依赖专有输出。
- 文档、ADR、runbook、AGENTS 和上下文索引已同步更新。
