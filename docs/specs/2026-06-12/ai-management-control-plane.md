# AI 驱动研发管理控制面设计

日期：2026-06-12

## 背景

当前 monorepo 已包含以下应用与基础能力：

- `apps/web`：React 管理端应用。
- `apps/api`：NestJS API 应用。
- `apps/docs`：独立文档站。
- `apps/web-e2e`：Playwright 端到端测试。
- `docs/ai`、`docs/specs`、`docs/plans`：AI 开发治理、设计和实施计划。
- `L0` 至 `L3` 任务分级、人工审批门、验证证据和 GitLab MR 模板。

现有治理已经定义了“文档驱动、验证优先、AI 受控执行”的原则，但这些规则主要依靠文档和人工执行，尚未形成可运行的研发管理控制面。缺陷、AI 评估、人工批准、隔离修复、验证证据和代码变更之间也缺少统一状态、审计记录和自动编排。

本设计新增一组独立管理应用，将现有治理规则转化为可执行工作流。第一阶段聚焦“缺陷录入到 Pull Request 创建”的单仓库闭环，验证 AI 受控参与研发的可行性，再逐步扩展需求、发布、部署、回滚和通知能力。

## 目标

在当前 monorepo 中设计一套独立的 AI 驱动研发管理控制面，使管理员可以：

1. 手工录入当前仓库的缺陷。
2. 让只读 AI Agent 评估缺陷并生成结构化执行合同草案。
3. 审阅、调整并批准不可变的执行合同。
4. 由独立 Worker 在隔离环境中运行 Codex CLI 完成修复和验证。
5. 由平台独立校验实际 diff、路径范围和验证证据。
6. 通过 GitHub 适配器创建分支、提交和 Pull Request。
7. 查看完整运行日志、验证证据、成本和审计记录。

平台最终目标是形成受控学习闭环：根据历史执行结果生成改进提案，经人工审批后版本化应用，并能比较效果或回滚。AI 不拥有自行修改治理规则、合并代码或发布生产环境的权限。

## 非目标

第一阶段不实现：

- 通用需求管理流程。
- 自动合并 Pull Request。
- 部署、发布、回滚和通知执行。
- 多仓库、多组织或多租户管理。
- 多用户、RBAC、OIDC 或 LDAP。
- GitLab SCM/CI 适配器。
- Claude Code CLI 适配器。
- GitHub Issue、监控告警或外部反馈自动导入。
- AI 自动应用提示词、规则、模板或知识库改进。
- AI 访问生产环境、部署密钥或主分支写权限。
- 复杂项目管理能力，例如迭代、工时、资源排期和财务核算。

## 范围级别与执行边界

本任务属于 `L3`：

- 新增跨 workspace 的管理 Web、管理 API 和 Worker。
- 引入数据库、任务派发、容器隔离和外部 SCM 集成。
- 涉及 AI 执行权限、凭据、安全和审计。
- 后续会影响 CI/CD 和发布治理边界。

`L3` 必须由人工主导。AI 在本阶段只负责设计草案、风险分析和文档整理；进入实施前必须另行批准正式实施计划。后续任何 CI、部署、密钥、权限和生产环境变更都需要单独审批，不能由本设计自动授权。

## 已确认决策

| 决策项 | 结论 |
| --- | --- |
| 业务事实源 | 管理项目自有 PostgreSQL 数据库 |
| SCM/CI 绑定 | 定义统一适配层，领域模型不绑定具体平台 |
| MVP SCM | GitHub |
| AI 自动化边界 | 人工批准后可自动修复、验证并创建 PR |
| MVP 主流程 | 缺陷闭环 |
| Agent 执行位置 | 独立、隔离的 Worker |
| 仓库范围 | 仅当前 monorepo |
| 用户模型 | 单管理员 |
| 审批粒度 | 批准结构化、不可变的执行合同 |
| 缺陷入口 | 仅管理界面手工录入 |
| Agent 架构 | 可插拔 `AgentRunner` |
| MVP Agent | Codex CLI |
| 后续 Agent | Claude Code CLI 等其他适配器 |
| 应用边界 | 独立管理 Web、管理 API、管理 Worker |
| 任务派发 | PostgreSQL Outbox + Worker 租约轮询 |
| 自进化含义 | AI 生成改进提案，人工批准后版本化应用 |

## 总体架构

```text
┌──────────────────────────┐
│ apps/management-web      │
│ 缺陷、审批、运行与审计   │
└─────────────┬────────────┘
              │ Domain Commands / Queries
┌─────────────▼────────────┐
│ apps/management-api      │
│ 状态机、合同、审批、审计 │
└───────┬───────────┬──────┘
        │           │
┌───────▼───────┐   │
│ PostgreSQL    │   │
│ Domain Data   │   │
│ Audit + Outbox│   │
└───────┬───────┘   │
        │ Lease      │
┌───────▼────────────▼──────┐
│ apps/management-worker    │
│ 隔离、调度、策略与证据校验│
└────────┬───────────┬──────┘
         │           │
┌────────▼───────┐ ┌─▼────────────────┐
│ AgentRunner    │ │ ScmProvider       │
│ CodexCliRunner │ │ GitHubProvider    │
└────────────────┘ └──────────────────┘
```

### 事实源边界

- PostgreSQL 是缺陷、评估、执行合同、审批、Agent 运行、证据和审计记录的唯一事实源。
- GitHub 是远程分支、Commit、Pull Request 和代码评审状态的事实源。
- Git 仓库中的实际 diff 是代码变更事实，不采用 Agent 自述作为最终判断依据。
- Agent CLI 是执行工具，不是业务状态或审批状态的事实源。

## 应用与模块边界

### `apps/management-web`

职责：

- 缺陷录入和详情展示。
- AI 评估、风险和根因假设展示。
- 执行合同编辑、差异比较和审批。
- Agent 运行状态、结构化事件、日志和验证证据展示。
- PR 链接、外部状态和完整审计时间线展示。

约束：

- 前端只能发送领域命令，不能直接指定目标状态。
- 前端不能绕过审批启动 Agent。
- 前端不持有 GitHub Token、模型密钥或 Worker 凭据。

### `apps/management-api`

职责：

- 管理缺陷、评估、执行合同、审批和审计。
- 执行缺陷状态机和领域不变量。
- 在业务事务中写入 Outbox 事件。
- 管理合同版本和审批绑定关系。
- 提供管理端查询模型。
- 接收 Worker 的幂等运行事件和结果回写。

约束：

- 所有状态迁移必须由显式领域命令触发。
- API 不在请求生命周期中运行 Agent 或长时间 Git 操作。
- API 不直接解析某一种 Agent CLI 的输出格式。

### `apps/management-worker`

职责：

- 使用租约和心跳领取 Outbox 任务。
- 创建一次性容器和独立工作区。
- 准备只读评估上下文或受限写入执行上下文。
- 调用 `AgentRunner`。
- 独立检查基线 Commit、实际 diff、修改路径和验证证据。
- 调用 `ScmProvider` 创建远程分支、Commit 和 PR。
- 向 API 回写结构化事件、证据和终态。

约束：

- Worker 不直接修改业务状态表。
- Worker 不拥有主分支直接写入权限。
- Worker 不拥有合并 PR、部署或生产环境访问权限。
- 评估任务和执行任务使用不同权限配置。

## 可插拔 Agent 执行边界

平台不把 Codex CLI 作为领域模型的一部分，而是定义稳定的执行接口。

```ts
interface AgentRunner {
  getCapabilities(): Promise<AgentCapabilities>
  execute(input: AgentExecutionInput): Promise<AgentExecutionResult>
  cancel(runId: string): Promise<void>
}
```

统一输入至少包括：

- `runId`
- 仓库地址和基线 Commit
- Agent 运行模式：`assessment` 或 `implementation`
- 已批准的执行合同快照
- 允许读取和修改的路径
- 验证命令
- 超时、CPU、内存和磁盘限制
- 网络访问策略
- 可用上下文文件清单

统一输出至少包括：

- 运行终态和退出原因
- 结构化事件流
- 实际变更文件和 Commit
- 验证命令结果
- 重新审批请求
- token、时长和费用等统计
- 原始日志引用和脱敏日志引用

MVP 实现：

```text
AgentRunner
└── CodexCliRunner
```

后续扩展：

```text
AgentRunner
├── CodexCliRunner
└── ClaudeCodeCliRunner
```

不同 CLI 的非交互参数、权限模式、会话恢复、流式输出和错误格式只存在于各自 Runner 中。Worker 和领域层只处理统一事件：

```text
RUN_STARTED
COMMAND_STARTED
COMMAND_COMPLETED
FILES_CHANGED
VALIDATION_COMPLETED
REAPPROVAL_REQUIRED
RUN_COMPLETED
RUN_FAILED
RUN_CANCELLED
```

平台不得通过解析 Agent 的自然语言总结来判断任务是否成功。

## SCM 适配边界

统一 SCM 接口负责代码平台操作，领域层不出现 GitHub 专有对象。

```ts
interface ScmProvider {
  getRepository(ref: RepositoryRef): Promise<RepositorySnapshot>
  createBranch(input: CreateBranchInput): Promise<BranchRef>
  pushCommit(input: PushCommitInput): Promise<CommitRef>
  createChangeRequest(
    input: CreateChangeRequestInput,
  ): Promise<ChangeRequestRef>
  getChangeRequest(
    ref: ChangeRequestRef,
  ): Promise<ChangeRequestSnapshot>
}
```

MVP 实现 `GitHubProvider`。未来 GitLab 适配器将 Merge Request 映射为统一的 `ChangeRequest`，不改变缺陷状态机。

## 核心领域模型

### `Defect`

记录缺陷本身：

- 标题、描述、复现步骤和期望结果。
- 严重级别、影响范围和管理员备注。
- 当前状态和乐观锁版本。
- 当前评估、合同和运行引用。

### `Assessment`

记录一次 AI 评估：

- 根因假设和证据。
- 风险级别与建议任务级别。
- 建议方案、备选方案和非目标。
- 推荐修改范围和验证方式。
- 使用的 Agent、模型、提示模板和知识版本。

评估只能读取仓库，不允许修改工作区或推送远程内容。

### `ExecutionContract`

执行合同是管理员批准的不可变执行边界：

- 目标和成功标准。
- 基线 Commit。
- 允许读取路径。
- 允许修改路径。
- 必须执行的验证命令。
- 明确禁止的行为。
- 资源、网络和超时限制。
- 风险级别。
- 合同版本和内容摘要。

合同草案可以编辑；批准后内容不可修改。任何调整都必须创建新版本并重新审批。

### `Approval`

记录：

- 批准、拒绝或要求修改。
- 操作者和时间。
- 绑定的合同版本、内容摘要和基线 Commit。
- 审批意见。

MVP 虽为单管理员，仍保留操作者字段，避免后续引入用户体系时丢失审计语义。

### `AgentRun`

一次独立的 Agent 执行：

- 运行类型、Agent Runner 类型和版本。
- 合同版本和基线 Commit。
- 租约、心跳、开始和结束时间。
- 终态、退出原因和失败分类。
- 资源消耗、token 和费用统计。
- 工作区快照和日志引用。

重试必须创建新的 `AgentRun`，不能覆盖历史记录。

### `Evidence`

记录平台可验证的证据：

- Git diff 和变更文件清单。
- 命令、退出码、标准输出和标准错误引用。
- 测试、lint、typecheck、build 和 E2E 结果。
- 路径越界检查、基线检查和策略检查结果。
- 报告、截图或其他制品引用。

### `CodeChange`

记录外部代码变更引用：

- SCM Provider 类型。
- 仓库、分支和 Commit。
- Change Request 编号、URL 和状态。
- 幂等键和最后同步时间。

### `AuditEvent`

追加式记录所有关键业务动作：

- 聚合类型和 ID。
- 事件类型、操作者和时间。
- 前后状态。
- 关联合同、运行和代码变更。
- 经过脱敏的结构化载荷。

审计事件不可原地修改或删除。

## 缺陷状态机

主流程：

```text
DRAFT
  -> SUBMITTED
  -> ASSESSING
  -> WAITING_FOR_APPROVAL
  -> APPROVED
  -> EXECUTING
  -> VERIFYING
  -> PR_CREATED
  -> RESOLVED
```

异常和返工路径：

```text
WAITING_FOR_APPROVAL -> NEEDS_REVISION -> ASSESSING
WAITING_FOR_APPROVAL -> REJECTED
EXECUTING -> REAPPROVAL_REQUIRED -> WAITING_FOR_APPROVAL
EXECUTING -> FAILED
VERIFYING -> FAILED
FAILED -> RETRY_APPROVAL -> APPROVED
PR_CREATED -> CHANGES_REQUESTED -> WAITING_FOR_APPROVAL
PR_CREATED -> REJECTED
```

状态约束：

- 只有已提交缺陷可以进入评估。
- 没有评估和执行合同草案不能进入待审批。
- 只有绑定当前合同版本和基线 Commit 的有效审批才能进入 `APPROVED`。
- 只有 `APPROVED` 状态可以创建实现型 `AgentRun`。
- 路径越界、验证命令变化或基线漂移必须进入 `REAPPROVAL_REQUIRED`。
- 创建 PR 后不能自动进入 `RESOLVED`。
- `RESOLVED` 要求 PR 已合并且管理员完成最终确认。
- 非法迁移必须由 API 拒绝并写入安全审计记录。

## 端到端数据流

### 缺陷评估

1. 管理员在管理端录入缺陷并提交。
2. API 创建缺陷和 `ASSESS_DEFECT` Outbox 事件。
3. Worker 领取任务，校验租约和幂等键。
4. Worker 创建只读、默认断网的评估环境。
5. `CodexCliRunner` 读取仓库治理文档和缺陷上下文。
6. Runner 返回结构化评估和执行合同草案。
7. API 持久化评估、合同草案和证据，并进入待审批。

### 批准与执行

1. 管理员编辑合同草案。
2. API 创建新合同版本。
3. 管理员批准指定合同版本和基线 Commit。
4. API 在同一事务中写入审批和 `EXECUTE_CONTRACT` Outbox 事件。
5. Worker 创建一次性容器和独立工作区。
6. Worker 检出指定基线 Commit，并再次确认基线未漂移。
7. `CodexCliRunner` 在合同允许范围内修改和验证。
8. Worker 独立读取 Git diff，检查路径和策略。
9. Worker 重新执行合同要求的验证命令，不直接复用 Agent 自述结果。
10. 验证通过后，`GitHubProvider` 幂等创建分支、Commit 和 PR。
11. API 保存证据和外部引用，缺陷进入 `PR_CREATED`。

### 最终确认

1. 平台定期查询或通过后续 webhook 同步 PR 状态。
2. PR 合并后仍保留在待确认状态。
3. 管理员确认缺陷已解决后进入 `RESOLVED`。

MVP 可以先使用定时查询同步 PR 状态，避免首版同时建设 webhook 鉴权、重放和去重。

## Outbox 与任务可靠性

第一阶段采用 PostgreSQL Outbox，不引入 Redis 或独立工作流引擎。

要求：

- 领域状态变化和 Outbox 写入必须处于同一数据库事务。
- 每个任务具有稳定幂等键。
- Worker 使用租约和心跳领取任务。
- 租约过期后允许其他 Worker 接管。
- 重试次数有限，并记录每次失败原因。
- 业务执行重试创建新 `AgentRun`。
- PR 创建失败只重试 SCM 操作，不重复运行代码修复。
- 同一执行合同最多产生一个有效代码变更引用。

当并发量、定时编排或补偿流程明显超出 PostgreSQL Outbox 能力时，再评估 BullMQ、Temporal 或其他工作流引擎。

## 安全设计

### 隔离与最小权限

- 每次 Agent 运行使用一次性容器和独立工作区。
- 评估阶段工作区只读。
- 实现阶段仅向 Agent 暴露合同允许的工作目录。
- Agent 默认断网；按任务显式开放模型 API、SCM 和批准的依赖源。
- 凭据按运行临时注入，任务结束后失效。
- Agent 不获得生产凭据、部署密钥或主分支写权限。

### 独立策略校验

- 平台以实际 Git diff 校验修改范围。
- 平台独立运行批准的验证命令。
- 平台检查新增文件、删除、重命名、子模块和符号链接。
- 合同禁止行为不能仅依赖提示词约束。
- 越界时停止执行，不推送分支，不创建 PR。

### 不可信输入

- 缺陷文本、仓库文件、依赖日志和 Agent 输出均视为不可信输入。
- 系统提示、合同和仓库内容必须分层传递，不能直接拼接为无边界文本。
- 日志、错误和证据展示需要转义，避免前端注入。
- 日志持久化前执行密钥和个人信息脱敏。
- 原始敏感日志如必须保留，应使用更严格的访问和保留策略。

### 命令与网络策略

- 合同中的验证命令来自管理员可编辑的结构化清单。
- Worker 只执行满足命令策略的条目。
- 不允许任意 shell 拼接、动态重定向或未批准的脚本下载。
- 依赖安装是否允许联网必须由合同明确指定。

## 失败处理

| 场景 | 处理 |
| --- | --- |
| 基线 Commit 漂移 | 停止并重新审批 |
| 修改越界 | 停止、保存证据、不得创建 PR |
| 验证命令被 Agent 改变 | 忽略 Agent 变更，按合同重新执行；必要时重新审批 |
| Worker 崩溃 | 租约过期后创建新运行，保留原运行证据 |
| Agent 超时 | 终止容器，记录超时分类，等待人工决定 |
| 测试失败 | 保存证据，允许重新评估、修改合同或终止 |
| SCM 暂时失败 | 幂等重试 SCM 阶段 |
| PR 已由前次请求创建 | 复用外部引用，不重复创建 |
| 管理员取消 | 发出取消命令，Runner 尽力终止，最终由 Worker 确认 |
| 日志包含疑似密钥 | 脱敏并创建安全审计事件 |

## 受控自进化

“自进化”不是 AI 自行修改自身代码或治理规则，而是一个可审计的实验闭环：

```text
执行记录
  -> 指标与失败分类
  -> AI 生成改进提案
  -> 人工评审
  -> 版本化规则、模板或知识
  -> 小范围试运行
  -> 效果对比
  -> 保留或回滚
```

可以被提议改进的对象：

- 缺陷评估提示模板。
- 执行合同模板。
- 失败分类规则。
- 验证命令推荐规则。
- 仓库知识和运行手册。
- Agent Runner 参数。

约束：

- AI 只能创建改进提案，不能直接激活。
- 每个规则、模板和知识版本都有稳定版本号。
- 每个 `Assessment` 和 `AgentRun` 记录实际使用的版本。
- 激活和回滚必须由管理员执行并产生审计事件。
- 效果比较必须控制样本范围，不能仅凭单次成功判断改进有效。

## MVP 页面

第一阶段管理端只需要：

- 缺陷列表。
- 新建缺陷。
- 缺陷详情与状态时间线。
- AI 评估与执行合同审阅。
- 审批确认。
- Agent 运行日志和证据。
- PR 信息和最终解决确认。

不建设通用看板、复杂筛选器、报表设计器或可配置工作流编辑器。

## MVP API 能力

API 以领域命令和查询为中心：

- 创建、更新草稿和提交缺陷。
- 启动或重新启动评估。
- 查询评估和合同版本。
- 创建合同新版本。
- 批准、拒绝或要求修改合同。
- 启动、取消和批准重试。
- 查询运行事件、日志、证据和代码变更。
- 回写 Worker 事件和结果。
- 同步 PR 状态。
- 最终确认解决。

具体 HTTP 路径和 DTO 在实施计划前另行形成 API 契约，不在本架构设计中固定。

## 测试策略

### 领域测试

- 缺陷状态机所有合法和非法迁移。
- 合同批准后不可修改。
- 审批必须绑定合同版本和基线 Commit。
- 重试必须创建新 `AgentRun`。
- `RESOLVED` 的合并和人工确认前置条件。

### 适配器契约测试

- `AgentRunner` 统一输入、事件和终态语义。
- `CodexCliRunner` 对退出码、超时、取消和结构化输出的映射。
- `ScmProvider` 的分支、Commit、Change Request 和幂等行为。
- `GitHubProvider` 使用测试仓库或录制响应验证平台差异。

### Worker 集成测试

- Outbox 领取、租约、心跳和过期接管。
- 重复投递不会产生重复 PR。
- 越界修改会被拒绝。
- Worker 崩溃后可以恢复。
- SCM 失败不会重复执行 Agent。
- 日志和证据按运行隔离。

### 安全测试

- 路径穿越、符号链接和删除越界。
- 缺陷文本和仓库中的提示注入样例。
- 日志密钥脱敏。
- 未批准合同无法执行。
- Agent 无法访问主分支和生产凭据。

### 端到端验收

使用独立测试仓库完成一次真实闭环：

1. 录入一个可复现缺陷。
2. 生成评估和执行合同。
3. 人工批准。
4. Codex CLI 修改测试仓库。
5. 平台独立验证。
6. GitHub 创建 PR。
7. 管理端展示完整证据与审计时间线。

## MVP 验收标准

- 非法状态迁移被 API 拒绝。
- 未批准合同不能启动执行。
- 合同版本、批准记录和基线 Commit 可追溯。
- 评估 Agent 无法修改仓库。
- 实现 Agent 越界修改会中止且不创建 PR。
- Worker 重复领取不会产生重复运行副作用或重复 PR。
- Worker 崩溃后可安全恢复或由管理员批准重试。
- 平台以实际 diff 和独立验证结果判断成功。
- Codex Runner 可通过契约测试替换为模拟 Runner。
- GitHub Provider 可通过契约测试替换为模拟 SCM。
- 管理端可以查看完整日志、证据、费用和审计记录。
- 测试仓库真实端到端流程可以稳定创建一个有效 PR。

## 推荐实施顺序

本设计规模较大，不能作为一个不分阶段的实现任务。建议按以下垂直切片实施：

1. 领域模型、状态机、审计和 Outbox。
2. 缺陷录入、评估展示和合同审批界面。
3. Worker 隔离执行框架和模拟 `AgentRunner`。
4. `CodexCliRunner` 与独立验证。
5. `GitHubProvider` 和 PR 创建闭环。
6. 真实测试仓库端到端验收与安全加固。

每个切片都需要独立验证，涉及容器、凭据、网络、GitHub 权限或 CI 的步骤仍按 `L3` 单独审批。

## 后续演进路线

```text
MVP 缺陷闭环
  -> ClaudeCodeCliRunner
  -> 多用户与 RBAC
  -> 需求到 PR
  -> 发布审批与部署
  -> 监控和人工回滚
  -> 规则改进实验系统
```

新增 Claude Code CLI 时只增加 `ClaudeCodeCliRunner` 及其契约测试，不改变领域状态机、执行合同、Worker 安全校验或 SCM 接口。

## 备选方案

### 复用现有 Web 和 API

优点是新增应用少。缺点是研发管理控制面会与产品业务路由、权限、数据模型和部署节奏耦合，也会让拥有高权限的 Worker 能力靠近业务 API。已拒绝。

### 使用 Redis/BullMQ

任务能力更丰富，但会引入数据库和队列双写一致性以及额外运维组件。MVP 并发量有限，先使用 PostgreSQL Outbox。保留稳定派发边界，后续可以替换。

### 使用 Temporal 或 Camunda

长事务、审批、补偿和可视化能力完善，但初期复杂度和运维成本过高。只有流程数量和并发复杂度显著增长时再评估。

### 首版绑定 Codex CLI

实现最直接，但会把执行协议和某个 CLI 的专有行为泄漏到 Worker。已调整为可插拔 `AgentRunner`，MVP 只交付 Codex 适配器。

## 风险

- 隔离边界不足可能导致 Agent 读取凭据、修改越界或访问不应开放的网络。
- CLI 输出格式和非交互行为变化可能破坏 Runner，需要版本锁定和契约测试。
- 自有数据库成为事实源后，需要认真处理迁移、备份、恢复和审计保留。
- 单管理员模式降低首版复杂度，但上线到多人环境前必须补身份认证和 RBAC。
- PostgreSQL Outbox 简单可靠，但不适合无限增长的高并发长流程。
- GitHub API 限流、权限和幂等细节需要在实施前通过测试仓库验证。
- 如果过早加入需求、发布和可配置工作流，MVP 会失去可验证的单一闭环。

## 需要更新的文档

本设计阶段：

- 新增 `docs/specs/2026-06-12/ai-management-control-plane.md`。

设计批准并进入实施计划后：

- 新增对应 `docs/plans/2026-06-12/` 下的分阶段实施计划。
- 新增长期架构 ADR，记录管理数据库事实源、`AgentRunner`、`ScmProvider` 和受控自进化边界。
- 更新 `docs/ai/context-index.md` 的模块地图和任务入口。
- 实现后更新根 `AGENTS.md` 的 workspace 结构和验证命令。
- 涉及运行环境时新增安全、部署、凭据和故障恢复 runbook。
