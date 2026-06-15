# AI Bug 自动修复与 Staging 发布 MVP 设计

日期：2026-06-15

## 文档状态

- 状态：已确认设计，等待实施计划
- 任务级别：`L3`
- 人工主导边界：实现、CI、GitHub 权限、部署凭据和 staging 环境变更都需要按实施切片另行批准

## 与既有方案的关系

本设计从 MVP 目标重新推导架构，不采用 `apps/management-web`、`apps/management-api`、`apps/management-worker` 的拆分方案。

`docs/specs/2026-06-12/ai-management-control-plane.md` 和对应计划保留为历史材料，但不作为本 MVP 的实施依据。

领域语言以 `docs/contexts/ai-defect-delivery/CONTEXT.md` 为准。

## 目标

在当前 monorepo 内新增一个仅本机运行的单体管理应用，跑通以下闭环：

```text
人工录入 Bug
  -> AI 只读评估
  -> 人工批准结构化修复计划
  -> AI 在独立 Git worktree 中修复
  -> 本机独立验证
  -> 创建 Pull Request
  -> GitHub CI 复验并自动合并
  -> Docker Compose 部署 staging
  -> Smoke E2E
  -> 人工验收
```

首期目标是证明闭环可用，不建设完整研发管理平台。

## 成功标准

MVP 完成时必须满足：

1. 可以在本地 Web 界面录入、查看和筛选当前仓库的 Bug。
2. Codex CLI 可以生成符合结构化 Schema 的修复计划。
3. 修复前必须人工批准计划版本、基线 Commit、修改范围和验证命令。
4. 批准后可以在独立 worktree 中修复，并以实际 Git diff 检查范围。
5. 本机验证失败、范围越界或基线变化时不得创建 PR。
6. PR 的精确 head Commit 通过完整 CI 后可以自动合并。
7. 合并后可以构建镜像并使用 Docker Compose 部署 staging。
8. 部署后 Smoke E2E 失败时可以恢复上一成功镜像版本。
9. Deployment 与 Bug 独立；成功部署包含 Bug merge Commit 后，该 Bug 可以单独验收。
10. 本地应用重启后可以从 SQLite 恢复主要状态。

## MVP 范围

### 必须实现

- 本地单管理员 Web 应用。
- SQLite 持久化。
- Bug、RepairPlan、Approval、Run、PullRequest、Deployment、BugAcceptance 和 AuditEvent。
- `L0/L1` 自动闭环，`L2/L3` 分级门禁。
- Git worktree + 本机 Codex CLI。
- 批准读取范围、批准修改范围和自动化禁区。
- 本机验证、GitHub 完整 CI 和 staging Smoke E2E。
- 精确 PR head SHA 的合并授权。
- 仓库级串行修复与自动合并。
- GitHub Actions、GHCR、Docker Compose staging 和镜像回滚。
- staging 人工验收。

### 简单实现

- 本机只监听 `127.0.0.1`。
- 单进程、单实例、同一时间只运行一个 Codex 任务。
- 运行中断后不自动续跑，由管理员重新触发。
- GitHub 状态使用短轮询，不建设 webhook。
- UI 状态使用短轮询，不建设 WebSocket。
- 日志保存为本地文件，SQLite 只保存摘要和引用。
- 只接受文本缺陷证据；附件和图片上传后续再做。
- 提供简单的人工停止操作，撤销尚未完成的自动合并。

### 后续加固

以下已讨论能力不阻塞 MVP，统一放到后续阶段：

- 复杂关闭、重开和回归状态。
- 自动加密备份、恢复演练和云端同步。
- 精细日志、附件和证据保留周期。
- 图片附件、原始证据加密和高级隐私检测。
- 时钟偏差门禁、审计因果序号和设备身份迁移。
- GitHub App 短期 installation token；MVP 可先使用本机已认证的 `gh`。
- 部署折叠、复杂祖先判断和旧 workflow 防倒退规则。
- 精细运行费用、token 预算和取消进程状态机。
- 高风险动作短确认码。
- 完整紧急停止与远程工作流取消。
- 自动化恢复对账和多实例诊断。
- 多用户、登录、RBAC、OIDC 或公网访问。
- Docker 容器或远程 Agent 隔离。
- 多仓库和通用 Agent 插件系统。
- Kubernetes、蓝绿、金丝雀和生产发布。

## 非目标

MVP 不实现：

- 管理多个仓库。
- 管理或自动修改 `apps/ai-manager` 自身。
- 自动发布生产环境。
- 自动修改依赖或 lockfile。
- 自动修改数据库结构、迁移或种子脚本。
- 自动修改 CI、部署配置、安全凭据或仓库治理文档。
- 自动修改持久化格式、缓存结构、消息格式或外部契约。
- 任意 shell、任意联网、包安装或远程脚本。
- AI 自动修改自身规则、提示模板或治理约定。

## 已确认决策

| 决策项 | MVP 结论 |
| --- | --- |
| 应用位置 | 当前 monorepo 的 `apps/ai-manager` |
| 应用形态 | 本地单体全栈 Node 应用 |
| UI | React |
| 服务端 | TanStack Start 技术探针通过后采用；否则保持单进程 Node 全栈形态 |
| 数据库 | Prisma + SQLite |
| 用户 | 单管理员，无登录 |
| Agent | 本机 Codex CLI |
| 隔离 | 独立 Git worktree |
| SCM/CI | GitHub 与 GitHub Actions |
| staging | 单台 Linux 服务器 + Docker Compose |
| 镜像 | GHCR，以 Commit SHA/digest 标识 |
| 状态同步 | 本地短轮询 GitHub |

## 总体架构

```text
┌───────────────────────────────────────────┐
│ apps/ai-manager                           │
│ React UI + Server + SQLite + Task Loop    │
│                                           │
│ Domain State Machine                      │
│ Repository / Worktree Service             │
│ Codex CLI Runner                          │
│ Validation Runner                         │
│ GitHub Adapter                            │
└──────────────────┬────────────────────────┘
                   │ push branch / create PR
┌──────────────────▼────────────────────────┐
│ GitHub                                    │
│ PR CI -> required checks -> auto merge    │
│ main -> build images -> push GHCR         │
└──────────────────┬────────────────────────┘
                   │ trusted deploy workflow
┌──────────────────▼────────────────────────┐
│ Staging Linux Server                      │
│ Docker Compose -> health -> Smoke E2E     │
└───────────────────────────────────────────┘
```

### 应用模块

`apps/ai-manager` 保持单体，但内部划分：

```text
ui
server/domain
server/persistence
server/tasks
server/repository
server/agent
server/validation
server/github
prisma
```

约束：

- UI 只能调用领域命令和查询，不能直接设置状态。
- Domain 不依赖 Codex、GitHub 或页面实现。
- 长任务由本地 Task Loop 执行，不阻塞 HTTP 请求。
- Repository 模块统一管理 worktree、diff、Commit 和清理。
- Agent 只负责 Codex 进程协议，不负责判断修复成功。
- Validation 独立执行批准的命令。

## 核心模型

### Bug

保存缺陷描述、复现、期望、严重程度、当前状态以及当前计划、Run 和 PR 引用。

一个 Bug 对应一条修复交付链，可以经历多个计划和修复尝试。

### RepairPlan

至少包含：

- 根因假设与证据。
- 修复目标和成功标准。
- 任务级别。
- 允许读取路径。
- 允许修改的产品代码路径。
- 允许新增或修改的测试路径。
- 禁止修改路径。
- 必须执行的验证命令。
- 非目标和风险。
- 基线 Commit。
- 计划版本与内容摘要。

草案可编辑；批准后不可修改。任何变化创建新版本并重新审批。

### Approval

绑定：

- RepairPlan 版本和摘要。
- 基线 Commit。
- 批准时间和意见。

MVP 为单管理员，不建设完整身份系统。

### Run

类型：

- `ASSESSMENT`
- `REPAIR`
- `VALIDATION`
- `GITHUB_SYNC`

保存状态、开始结束时间、退出原因、日志引用和关键运行版本。重试创建新 Run，不覆盖历史。

### PullRequest

保存分支、Commit、PR URL、head SHA、CI、auto-merge 和 merge Commit。

### Deployment

Deployment 是仓库级事件，不属于单个 Bug。保存部署 Commit、镜像 digest、状态、健康检查、Smoke E2E 和回滚结果。

一次成功 Deployment 可以覆盖多个 Bug；只要部署 Commit 包含 Bug 的 merge Commit，该 Bug 就进入 `STAGING_READY`。

### BugAcceptance

保存 Bug、验收时的 Deployment/Commit、结果、时间和备注。

验收属于 Bug；某个 Bug 验收失败不改变 Deployment 成功状态。

### AuditEvent

追加记录关键人工和系统动作。MVP 不提供编辑或删除审计事件的能力。

## 状态机

主流程：

```text
DRAFT
  -> ASSESSING
  -> WAITING_APPROVAL
  -> APPROVED
  -> FIXING
  -> VERIFYING
  -> PR_CREATED
  -> CI_RUNNING
  -> MERGED_AWAITING_STAGING
  -> STAGING_READY
  -> RESOLVED

DRAFT -> NEEDS_INFORMATION -> DRAFT
```

主要异常：

```text
ASSESSING / FIXING / VERIFYING -> FAILED
FIXING -> REAPPROVAL_REQUIRED
FIXING -> MANUAL_HANDOFF
CI_RUNNING -> CI_FAILED
STAGING_READY -> ACCEPTANCE_FAILED
```

MVP 只实现主流程和上述必要异常。复杂关闭、重开和恢复状态放到后续阶段。

## 自动化门禁

### 任务分级

- `L0/L1`：人工批准 RepairPlan 后可以进入完整闭环。
- `L2`：必须先有仓库内正式 spec 或 plan，并对文档和 RepairPlan 再次人工批准，之后才可以进入自动修复。
- `L3`：禁止自动修复、自动合并和发布，进入 `MANUAL_HANDOFF`。
- AI 可以建议升级任务级别，但不能自动降低。

### 自动化禁区

实际 diff 出现以下内容时立即停止并转 `MANUAL_HANDOFF`：

- `apps/ai-manager`。
- 依赖 manifest 或 lockfile。
- Prisma schema、migration、seed。
- `.github/workflows`、部署文件或凭据。
- `AGENTS.md`、ADR、spec、plan、领域 CONTEXT。
- 持久化格式、缓存结构、消息格式或外部契约。

这些禁区不能通过扩大 RepairPlan 路径绕过。

### 读取与修改范围

- RepairPlan 独立声明允许读取路径和允许修改路径。
- 固定拒绝读取 `.env*`、密钥、证书、`.local/`、数据库文件和原始敏感材料。
- Codex 只能在过滤后的文件清单中搜索。
- 新增、删除、重命名和符号链接都必须按实际 diff 检查。
- 扩大读取或修改范围需要新计划版本和重新批准。

## 端到端流程

### 1. Bug 录入

至少填写：

- 实际现象。
- 期望行为。
- 发生环境。
- 复现步骤，或无法稳定复现的说明。
- 文本证据。
- 影响范围和严重程度。

信息不足时进入 `NEEDS_INFORMATION`，不调用 Codex。

MVP 只接受文本证据。保存和发送给 Codex 前执行基础 Token、Cookie、私钥和个人信息脱敏检查；发现高风险秘密时阻止提交。

### 2. AI 评估

1. 记录默认分支基线 Commit。
2. 创建只读评估 worktree。
3. Codex 读取批准范围内的代码和治理上下文。
4. Codex 输出版本化 JSON Schema。
5. Schema 校验通过后生成 RepairPlan 草案。
6. 确认评估 worktree 没有 diff。

管理器不从自然语言猜测关键字段。Schema 校验失败可以自动重试一次，仍失败则 Assessment 失败。

### 3. 人工批准

管理员审阅并批准：

- 任务级别。
- 基线 Commit。
- 读取和修改范围。
- 验证命令。
- 成功标准和非目标。

批准绑定精确计划版本。修改计划后必须重新批准。

### 4. 串行修复

仓库同一时间只有一个交付槽位：

1. Bug 获得槽位。
2. 确认基线仍有效。
3. 创建 `codex/bug-<id>-<short-sha>` 分支和独立 worktree。
4. Codex 按冻结计划修复。
5. 管理器读取实际 diff。
6. 越界、基线变化或任务升级时停止。

Codex 不获得 GitHub、GHCR、staging 或生产凭据。

### 5. 独立验证

本机验证至少运行：

- RepairPlan 指定的定向测试。
- 受影响 workspace 的 lint、typecheck、test 和 build。
- 路由或主流程变化时运行相关本地 E2E。

验证命令来自结构化白名单，只允许 `pnpm` 等批准可执行文件与参数数组，不执行自由 shell、包安装或网络下载。

测试失败时不得通过删除测试、跳过测试或降低断言来获得通过。

### 6. PR 与自动合并

本机验证通过后：

1. 创建 Commit 并推送任务分支。
2. 创建带 `ai-managed` 标签的 Draft PR。
3. 确认 PR head SHA 与本地 Commit 一致。
4. 人工授权该精确 head SHA。
5. 标记 Ready 并启用 GitHub auto-merge。

自动合并要求：

- 当前 head SHA 与合并授权一致。
- required checks 针对该 SHA 全部通过。
- 没有 requested changes。

任何外部 Commit、自动 rebase 或 update branch 都会使授权失效。MVP 不自动更新落后分支；需要从最新 `main` 重新修复并验证。

GitHub 身份在 MVP 可使用管理员本机已认证的 `gh`。专用 GitHub App 作为后续安全加固。

### 7. CI

PR 对精确 head SHA 运行完整：

```bash
pnpm verify
```

该工作流是 required check。启用自动合并前，必须先扩展当前验证基线，使 `pnpm verify` 同时包含 API 和 AI Manager 的测试；当前脚本只显式运行 Web 单元测试和 Web E2E，不足以覆盖新增闭环。

断言、lint、typecheck、build 或 E2E 失败时不自动重试；人工重跑保留新结果。

### 8. Staging 部署

`main` 合并后：

1. GitHub Actions 构建 Web、API 和需要部署的应用镜像。
2. 以 merge Commit SHA/digest 推送 GHCR。
3. staging 专用 workflow 在受信任 runner 上执行固定部署脚本。
4. Docker Compose 拉取指定 digest 并启动。
5. 执行健康检查。
6. 执行 staging Smoke E2E。
7. 成功后记录 Deployment。

PR workflow 不得运行在 staging runner。部署凭据不进入本地 AI Manager 或 Codex。

当前 E2E workspace 已支持 staging 模式，但没有独立 Smoke 子集。MVP 实施需要建立一个耗时受控、只覆盖核心可用性的 staging Smoke project 或测试标签。

### 9. 回滚

健康检查或 Smoke E2E 失败时：

1. 恢复上一成功镜像 digest。
2. 再次运行健康检查和只读 Smoke E2E。
3. 记录失败和回滚结果。

MVP 回滚只恢复镜像和服务配置，不恢复业务数据。由于自动化禁区禁止数据库和持久化语义变化，自动修复应保持旧镜像可运行。

Deployment 失败不把 Bug 标记为修复失败；Bug 保持 `MERGED_AWAITING_STAGING`，等待后续成功部署。

### 10. 验收

成功 Deployment 的 Commit 包含 Bug merge Commit 时，Bug 进入 `STAGING_READY`。

管理员逐 Bug 验收：

- 通过：进入 `RESOLVED`。
- 失败：进入 `ACCEPTANCE_FAILED`，后续创建新 RepairPlan。

未验收 Bug 不阻塞其他 PR 或 Deployment。

## 本地可靠性

MVP 采用简单策略：

- SQLite 是本地事实源。
- 同一数据目录只允许一个进程运行。
- Task Loop 同一时间只运行一个 Codex Run。
- Run 开始、结束和心跳写入 SQLite。
- 进程重启后，将运行中 Run 标记为 `INTERRUPTED`。
- `INTERRUPTED` 不自动重放，由管理员创建新 Run。
- Git push、PR 创建和 auto-merge 使用稳定幂等键。
- PR 合并或关闭后清理 worktree；发现未提交 diff 时停止清理并提示人工处理。

MVP 只需要提供 SQLite 数据库和日志目录的手工备份说明。自动加密备份和恢复演练后续实现。

## 本地安全

- 服务只监听 `127.0.0.1`。
- 写操作校验本地 Origin，并使用 SameSite Cookie 和 CSRF token。
- 不启用 CORS。
- Codex 模型通道可以联网，但 Codex 执行的 shell 默认不能访问外网。
- GitHub push/PR 由管理器在 Codex 退出后执行。
- 日志落盘前做基础秘密脱敏。
- 本机 GitHub 凭据不写入 SQLite，也不传给 Codex。

MVP 的 Git worktree 不是强安全沙箱，只适用于可信单管理员和可信本机。多人或不可信输入场景必须另行设计容器或远程隔离。

## 页面范围

首期页面：

1. Bug 列表和状态筛选。
2. 新建与编辑 Bug。
3. Bug 详情和时间线。
4. RepairPlan 审阅与批准。
5. Run 和验证日志。
6. PR、CI 和 Deployment 状态。
7. Staging 验收。

不建设看板、迭代、报表、通用工作流编辑器或复杂审计检索。

## 测试策略

### 领域测试

- 主状态机和必要异常迁移。
- 批准计划不可修改。
- 未具备正式文档与额外批准的 `L2`、所有 `L3` 以及自动化禁区不能进入自动修复。
- 合并授权绑定精确 head SHA。
- Deployment 与 Bug 多对多关联。
- Bug 独立验收。

### 模块测试

- Codex JSON Schema、退出码、超时。
- worktree 创建、diff 范围检查和清理。
- 命令白名单。
- GitHub PR 创建、幂等和状态同步。
- 基础日志脱敏。

### 集成测试

- 使用临时 Git 仓库验证修复、越界、基线变化和验证失败。
- 使用模拟 GitHub 验证 PR、CI、merge 和 Deployment 状态。
- 使用测试 Compose 环境验证部署、健康检查和镜像回滚。

### 真实闭环验收

选择一个低风险、可复现的 `L0/L1` Bug：

1. 录入 Bug。
2. AI 生成计划。
3. 人工批准。
4. Codex 修复。
5. 本机验证。
6. 创建 PR。
7. CI 通过并自动合并。
8. 部署 staging。
9. Smoke E2E 通过。
10. 人工验收并标记解决。

## 实施切片

实施计划按以下顺序编写：

1. 技术探针：TanStack Start、Prisma SQLite 和后台 Task Loop。
2. Bug、RepairPlan、Approval、主状态机和基础页面。
3. worktree、Codex 评估和 JSON Schema。
4. Codex 修复、范围检查和本机验证。
5. 补齐 `pnpm verify` 的 API、AI Manager 测试和 staging Smoke 子集。
6. GitHub PR、完整 CI 和精确 SHA 自动合并。
7. GHCR、Docker Compose staging、Smoke E2E 和镜像回滚。
8. 真实闭环验收和最小安全加固。

每个切片独立验证。GitHub 权限、runner、服务器和凭据仍是人工主导的 `L3` 操作。

## 风险

- Git worktree 不是强隔离。
- Codex CLI 或输出协议变化可能破坏运行器。
- SQLite 和本地 Task Loop 只适合单实例 MVP。
- 自动合并依赖正确的分支保护和 required checks。
- staging runner 配置错误可能暴露服务器权限。
- Docker 镜像回滚不恢复业务数据。
- 当前仓库没有现成 GitHub Actions 和容器部署基线，实施前需要单独验证。

## 需要更新的文档

进入实施后按切片更新：

- `docs/plans/2026-06-15/ai-bug-repair-staging-mvp.md`
- `CONTEXT-MAP.md`
- `docs/contexts/ai-defect-delivery/CONTEXT.md`
- 与长期边界相关的 ADR
- `docs/ai/context-index.md`
- 根 `AGENTS.md`
- staging 部署与故障恢复 runbook

## 设计完成定义

- MVP 主闭环、分级门禁、自动化禁区和人工验收已确认。
- 非根本性加固项已移出 MVP 完成定义。
- 旧管理控制面方案不作为实施依据。
- 实施仍受 `L3` 人工审批约束。
