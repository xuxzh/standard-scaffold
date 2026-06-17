# AI Bug 自动修复与 Staging 发布 MVP 实施计划

> **面向 Agent 执行者：** 必须使用 `subagent-driven-development`（推荐）或 `executing-plans` 按任务逐项实施。步骤使用复选框 `- [ ]` 跟踪。本计划为 `L3`：实现、CI、GitHub 权限、部署凭据和 staging 环境变更都必须按切片获得明确人工批准。

**目标：** 新增一个仅本机运行的单管理员应用，支持当前仓库的一条缺陷从人工录入、AI 评估、人工批准修复、隔离验证、PR 合并、staging 部署、Smoke 检查到人工验收的闭环。

**架构：** 新增 `apps/ai-manager` 作为本地单体 Node 全栈应用，包含 React UI、服务端领域命令、Prisma SQLite 持久化和进程内任务循环。Codex、GitHub、Git worktree、本机验证和部署相关能力都通过适配器隔离，领域状态机不依赖页面、Codex 或 GitHub 实现。

**技术栈：** pnpm、Turborepo、TypeScript、React、TanStack Start 技术探针（失败时回退到 Vite React + Fastify）、Prisma SQLite、Vitest、Playwright、Codex CLI、Git worktree、GitHub Actions、GHCR、Docker Compose。

---

## L3 执行门禁

- 本计划实现 `docs/specs/2026-06-15/ai-bug-repair-staging-mvp-design.md`。
- 不得在 `main` 或 `master` 上实施。本计划落盘时工作区处于 detached `HEAD`；进入实现前必须先创建独立分支或 `.worktrees/ai-bug-repair-staging-mvp`。
- 仓库内实施命令默认使用本机 `rtk` 前缀。
- 每个任务切片完成后必须单独人工复核，再进入下一切片。
- 不实现 `L3` Bug 的自动修复；`L3` 必须进入 `MANUAL_HANDOFF`。
- 自动修复不得修改 `apps/ai-manager`、依赖 manifest、lockfile、Prisma schema/migration/seed、CI workflow、部署文件、凭据、`AGENTS.md`、ADR、spec、plan、领域上下文、持久化格式、缓存格式、消息格式或外部契约。
- 本计划文档不是配置 GitHub 权限、GHCR、staging secrets、部署 runner 或 staging 服务器的授权。

## 文件与职责

### 新增 workspace

- `apps/ai-manager/package.json`：本地应用脚本和依赖。
- `apps/ai-manager/vite.config.ts` 或 TanStack Start 等价配置：本地开发与构建配置。
- `apps/ai-manager/tsconfig.json`、`apps/ai-manager/eslint.config.js`、`apps/ai-manager/vitest.config.ts`：workspace 验证配置。
- `apps/ai-manager/prisma/schema.prisma`：仅用于 AI Manager 状态的 SQLite 持久化。
- `apps/ai-manager/src/ui/*`：Bug、RepairPlan、Run、PR/CI/Deployment 状态和 Bug 验收页面。
- `apps/ai-manager/src/server/domain/*`：状态机、命令处理、自动化资格、自动化禁区检查和领域错误。
- `apps/ai-manager/src/server/persistence/*`：Prisma repository 和启动恢复逻辑。
- `apps/ai-manager/src/server/tasks/*`：单进程任务循环、任务租约、取消、心跳和中断处理。
- `apps/ai-manager/src/server/repository/*`：Git 仓库、worktree、分支、diff、commit 和清理服务。
- `apps/ai-manager/src/server/agent/*`：Codex CLI runner、JSON Schema 解析、超时处理和日志脱敏。
- `apps/ai-manager/src/server/validation/*`：结构化验证命令白名单与执行。
- `apps/ai-manager/src/server/github/*`：`gh` 或 GitHub 适配器，用于 PR 创建、状态轮询、精确 head SHA 合并授权和自动合并。
- `apps/ai-manager/src/server/deployment/*`：staging workflow 结果同步模型和本地部署记录。
- `apps/ai-manager/src/test/*`：测试辅助、假适配器、临时仓库工具和 fixture builder。

### 实施期间预期修改的既有文件

- `package.json`：新增 `dev:ai-manager`、`verify:ai-manager`，并在 AI Manager 存在后纳入根验证基线。
- `turbo.json`：如新增任务名，则补充 AI Manager 相关缓存行为。
- `pnpm-lock.yaml`：安装 AI Manager 依赖时更新。
- `apps/web-e2e/playwright.config.ts`：新增耗时受控的 staging smoke project 或 grep/tag 路径。
- `apps/web-e2e/tests/*`：新增 staging 核心可用性 smoke 覆盖。
- `.github/workflows/*`：仅在 GitHub 与 staging 切片获得明确人工批准后，新增 CI、镜像构建和 staging 部署 workflow。
- `docs/ai/context-index.md`、`docs/contexts/ai-defect-delivery/CONTEXT.md`、`CONTEXT-MAP.md` 和 staging runbook：仅在对应切片完成并复核后更新。

## 任务 0：实施工作区与基线确认

**文件：**

- 读取：`docs/specs/2026-06-15/ai-bug-repair-staging-mvp-design.md`
- 读取：`docs/contexts/ai-defect-delivery/CONTEXT.md`
- 读取：`docs/ai/ai-development-governance.md`
- 修改：无

- [ ] **步骤 1：确认当前分支和工作区状态**

运行：

```bash
rtk git status --short --branch
```

预期：不在 `main` 或 `master`，且没有无关脏文件。如存在脏文件，停止并询问人工负责人是创建独立 worktree 还是基于当前变更继续。

- [ ] **步骤 2：创建实施分支或 worktree**

推荐实施工作区：

```bash
rtk git worktree add .worktrees/ai-bug-repair-staging-mvp -b codex-ai-bug-repair-staging-mvp HEAD
```

预期：在 `.worktrees/ai-bug-repair-staging-mvp` 下创建隔离 worktree。

- [ ] **步骤 3：记录任务级别和批准边界**

任何代码 patch 前，在任务记录中写明：

```text
Task level: L3.
AI boundary: may implement only the currently approved slice.
Human boundary: CI permissions, GitHub auto-merge settings, GHCR, staging runner, staging server, deployment credentials, and any production-adjacent operation remain human controlled.
```

## 任务 1：本地全栈形态技术探针

**文件：**

- 新建：`apps/ai-manager/package.json`
- 新建：`apps/ai-manager/tsconfig.json`
- 新建：`apps/ai-manager/vitest.config.ts`
- 新建：`apps/ai-manager/prisma/schema.prisma`
- 新建：`apps/ai-manager/src/server/probe/task-loop.ts`
- 新建：`apps/ai-manager/src/server/probe/task-loop.test.ts`
- 修改：`pnpm-lock.yaml`

- [ ] **步骤 1：新增最小 AI Manager workspace**

创建 `apps/ai-manager/package.json`，包含 `dev`、`build`、`lint`、`typecheck`、`test`、`prisma:generate` 和 `db:push` 脚本。依赖使用 `@repo/eslint-config`、`@repo/typescript-config`、`typescript`、Vite 或 TanStack Start、`vitest`、`prisma`、`@prisma/client`、`react` 和 `react-dom`。

- [ ] **步骤 2：验证 Prisma SQLite**

创建最小 Prisma schema，包含 `ProbeTask` 模型：`id`、`status`、`heartbeatAt`、`createdAt`、`updatedAt`。

- [ ] **步骤 3：验证单进程任务循环**

实现最小任务循环：认领一条 queued task，写入 heartbeat，完成任务，并在启动恢复时将 running task 标记为 `INTERRUPTED`。

- [ ] **步骤 4：验证技术探针**

运行：

```bash
rtk pnpm --filter @repo/ai-manager prisma:generate
rtk pnpm --filter @repo/ai-manager test
rtk pnpm --filter @repo/ai-manager typecheck
```

预期：全部通过。

- [ ] **步骤 5：确定应用形态**

只有在 TanStack Start 能稳定支持服务端 route、Prisma 访问和同一 Node 进程内后台 loop，且不需要不稳定 workaround 时，才保留 TanStack Start。否则保持 `apps/ai-manager` workspace 不变，改用 Vite React UI + Fastify server，由一个本地 Node 入口启动。

## 任务 2：领域模型、持久化与状态机

**文件：**

- 修改：`apps/ai-manager/prisma/schema.prisma`
- 新建：`apps/ai-manager/src/server/domain/bug-status.ts`
- 新建：`apps/ai-manager/src/server/domain/repair-plan-schema.ts`
- 新建：`apps/ai-manager/src/server/domain/automation-policy.ts`
- 新建：`apps/ai-manager/src/server/domain/bug-commands.ts`
- 新建：`apps/ai-manager/src/server/domain/bug-commands.test.ts`
- 新建：`apps/ai-manager/src/server/persistence/repositories.ts`
- 新建：`apps/ai-manager/src/server/persistence/startup-recovery.ts`
- 新建：`apps/ai-manager/src/server/persistence/startup-recovery.test.ts`

- [ ] **步骤 1：用 MVP 模型替换探针 schema**

建模 `Bug`、`RepairPlan`、`Approval`、`Run`、`PullRequest`、`Deployment`、`BugAcceptance` 和 `AuditEvent`。SQLite 只作为 `apps/ai-manager` 的本地事实源。

- [ ] **步骤 2：定义状态枚举**

Bug 状态：

```ts
export const bugStatuses = [
  "DRAFT",
  "NEEDS_INFORMATION",
  "ASSESSING",
  "WAITING_APPROVAL",
  "APPROVED",
  "FIXING",
  "VERIFYING",
  "PR_CREATED",
  "CI_RUNNING",
  "MERGED_AWAITING_STAGING",
  "STAGING_READY",
  "RESOLVED",
  "FAILED",
  "REAPPROVAL_REQUIRED",
  "MANUAL_HANDOFF",
  "CI_FAILED",
  "ACCEPTANCE_FAILED",
] as const;
```

Run 类型：

```ts
export const runTypes = [
  "ASSESSMENT",
  "REPAIR",
  "VALIDATION",
  "GITHUB_SYNC",
] as const;
```

- [ ] **步骤 3：实现自动化策略**

硬门禁：

- `L0` 和 `L1` 只有在计划版本已批准后才能继续。
- `L2` 必须绑定仓库内正式 spec 或 plan 引用，并获得额外批准。
- `L3` 一律进入 `MANUAL_HANDOFF`。
- 实际 diff 中出现任何自动化禁区路径，一律进入 `MANUAL_HANDOFF`。

- [ ] **步骤 4：先写领域测试**

覆盖：

- 信息不足的 Bug 进入 `NEEDS_INFORMATION`，且不创建 assessment run。
- 已批准 RepairPlan 不可修改。
- 修改计划会创建新版本并要求重新批准。
- 没有正式文档批准的 `L2` 不能进入修复。
- `L3` 不能进入修复并转为 `MANUAL_HANDOFF`。
- 一次成功 Deployment 可以让多个 Bug 进入 `STAGING_READY`。
- Bug 验收只改变该 Bug，不改变 Deployment。

- [ ] **步骤 5：验证领域切片**

运行：

```bash
rtk pnpm --filter @repo/ai-manager test
rtk pnpm --filter @repo/ai-manager typecheck
```

预期：全部通过。

## 任务 3：本地 UI 与领域命令

**文件：**

- 新建：`apps/ai-manager/src/ui/pages/bug-list.tsx`
- 新建：`apps/ai-manager/src/ui/pages/bug-detail.tsx`
- 新建：`apps/ai-manager/src/ui/pages/bug-form.tsx`
- 新建：`apps/ai-manager/src/ui/pages/repair-plan-review.tsx`
- 新建：`apps/ai-manager/src/ui/pages/run-log.tsx`
- 新建：`apps/ai-manager/src/ui/pages/deployment-status.tsx`
- 新建：`apps/ai-manager/src/ui/pages/bug-acceptance.tsx`
- 新建：`apps/ai-manager/src/ui/api/client.ts`
- 新建：`apps/ai-manager/src/server/routes/bugs.ts`
- 新建：`apps/ai-manager/src/server/routes/runs.ts`
- 新建：`apps/ai-manager/src/server/routes/deployments.ts`
- 新建：`apps/ai-manager/src/ui/pages/bug-flow.test.tsx`

- [ ] **步骤 1：实现本地 HTTP 安全边界**

仅监听 `127.0.0.1`。不启用 CORS。写请求校验本地 Origin、SameSite Cookie 和 CSRF token。

- [ ] **步骤 2：实现页面**

页面范围：

- Bug 列表和状态筛选。
- 新建和编辑 Bug 表单。
- Bug 详情时间线。
- RepairPlan 审阅和批准。
- Run 与验证日志。
- PR、CI 和 Deployment 状态。
- Staging 验收。

- [ ] **步骤 3：保持 UI 只调用命令**

UI 只能调用服务端领域命令和查询，不能直接设置领域状态。

- [ ] **步骤 4：验证 UI 切片**

运行：

```bash
rtk pnpm --filter @repo/ai-manager test
rtk pnpm --filter @repo/ai-manager lint
rtk pnpm --filter @repo/ai-manager typecheck
```

预期：全部通过。

## 任务 4：Codex 只读评估

**文件：**

- 新建：`apps/ai-manager/src/server/agent/codex-cli-runner.ts`
- 新建：`apps/ai-manager/src/server/agent/repair-plan-output-schema.ts`
- 新建：`apps/ai-manager/src/server/agent/secret-redaction.ts`
- 新建：`apps/ai-manager/src/server/agent/codex-cli-runner.test.ts`
- 新建：`apps/ai-manager/src/server/repository/worktree-service.ts`
- 新建：`apps/ai-manager/src/server/repository/worktree-service.test.ts`
- 新建：`apps/ai-manager/src/server/tasks/assessment-task.ts`
- 新建：`apps/ai-manager/src/server/tasks/assessment-task.test.ts`

- [ ] **步骤 1：实现证据脱敏**

保存或发送证据给 Codex 前，阻止高风险秘密，例如私钥、疑似 token、Cookie 和 `.env` 内容。只持久化脱敏后的日志。

- [ ] **步骤 2：实现只读 worktree 评估**

记录默认分支基线 commit，创建只读 assessment worktree，使用过滤后的可读文件和治理上下文运行 Codex，解析 JSON 输出，并确认评估结束后 worktree 没有 diff。

- [ ] **步骤 3：校验 RepairPlan JSON**

Schema 必须包含：根因假设、证据、修复目标、成功标准、任务级别、允许读取路径、允许修改的产品代码路径、允许修改的测试路径、禁止路径、验证命令、非目标、风险、基线 commit、计划版本和内容摘要。

- [ ] **步骤 4：格式错误自动重试一次**

如果 Schema 校验失败，将校验错误反馈给 Codex 并重试一次。第二次仍失败则将 assessment 标记为 `FAILED`。

- [ ] **步骤 5：验证评估切片**

运行：

```bash
rtk pnpm --filter @repo/ai-manager test
rtk pnpm --filter @repo/ai-manager typecheck
```

预期：测试覆盖合法计划、非法计划重试、secret 阻断和 assessment worktree 出现 diff 的失败路径。

## 任务 5：Codex 修复、Diff 边界与本机验证

**文件：**

- 新建：`apps/ai-manager/src/server/tasks/repair-task.ts`
- 新建：`apps/ai-manager/src/server/tasks/repair-task.test.ts`
- 新建：`apps/ai-manager/src/server/repository/diff-policy.ts`
- 新建：`apps/ai-manager/src/server/repository/diff-policy.test.ts`
- 新建：`apps/ai-manager/src/server/validation/validation-command.ts`
- 新建：`apps/ai-manager/src/server/validation/validation-command.test.ts`
- 新建：`apps/ai-manager/src/server/tasks/validation-task.ts`
- 新建：`apps/ai-manager/src/server/tasks/validation-task.test.ts`

- [ ] **步骤 1：实现交付槽位**

同一仓库只允许一个活跃修复或具备合并资格的 Bug。其他 Bug 可以停留在 draft、assessment 或 waiting approval。

- [ ] **步骤 2：创建修复分支和 worktree**

分支命名：

```text
codex/bug-<bug-number>-<baseline-short-sha>
```

每次修复尝试使用独立 worktree。

- [ ] **步骤 3：检查实际 diff**

新增、修改、删除、重命名和符号链接都按实际 diff 检查。任何禁区路径或未批准路径都停止并进入 `MANUAL_HANDOFF`。

- [ ] **步骤 4：执行结构化验证命令**

只允许已批准的 executable 和 args 数组。MVP 白名单为 `pnpm` 和 `git`；禁止 `shell: true`；禁止包安装命令和网络拉取命令。

- [ ] **步骤 5：验证修复切片**

运行：

```bash
rtk pnpm --filter @repo/ai-manager test
rtk pnpm --filter @repo/ai-manager typecheck
```

预期：测试覆盖修复成功、diff 越界、禁区路径、基线不一致、验证失败和命令白名单拒绝。

## 任务 6：仓库验证基线与 Staging Smoke 测试

**文件：**

- 修改：`package.json`
- 修改：`turbo.json`（仅当需要新增任务名）
- 修改：`apps/web-e2e/playwright.config.ts`
- 新建：`apps/web-e2e/tests/staging-smoke.spec.ts`
- 修改：`apps/web-e2e/README.md`

- [ ] **步骤 1：新增 AI Manager 验证脚本**

`apps/ai-manager` 存在后，在根脚本中新增：

```json
{
  "verify:ai-manager": "pnpm --filter @repo/ai-manager lint && pnpm --filter @repo/ai-manager typecheck && pnpm --filter @repo/ai-manager test && pnpm --filter @repo/ai-manager build"
}
```

- [ ] **步骤 2：将 API 和 AI Manager 纳入根验证**

根 `pnpm verify` 必须包含：

```bash
pnpm lint
pnpm typecheck
pnpm --filter @repo/web test
pnpm --filter @repo/api test
pnpm --filter @repo/ai-manager test
pnpm --filter @repo/web-e2e test:e2e
pnpm build
```

- [ ] **步骤 3：新增 staging smoke 子集**

创建 Playwright smoke 测试，检查已部署应用可访问且核心壳层可渲染。不要依赖 Tailwind class 或脆弱 DOM 结构。

- [ ] **步骤 4：验证基线**

运行：

```bash
rtk pnpm verify
rtk pnpm test:e2e:staging
```

预期：`pnpm verify` 本地通过；staging 命令仅在明确配置 staging URL 后运行并记录。

## 任务 7：GitHub PR、CI 轮询与精确 SHA 自动合并

**文件：**

- 新建：`apps/ai-manager/src/server/github/github-adapter.ts`
- 新建：`apps/ai-manager/src/server/github/github-adapter.test.ts`
- 新建：`apps/ai-manager/src/server/tasks/github-sync-task.ts`
- 新建：`apps/ai-manager/src/server/tasks/github-sync-task.test.ts`
- 新建：`.github/workflows/ci.yml`（必须先获得人工批准）

- [ ] **步骤 1：实现本地 GitHub 适配器**

MVP 使用管理员本机已认证的 `gh`。不得把 GitHub 凭据写入 SQLite，也不得把凭据传给 Codex。

- [ ] **步骤 2：创建 Draft PR**

本机验证通过后，创建 commit，推送分支，创建带 `ai-managed` 标签的 Draft PR。保存分支、commit SHA、PR URL 和 head SHA。

- [ ] **步骤 3：将合并授权绑定到精确 head SHA**

管理员批准时保存精确 PR head SHA。任何外部 commit、rebase、update branch 或 head SHA 变化都会使授权失效。

- [ ] **步骤 4：只在检查通过后启用 auto-merge**

必要条件：

- 当前 PR head SHA 等于已授权 SHA。
- 该 SHA 的 required checks 全部通过。
- 没有 requested changes。
- PR 已标记 ready for review。

- [ ] **步骤 5：验证 GitHub 切片**

运行：

```bash
rtk pnpm --filter @repo/ai-manager test
rtk pnpm verify
```

预期：fake GitHub 测试覆盖 PR 创建幂等性、head SHA 不一致、检查失败、requested changes 和成功启用 auto-merge。

## 任务 8：GHCR、Docker Compose Staging、回滚与验收

**文件：**

- 新建：`.github/workflows/build-images.yml`（必须先获得人工批准）
- 新建：`.github/workflows/deploy-staging.yml`（必须先获得人工批准）
- 新建：`infra/staging/docker-compose.yml`（必须先获得人工批准）
- 新建：`infra/staging/deploy.sh`（必须先获得人工批准）
- 新建：`infra/staging/rollback.sh`（必须先获得人工批准）
- 新建：`docs/ai/runbooks/staging-deployment-runbook.md`
- 新建：`apps/ai-manager/src/server/deployment/deployment-sync.ts`
- 新建：`apps/ai-manager/src/server/deployment/deployment-sync.test.ts`

- [ ] **步骤 1：构建不可变镜像**

从 `main` 构建可部署镜像，以 merge commit SHA 打 tag，推送到 GHCR，并记录 image digest。

- [ ] **步骤 2：按 digest 部署**

staging workflow 在 trusted runner 上拉取固定 digest，运行 Docker Compose，执行健康检查和 staging smoke E2E。

- [ ] **步骤 3：健康检查或 smoke 失败时回滚**

恢复上一成功 digest，再次运行健康检查和只读 smoke。记录失败部署和回滚结果。

- [ ] **步骤 4：标记 Bug 测试环境就绪**

当成功 Deployment 的 commit 包含某个 Bug 的 merge commit 时，将该 Bug 转为 `STAGING_READY`。

- [ ] **步骤 5：逐 Bug 独立验收**

管理员验收：

- 通过：Bug 进入 `RESOLVED`。
- 失败：Bug 进入 `ACCEPTANCE_FAILED`。
- Bug 验收失败不改变 Deployment 状态。

- [ ] **步骤 6：验证部署切片**

运行：

```bash
rtk pnpm --filter @repo/ai-manager test
rtk pnpm --filter @repo/web-e2e test:e2e:staging
```

预期：测试覆盖部署成功、smoke 失败、回滚成功、回滚失败记录、多 Bug 测试环境就绪和 Bug 独立验收。

## 任务 9：真实闭环验收

**文件：**

- 修改：`docs/ai/context-index.md`
- 修改：`docs/contexts/ai-defect-delivery/CONTEXT.md`（仅当术语变化）
- 新建或修改：`docs/ai/runbooks/ai-bug-repair-staging-runbook.md`

- [ ] **步骤 1：选择一个低风险 L0 或 L1 Bug**

该 Bug 必须可复现，不需要依赖变更，不需要 schema 变更，不触及 AI Manager，并且验证命令范围很窄。

- [ ] **步骤 2：跑通完整 MVP 流程**

记录以下证据：

- Bug 录入。
- AI 评估。
- RepairPlan 批准。
- 隔离 worktree 修复。
- 本机验证。
- Draft PR 创建。
- 精确 head SHA 授权。
- CI 通过并自动合并。
- Staging 部署。
- Smoke E2E。
- 人工 Bug 验收。

- [ ] **步骤 3：运行最终验证**

运行：

```bash
rtk pnpm verify
```

预期：完整仓库验证通过。

- [ ] **步骤 4：更新文档**

记录操作步骤、已知限制、staging 恢复方式和人工批准边界。

## 验收标准

- 本地 Web UI 可以创建、编辑、查看和筛选 Bug。
- 应用重启后，SQLite 可以恢复 Bug、RepairPlan、Run、PR、Deployment、AuditEvent 和 Acceptance 状态。
- Codex assessment 输出符合 Schema 的 RepairPlan。
- 修复前冻结已批准计划版本、基线 commit、读取范围、修改范围和验证命令。
- 本机验证失败、diff 越界、基线变化或任务不具备自动化资格时，不创建 PR。
- PR auto-merge 只对精确 head SHA 授权。
- GitHub CI 运行 `pnpm verify`。
- Staging smoke 失败会回滚到上一成功 digest。
- 一次成功 Deployment 可以让一个或多个 Bug 进入 `STAGING_READY`。
- 每个 Bug 必须独立人工验收后才能进入 `RESOLVED`。

## MVP 非目标

- 不支持多仓库。
- 不发布生产环境。
- AI 自动修复不得修改依赖、lockfile、数据库迁移、seed、CI、部署、凭据或治理文档。
- 不实现图片附件或加密证据存储。
- 不建设 webhook 系统。
- 不实现多用户登录、RBAC、OIDC 或公网访问。
- 不实现容器或远程 Agent 沙箱。
- 不实现 Kubernetes、蓝绿、金丝雀或生产发布流程。

## 分切片验证汇总

- 技术探针：`rtk pnpm --filter @repo/ai-manager test && rtk pnpm --filter @repo/ai-manager typecheck`。
- 领域与 UI：`rtk pnpm --filter @repo/ai-manager lint && rtk pnpm --filter @repo/ai-manager typecheck && rtk pnpm --filter @repo/ai-manager test`。
- 本机修复与验证：临时 Git 仓库测试加 AI Manager 单元测试。
- 仓库基线：`rtk pnpm verify`。
- Staging smoke：仅在设置 `E2E_MODE=staging` 和 `E2E_BASE_URL` 后运行 `rtk pnpm --filter @repo/web-e2e test:e2e:staging`。
- 最终验收：选择一个真实 `L0/L1` Bug 跑通完整闭环。

## 假设

- `apps/ai-manager` 仅本机运行，不由它自身托管的自动化修改。
- 首个实施目标只管理当前 monorepo。
- MVP 使用管理员本机已认证的 `gh`。
- Staging runner、GHCR、仓库保护规则和 secrets 由人工配置。
- 当前 `apps/api` workspace 必须纳入未来根验证，即使旧的 workspace 摘要没有提到它。
