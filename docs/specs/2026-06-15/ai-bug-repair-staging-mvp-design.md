# AI Bug 自动修复与 Staging 发布 MVP 设计

日期：2026-06-15

## 文档状态

- 状态：已确认设计，等待实施计划
- 任务级别：`L3`
- 人工主导边界：任何实现、CI、GitHub 权限、部署凭据和 staging 环境变更都需要另行批准实施计划

## 与既有方案的关系

本设计从 MVP 目标重新推导架构，不采用 `apps/management-web`、`apps/management-api`、`apps/management-worker` 的拆分方案。

`docs/specs/2026-06-12/ai-management-control-plane.md` 和对应实施计划保留为历史材料，但不作为本 MVP 的实施依据。后续开发、评审和验收以本文及其后续实施计划为准。

## 背景

当前 monorepo 包含 Web、API、文档、E2E 和 AI 开发治理能力，但缺少一个可以实际运行的缺陷闭环。目标不是先建设完整研发管理平台，而是用最小系统验证以下链路是否可靠：

```text
人工录入 Bug
  -> AI 只读评估
  -> 人工批准结构化修复计划
  -> AI 在独立 Git worktree 中修复
  -> 本机独立验证
  -> 创建 Pull Request
  -> GitHub CI 复验
  -> 自动合并
  -> Docker Compose 部署 staging
  -> 健康检查与 Smoke E2E
  -> 人工验收并标记解决
```

第一版优先验证闭环，不追求多用户、通用工作流、多仓库或生产级 Agent 隔离。

## 目标

在当前 monorepo 内新增一个仅本机运行的单体管理应用，使单个管理员可以记录当前仓库的 Bug，批准 AI 修复计划，并在批准后自动推进到 staging 部署结果可见。

## 成功标准

MVP 完成时必须满足：

1. 管理员可以在本地 Web 界面录入、查看和筛选 Bug。
2. Codex CLI 可以基于仓库和 Bug 信息生成结构化修复计划。
3. 修复计划必须经人工批准，且批准绑定计划版本和基线 Commit。
4. 批准后系统可以创建独立 worktree，执行修复并校验实际 Git diff。
5. 本机验证失败、路径越界或基线漂移时不得创建 PR。
6. 本机验证通过后可以创建带专用标识的 GitHub PR，并启用受 required checks 约束的自动合并。
7. 合并后 GitHub Actions 可以构建不可变镜像并由 Docker Compose 部署 staging。
8. staging 健康检查或 Smoke E2E 失败时可以恢复上一成功镜像版本。
9. 本地应用重启后可以从 SQLite 恢复 Bug、审批、运行、PR 和部署记录。
10. staging 成功后仍需人工验收，只有人工确认后 Bug 才进入 `RESOLVED`。

## 非目标

MVP 不实现：

- 管理多个仓库。
- 管理 `apps/ai-manager` 自身的 Bug。
- 多用户、登录、RBAC、OIDC 或公网访问。
- 通用项目管理、需求管理、看板、迭代、工时或报表。
- 通用 Agent 插件系统或多个 Agent 提供方。
- Docker 容器内运行 Codex。
- Kubernetes、蓝绿发布、金丝雀发布或多节点高可用。
- 自动发布生产环境。
- AI 自动修改治理规则、提示模板或自身实现。
- 自动处理破坏性数据库迁移。
- Webhook 接收服务、WebSocket 或实时日志推送。

## 范围级别与批准边界

本任务属于 `L3`，原因包括：

- 新增 workspace 应用和本地持久化。
- 执行 Codex、Git、测试和 GitHub 外部操作。
- 新增 GitHub Actions、自动合并和 staging 部署。
- 处理凭据、分支保护、镜像仓库和回滚。

本文只批准设计，不授权实现。正式实现前必须创建 `docs/plans/` 下的实施计划，明确每个切片的文件、测试、GitHub 权限和人工操作。

## 已确认决策

| 决策项 | 结论 |
| --- | --- |
| 管理界面 | 本地轻量 Web |
| 应用位置 | 当前 monorepo 的独立 workspace |
| 应用形态 | 单体全栈 Node 应用 |
| 运行位置 | 仅管理员本机 |
| 用户模型 | 单管理员，不做登录 |
| 数据事实源 | 本地 SQLite |
| 管理范围 | 仅当前 monorepo |
| 自管理 | MVP 禁止管理或修改 `apps/ai-manager` |
| Agent | 本机 Codex CLI |
| 执行隔离 | 独立 Git worktree |
| 人工门禁 | 批准结构化、版本化的修复计划 |
| 批准后流程 | 自动修复、验证、PR、合并和 staging 发布 |
| SCM/CI | GitHub 与 GitHub Actions |
| 镜像仓库 | GitHub Container Registry |
| staging | 单台 Linux 服务器上的 Docker Compose |
| 状态同步 | 本地应用定时轮询 GitHub |
| 生产发布 | 不在 MVP 范围 |

## 方案评估

### 方案 A：单体本地管理应用

一个 workspace 同时提供 React 界面、服务端能力、SQLite 访问和后台任务调度。Codex、Git 和 GitHub 操作通过明确模块调用。

优点：

- 本机单管理员场景下部署和运行最简单。
- 不需要维护前后端两个进程或独立服务间认证。
- SQLite、任务状态和页面查询可以保持在同一事务边界附近。
- 后续拆仓时仍可沿模块边界迁移。

缺点：

- 必须约束模块依赖，避免形成无法拆分的大型应用。
- 长任务不能直接运行在 HTTP 请求生命周期中。

结论：采用。

### 方案 B：Web 与本地 API 分离

优点是进程边界清晰，缺点是 MVP 需要额外处理进程启动、接口契约、跨进程日志和恢复。当前没有多客户端或远程访问需求，不采用。

### 方案 C：GitHub Actions 驱动全部流程

优点是执行环境统一，缺点是本机 Codex 凭据、人工审批、长任务恢复和日志交互更复杂，也不符合已确认的本机 worktree 执行方式，不采用。

## 总体架构

```text
┌──────────────────────────────────────────────┐
│ apps/ai-manager                              │
│                                              │
│  React UI                                    │
│      │                                       │
│  Server Commands / Queries                   │
│      │                                       │
│  Domain State Machine ─── SQLite             │
│      │                    Audit + Run Queue   │
│  Background Task Loop                        │
│      ├── Repository / Worktree Service       │
│      ├── Codex CLI Runner                    │
│      ├── Validation Runner                   │
│      └── GitHub CLI Adapter                  │
└───────────────────┬──────────────────────────┘
                    │ push branch / create PR
┌───────────────────▼──────────────────────────┐
│ GitHub                                       │
│ PR CI -> required checks -> auto merge       │
│ merge -> build images -> push GHCR           │
└───────────────────┬──────────────────────────┘
                    │ trusted deploy job
┌───────────────────▼──────────────────────────┐
│ Staging Linux Server                         │
│ dedicated deploy runner + Docker Compose     │
│ health checks + staging Smoke E2E + rollback │
└──────────────────────────────────────────────┘
```

## 应用结构

MVP 新增 `apps/ai-manager`。它是一个单体应用，但内部保持以下模块边界：

```text
apps/ai-manager
├── ui
├── server
│   ├── domain
│   ├── persistence
│   ├── tasks
│   ├── repository
│   ├── agent
│   ├── validation
│   └── github
└── prisma
```

约束：

- `ui` 只能调用领域命令和查询，不能直接更新状态字段。
- `domain` 不依赖 Codex CLI、GitHub CLI 或具体页面。
- `tasks` 负责持久化任务领取和恢复，不把长任务放入 HTTP 请求。
- `repository` 是唯一允许创建 worktree、读取 diff 和提交代码的模块。
- `agent` 只负责 Codex 进程协议，不负责判断任务成功。
- `validation` 独立执行批准的验证命令。
- `github` 只在本机验证成功后执行推送、PR 和状态查询。

### 技术基线

MVP 建议沿用仓库已有技术：

- React 19。
- TanStack Start，Node 运行时，单进程提供 UI 与服务端能力。
- Prisma 6 和 SQLite。
- Vitest。
- 现有 ESLint 与 TypeScript 配置。

TanStack Start 已在 `apps/docs` 使用，可减少新增框架种类。实施计划需要先完成一个最小技术探针，验证生产构建、SQLite 文件路径和后台任务生命周期；探针失败时可以改用等价的单进程 Node 全栈方案，但不得拆成多个服务。

## 本地运行边界

- 服务默认只监听 `127.0.0.1`。
- 数据、日志和 worktree 根目录必须通过配置确定，并加入 Git 忽略。
- SQLite 默认位于 `.local/ai-manager/ai-manager.db`。
- 运行日志默认位于 `.local/ai-manager/logs/`。
- worktree 默认位于 `.worktrees/ai-manager/`。
- 本地运行目录不得进入 Git 提交。
- 单进程一次只允许一个评估或修复型 Codex 任务运行。

## 核心领域模型

### `Bug`

保存：

- 标题、描述、复现步骤和期望结果。
- 严重程度和管理员备注。
- 当前状态、创建时间和更新时间。
- 当前修复计划、运行、PR 和部署引用。
- 乐观锁版本。

### `RepairPlan`

结构化修复计划至少包含：

- 根因假设和支持证据。
- 修复目标和成功标准。
- 允许读取路径。
- 允许修改路径。
- 禁止修改路径。
- 必须执行的验证命令。
- 风险级别和非目标。
- 基线 Commit。
- 计划版本和内容摘要。

计划草案可以编辑。批准后该版本不可修改，任何变化都创建新版本并重新批准。

### `Approval`

保存：

- 计划版本和内容摘要。
- 基线 Commit。
- 批准时间和批准意见。
- 批准者标识，MVP 固定为本地管理员。

### `Run`

`Run` 同时承担持久化任务记录，类型包括：

- `ASSESSMENT`
- `REPAIR`
- `VALIDATION`
- `GITHUB_SYNC`

保存任务状态、重试次数、租约、开始结束时间、退出原因、日志引用和资源统计。重试创建新的 Run，不覆盖历史运行。

### `RunEvent`

追加记录：

- 阶段开始和结束。
- Codex 结构化事件摘要。
- 执行命令、退出码和日志引用。
- 变更文件清单。
- 路径、基线和策略检查结果。

### `PullRequest`

保存：

- 分支、Commit、PR 编号和 URL。
- PR head SHA。
- required checks 状态。
- 自动合并状态和合并 Commit。
- 最后同步时间。

### `Deployment`

保存：

- 合并 Commit。
- 各服务镜像 digest。
- staging 部署状态。
- 健康检查和 Smoke E2E 结果。
- 上一成功版本和回滚结果。
- GitHub workflow run URL。

### `AuditEvent`

追加记录关键领域动作。审计记录不可在应用中编辑或删除。

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
  -> MERGED
  -> DEPLOYING_STAGING
  -> STAGING_READY
  -> RESOLVED
```

失败与返工：

```text
ASSESSING -> FAILED
FIXING -> FAILED
FIXING -> REAPPROVAL_REQUIRED
VERIFYING -> FAILED
PR_CREATED -> CI_RUNNING
CI_RUNNING -> CI_FAILED
DEPLOYING_STAGING -> DEPLOY_FAILED
FAILED -> ASSESSING
FAILED -> WAITING_APPROVAL
REAPPROVAL_REQUIRED -> WAITING_APPROVAL
CI_FAILED -> WAITING_APPROVAL
PR_CREATED -> WAITING_APPROVAL
DEPLOY_FAILED -> DEPLOYING_STAGING
DEPLOY_FAILED -> WAITING_APPROVAL
```

状态规则：

- `DRAFT` 可以启动首次评估；评估失败后只能由管理员显式重试。
- 只有存在修复计划草案时才能进入 `WAITING_APPROVAL`。
- 只有当前计划版本和基线 Commit 获得有效批准时才能进入 `APPROVED`。
- 只有 `APPROVED` 可以创建修复 Run。
- 基线漂移、路径范围变化、验证命令变化或发现计划外工作时必须进入 `REAPPROVAL_REQUIRED`。
- 本机验证通过后才能创建 PR。
- GitHub required checks 全部通过后才能自动合并。
- `FAILED` 必须记录失败阶段；评估失败回到 `ASSESSING`，修复或验证失败则生成新计划版本并回到 `WAITING_APPROVAL`。
- PR 收到 requested changes 时回到 `WAITING_APPROVAL`，后续修复使用新的基线和计划版本。
- `DEPLOY_FAILED` 可以由管理员重试同一合并 Commit；如果需要代码修正，则回到 `WAITING_APPROVAL`。
- staging 成功不自动关闭 Bug。
- `RESOLVED` 必须由管理员在 staging 验收后显式确认。
- 非法迁移必须被领域层拒绝并记录审计事件。

## 端到端流程

### 1. Bug 录入

管理员填写标题、现象、复现步骤、期望结果和严重程度。保存后 Bug 处于 `DRAFT`。

### 2. AI 评估

1. 管理器记录当前默认分支 Commit。
2. 创建评估 Run 和独立 worktree。
3. Codex 以只读评估模式读取 Bug、`AGENTS.md`、AI 上下文索引及相关代码。
4. Codex 输出符合固定 Schema 的修复计划草案。
5. 管理器检查评估 worktree 不存在 diff。
6. 管理器保存计划并进入 `WAITING_APPROVAL`。

任何评估期文件变更都使评估失败，不接受其计划结果。

### 3. 人工批准

管理员可以编辑计划草案。批准动作冻结：

- 计划内容摘要。
- 基线 Commit。
- 允许和禁止修改路径。
- 验证命令。
- 风险与非目标。

批准后写入不可变 Approval 并进入 `APPROVED`。

### 4. AI 修复

1. 为 Bug 创建 `.worktrees/ai-manager/bug-<id>`。
2. 从批准的基线 Commit 创建 `codex/bug-<id>-<short-sha>` 分支。
3. 向 Codex 传入冻结计划，工作目录限定为该 worktree。
4. Codex 完成修改和其自身检查。
5. 管理器读取实际 Git diff，不使用 Codex 总结判断结果。
6. 若发生路径越界、基线变化或计划外工作，停止并进入 `REAPPROVAL_REQUIRED`。

Codex 不获得 GitHub Token、staging 凭据或生产凭据。

### 5. 独立验证

管理器按冻结计划独立执行验证命令：

- 命令必须来自结构化白名单。
- 不接受 shell 拼接、重定向、命令替换或运行时下载脚本。
- 默认验证基线从仓库已有 `pnpm` 脚本选择。
- 命令和退出码写入 RunEvent，完整输出写入本地日志。

任何必需命令失败时不提交、不推送、不创建 PR。

### 6. 创建 PR 与自动合并

本机验证通过后：

1. 管理器创建 Commit。
2. 使用管理进程的 GitHub 凭据推送任务分支。
3. 创建带 `ai-managed` 标签的 Draft PR。
4. 确认 PR head SHA 与本地 Commit 一致。
5. 将 PR 标记为 Ready，并启用 squash auto-merge。

自动合并必须同时依赖：

- 分支名符合 `codex/bug-*`。
- PR 具有 `ai-managed` 标签。
- PR head SHA 与本地记录一致。
- 分支保护要求的 CI checks 全部通过。
- PR 没有 unresolved requested changes。

管理器不直接执行无条件 merge。

### 7. CI 复验

GitHub Actions 在 PR 上运行固定验证工作流。至少包含：

- lint。
- typecheck。
- 受影响 workspace 测试。
- build。
- 主用户流程受影响时运行 E2E。

MVP 可以先运行完整 `pnpm verify`，后续再基于变更范围优化。CI 失败后 PR 不合并，Bug 进入 `CI_FAILED`。

### 8. 构建与 staging 部署

`main` 合并后：

1. GitHub-hosted runner 构建 `web`、`api` 和 `docs` 镜像。
2. 镜像以合并 Commit SHA 和 digest 标识并推送 GHCR。
3. staging 专用部署 job 只运行在受信任的自托管 runner。
4. 部署 job 使用仓库内固定 `compose.staging.yaml` 拉取指定 digest。
5. 执行数据库迁移前置检查。
6. 启动新版本并运行健康检查。
7. 运行 staging Smoke E2E。
8. 成功后记录当前版本为上一成功版本。

`apps/ai-manager` 不构建、不发布到 staging。

### 9. 回滚

健康检查或 Smoke E2E 失败时：

1. 使用服务器本地记录的上一成功镜像 digest 恢复 Compose 服务。
2. 再次执行健康检查。
3. 将原部署标记为 `DEPLOY_FAILED`。
4. 记录回滚是否成功和 GitHub workflow URL。

MVP 不执行数据库逆向迁移。因此自动发布只允许无迁移或向后兼容的增量迁移。需要删除、重命名、不可逆数据变换或使旧版本不兼容的迁移不进入本自动闭环。

### 10. 状态同步与验收

本地应用定时轮询 GitHub PR、check run、workflow 和 deployment 状态。应用关闭不会阻止 GitHub 完成 CI、合并或部署；重新启动后可补齐外部状态。

staging 部署成功后管理员进行人工验收，确认问题已解决后进入 `RESOLVED`。

## 本地任务可靠性

MVP 不引入 Redis、BullMQ 或工作流引擎，使用 SQLite 持久化 Run 队列：

- 领取任务时写入租约、进程标识和心跳时间。
- 单进程同一时间只运行一个 Codex Run。
- HTTP 请求只创建任务，不等待长任务结束。
- 进程重启后，未完成 Run 标记为 `INTERRUPTED`。
- `INTERRUPTED` Run 不自动重放，由管理员决定是否重试。
- 每个 Git push、PR 创建和 auto-merge 请求使用稳定幂等键。
- 已存在 PR 时复用记录，不重复创建。

## 安全模型

### 信任假设

本 MVP 面向可信单管理员和可信本机，不是强对抗隔离环境。Git worktree 只能隔离代码状态，不能提供容器或虚拟机级文件系统隔离。

因此：

- 应用只监听本机回环地址。
- Codex 使用受限工作目录和 CLI sandbox 配置。
- 敏感文件不复制到任务 worktree。
- Codex 进程不接收 GitHub、GHCR、staging 或生产凭据。
- 管理器启动时检查目标仓库和运行目录是否符合配置。
- 未来进入多用户或不可信输入场景前，必须升级为容器或远程隔离执行。

### 路径策略

- 默认拒绝修改未在批准计划中的路径。
- 始终禁止修改 `apps/ai-manager`、`.github/workflows`、部署凭据和本地运行目录。
- 检查新增、删除、重命名、符号链接和子模块变化。
- 使用规范化绝对路径验证所有 diff 条目。
- 越界时保留证据，但不得提交或推送。

如 Bug 本身要求修改 CI、部署或 AI Manager，应退出自动闭环并创建独立 `L3` 人工主导任务。

### 命令策略

验证命令不是自由文本 shell：

- 由命令名和参数数组组成。
- 可执行文件限制为批准列表，例如 `pnpm`。
- 工作目录限制在任务 worktree。
- 设置超时、输出上限和可取消信号。
- 禁止 `sudo`、任意网络下载和破坏性 Git 命令。

### 凭据

- Codex 凭据由本机 CLI 自身管理，不写入 SQLite。
- GitHub 凭据由管理进程使用，不传递给 Codex。
- staging 部署凭据只存在于 GitHub `staging` Environment 或自托管 runner。
- 应用日志入库前执行常见 Token、密钥和个人信息脱敏。

## 页面范围

MVP 页面：

1. Bug 列表和状态筛选。
2. 新建和编辑 Bug 草稿。
3. Bug 详情和审计时间线。
4. AI 修复计划审阅、编辑和版本差异。
5. 批准确认。
6. 修复、验证和 CI 日志摘要。
7. PR、合并和 staging 部署状态。
8. staging 人工验收和标记解决。

界面更新采用短轮询，不引入 WebSocket。

## GitHub 与部署约束

实施前必须由人工完成或批准：

- 启用分支保护和 required checks。
- 启用仓库 auto-merge。
- 创建 `ai-managed` 标签。
- 配置 GHCR package 权限。
- 创建 GitHub `staging` Environment。
- 注册只执行受信任部署 workflow 的 staging 自托管 runner。
- 确保 PR workflow 不运行在 staging runner。
- 配置 Docker、Compose、持久化卷、域名和 TLS。

部署 workflow 只允许由受保护默认分支的合并 Commit 触发，不接受 PR 输入拼接部署命令。

## 测试策略

### 领域单元测试

- 所有合法和非法状态迁移。
- 批准绑定计划版本、摘要和基线 Commit。
- 批准后计划不可修改。
- `RESOLVED` 必须经过 staging 成功和人工确认。
- 中断 Run 不会自动重放。

### 模块契约测试

- Codex 输出 Schema、退出码、超时和取消映射。
- Git diff 路径检查。
- 验证命令白名单和参数校验。
- GitHub PR 创建、幂等和状态同步。
- 日志脱敏。

### 临时仓库集成测试

- 创建和清理 worktree。
- 基线漂移。
- 允许路径内修改。
- 越界修改、符号链接和重命名。
- 验证失败时不创建 Commit 或 PR。
- 重试不会覆盖历史 Run。

### 管理应用 UI 测试

- Bug 录入。
- 修复计划审阅和批准。
- 失败与重新审批路径。
- PR、部署状态和人工验收展示。

### GitHub Actions 测试

- 非 `ai-managed` PR 不进入自动合并流程。
- required checks 失败时不合并。
- 只有默认分支合并 Commit 可以触发 staging 部署。
- 镜像 tag 和 digest 对应合并 Commit。

### 真实闭环验收

在当前仓库使用一个低风险、可复现测试 Bug 完成：

1. 本地录入 Bug。
2. AI 生成计划。
3. 人工批准。
4. Codex 修复。
5. 本机验证。
6. 创建 PR。
7. CI 通过并自动合并。
8. 构建镜像并部署 staging。
9. 运行健康检查和 Smoke E2E。
10. 本地应用同步状态并由管理员确认解决。

## MVP 实施切片

实施计划应按以下垂直切片展开，每个切片独立验证：

1. 技术探针：TanStack Start、Prisma SQLite、后台任务生命周期。
2. Bug、计划、审批、状态机和审计。
3. 本地 Web 页面和短轮询。
4. SQLite Run 队列与中断恢复。
5. Git worktree、Codex 评估和结构化计划。
6. Codex 修复、diff 策略和独立验证。
7. GitHub PR、CI 状态同步和受控 auto-merge。
8. GHCR 构建、Compose staging 部署和回滚。
9. 真实端到端验收与安全加固。

任何涉及 GitHub 权限、runner、镜像仓库、服务器或凭据的切片仍属于人工主导 `L3` 操作。

## 风险

- Git worktree 不是强安全沙箱，Codex 仍运行在管理员本机。
- Codex CLI 参数或结构化输出格式变化可能破坏运行器。
- SQLite 单进程队列适合 MVP，但不适合多实例并发。
- 自动合并依赖正确配置的分支保护和 required checks。
- 自托管 runner 配置错误可能让不可信 PR 代码接触 staging 主机。
- 数据库迁移可能破坏镜像回滚能力。
- staging 服务和健康检查定义不足会产生“部署成功但不可用”的假阳性。
- 管理应用位于被管理仓库内，必须持续禁止 AI 在该闭环中修改自身。

## 后续拆分路径

如果后续需要将管理应用拆到独立仓库：

1. 移动 `apps/ai-manager` 及其数据库迁移。
2. 将目标仓库路径、GitHub 仓库和验证命令改为外部配置。
3. 迁移 `.local/ai-manager` 下的 SQLite 和日志。
4. 保留领域状态机、Run 队列、Codex、Git 和 GitHub 模块接口。
5. 在需要多用户或远程运行时，再拆 API、Worker 和强隔离执行环境。

MVP 不提前为拆分建设网络协议或插件平台。

## 需要更新的文档

进入实施后按切片更新：

- `docs/plans/2026-06-15/ai-bug-repair-staging-mvp.md`
- `docs/adr/`：记录本地单体控制面、SQLite 事实源和受控自动合并边界
- `docs/ai/context-index.md`
- 根 `AGENTS.md`
- staging 部署、安全、凭据和故障恢复 runbook

## 设计完成定义

本文只有在以下条件成立时才可进入实施计划：

- MVP 边界、状态机、人工门禁和发布范围已经确认。
- 旧管理控制面方案已明确不作为实施依据。
- 没有未决占位符或依赖聊天记录才能解释的关键决策。
- 实施仍受 `L3` 人工审批约束。
