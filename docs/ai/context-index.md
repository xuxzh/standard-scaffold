# AI 上下文索引

这个文件是 AI 新会话进入仓库时的导航地图。它不替代具体 spec、plan 或 runbook，只聚合稳定入口和判断顺序。

## 仓库定位

本仓库是 Turborepo 管理的 pnpm workspace，目标是提供可复用的 React 前端脚手架，并以“文档驱动、验证优先、AI 受控执行”的方式组织开发。

## 阅读路径

### 3 分钟短路径

用于 `L0`、低风险 `L1`、评审前快速定位或已经熟悉仓库的新会话。

1. `AGENTS.md`：仓库级高频规则和不可破坏的边界。
2. `docs/ai/context-index.md`：判断任务类型、阅读分支、代码锚点和验证入口。
3. 当前任务对应入口：按下方“按任务类型分流”选择具体模板、runbook、规范或代码锚点。

### 深路径

用于 `L2`、`L3`、新功能、跨边界改动、业务功能或对仓库不熟悉的新会话。

1. `docs/ai/README.md`：AI 开发日常入口、任务级别和完成定义。
2. `docs/ai/ai-development-governance.md`：任务分级、准入规则和完成定义的规则原文。
3. `docs/adr/README.md`：长期决策索引；只打开与当前任务相关的 ADR。
4. `docs/ai/runbooks/ai-development-runbook.md`：常见执行陷阱和验证习惯。
5. `docs/ai/runbooks/business-feature-ai-delivery-runbook.md`：已有接口文档和 UI 原型的业务功能分步交付流程。
6. 按任务需要读取 `docs/api/`、`docs/ui/`、`docs/standards/` 或对应 `docs/business/` 文档。

## 主要模块地图

- `apps/web`：主 React 19 + Vite + TypeScript 应用。
- `apps/web/src/root-app.tsx`：应用 provider 与 router 组合入口；保留 i18n 副作用导入。
- `apps/web/src/components/layout`：应用壳层，围绕 `AdminLayout`、`AppHeader` 和 `AppSidebar` 组织。
- `apps/web/src/components/ui`：当前应用本地 UI 基础组件；不要默认迁移到 `packages/ui`。
- `apps/web/src/features/*`：按功能组织 contract 和 service。
- `apps/web/src/features/mes/packaging`：MES 包装业务实现；远程请求使用 MES client。
- `apps/web/src/lib/api`：通用 transport、应用级 client 和 HTTP 错误归一化。
- `apps/web-e2e`：Playwright 端到端测试，页面对象在 `pages/`，共享辅助逻辑在 `fixtures/` 和 `helpers/`。
- `apps/api/src/ai-chat`：AI 会话、Hermes SSE、MES 上下文编译与证据持久化。
- `apps/mes-data-mcp`：仅暴露 MES schema 描述与只读查询的 stdio MCP。
- `packages/eslint-config`：共享 ESLint flat config。
- `packages/typescript-config`：共享 TypeScript 配置。
- `packages/ui`：共享 UI 包入口，当前不作为应用本地组件默认存放位置。

## 常见代码锚点

| 任务方向 | 优先阅读锚点 |
| --- | --- |
| 登录/auth | `apps/web/src/features/auth`、`apps/web/src/lib/auth`、`apps/web/src/i18n/resources/*/auth.ts` |
| API/data access | `apps/web/src/lib/api`、对应 `*-contract.ts`、对应 `*-service.ts`、相关 service 测试 |
| MES 包装 | `apps/web/src/features/mes/packaging`、`docs/business/mes/packaging`、`docs/standards/mes-page-data-integration-template.md` |
| 表格 | `apps/web/src/components/data-table`、`docs/ui/components/table-patterns.md`、相关页面或 feature table |
| 表单 | `docs/ui/components/form-patterns.md`、对应 feature form、`apps/web/src/components/ui/field.tsx` |
| 应用壳层 | `apps/web/src/root-app.tsx`、`apps/web/src/components/layout`、`apps/web-e2e/tests/navigation.spec.ts` |
| i18n | `apps/web/src/i18n/config.ts`、`apps/web/src/i18n/resources/zh-CN`、`apps/web/src/i18n/resources/en-US` |
| E2E | `apps/web-e2e/README.md`、`apps/web-e2e/pages`、`apps/web-e2e/fixtures`、`apps/web-e2e/tests` |
| MES AI Chat | `docs/specs/2026-07-13/hermes-mes-ai-chat-design.md`、`docs/plans/2026-07-13/hermes-mes-ai-chat-implementation-plan.md`、`docs/plans/2026-07-14/hermes-mes-ai-visualization-implementation-plan.md`、`packages/ai-visualization-contract`、`apps/api/src/ai-chat/presentation`、`apps/web/src/features/ai-chat/ai-visualization.tsx`、`docs/ai/runbooks/hermes-mes-ai-chat-macos.md`、`docs/ai/runbooks/hermes-mes-ai-chat-ubuntu.md` |

## 长期约束文档

- `docs/api/`：接口契约、错误模型、分页筛选排序等远程集成约束。
- `docs/ui/`：应用壳层、组件复用、页面状态和可访问性等 UI 约束。
- `docs/ui/components/form-patterns.md`：Web 表单默认使用 React Hook Form、Zod 和 shadcn Field 组件体系。
- `docs/standards/`：代码组织、数据分层、状态边界和验证方式等工程规范。

## 稳定架构约定

- Theme 和 i18n provider 包裹在 router 外层；除非有明确设计和验证，不调整 provider 顺序。
- 新增远程资源优先沿用 `contract -> service -> route/component`。
- 组件局部交互状态留在组件内，跨树 UI 偏好用 Context，远程数据交给 React Query。
- E2E 优先断言用户可见行为，选择器优先级为 `getByRole`、稳定文案、`data-testid`。
- 脚手架层面的改动保持通用，避免引入具体业务定制。
- 包装域归属 MES，代码位于 `apps/web/src/features/mes/packaging`，业务请求使用 MES client；WMS client、环境变量、代理、debug 配置和数据导入 module key 是独立保留的 WMS 基础设施，详见 [ADR-0005](../adr/0005-mes-packaging-wms-infrastructure-boundary.md)。
- `docs/plans` 与 `docs/specs` 中 2026-05 的 `wms-*` 包装文档是历史快照，当前实现不得以其中的 WMS 归属或旧 client 描述为依据。

## 任务入口

### 按任务类型分流

| 任务类型 | 阅读入口 | 执行要求 |
| --- | --- | --- |
| `L0` 文案、样式、局部测试修复 | `AGENTS.md`、本文件、相关代码锚点 | 可直接做；必须运行与改动直接相关的最小验证。 |
| `L1` 单目标常规改动 | `docs/ai/templates/task-packet-template.md`、相关规范和代码锚点 | 先明确目标、锚点、假设、验证和非目标，再实施。 |
| `L2` 新功能、跨文件行为、数据流或路由变化 | `docs/ai/ai-development-governance.md`、`docs/ai/templates/feature-spec-template.md` 或 `docs/ai/templates/implementation-plan-template.md` | 先写正式 spec 或 plan，再进入实现；AI 不得自行降级。 |
| 业务功能 + API/UI 原型 | `docs/ai/runbooks/business-feature-ai-delivery-runbook.md`、对应 `docs/business/`、`docs/api/`、`docs/ui/` | 按 spec、plan、可验证切片推进。 |
| 评审 | `docs/ai/checklists/ai-review-checklist.md`、相关 ADR、相关代码锚点 | 先找行为回归、边界破坏、验证缺失和测试缺口。 |
| `L3` CI、依赖、鉴权、安全、仓库级约定 | `docs/ai/ai-development-governance.md`、相关 ADR、相关脚本或配置 | 人工主导；先查验正式 spec 或 plan，AI 只做分析、草案、验证辅助和明确批准范围内的受控 patch。 |

## 进入实现前准入门禁

AI 进入实质性编辑前，必须先满足以下准入条件，并在任务复杂度需要时写入 task packet、spec 或 plan：

- 任何代码改动前，先说明任务级别：`L0`、`L1`、`L2` 或 `L3`。
- 当前分支检查：不得在 `main` / `master` 直接编辑或提交开发改动；如当前在主分支，先切到任务分支或创建隔离 worktree。
- 分支与 worktree 选择：默认使用任务分支，分支名优先使用工具无关的约定式前缀 + kebab-case 描述（`feat/`、`fix/`、`docs/`、`chore/`、`refactor/`，按改动性质选择），如 `feat/<task-slug>`；并行任务、长任务、`L2/L3` 或高风险改动优先使用 `.worktrees/` 下的 worktree。
- 主锚点文件：最接近行为控制处的文件或符号。
- 非目标：本次明确不改的行为、模块或文档。
- 最小验证命令：能证明当前切片成立的最窄检查。
- 是否需要 spec/plan：`L2` 及以上必须先查验正式 spec 或 plan，`L1` 至少需要 task packet。
- 正式 spec 和 plan 统一位于 `docs/specs/`、`docs/plans/`；聊天计划、临时 TODO、`update_plan` 输出不算正式文档。
- 用户明确指定 `L2` 或 `L3` 时，AI 无权自行降级；如分级存在争议，按更高风险级别处理。
- `L3` 不允许被当作普通 `L2` 直接执行，必须明确人工主导和 AI 的批准边界。
- 是否需要文档回写：触及长期边界、默认做法、验证路径或高频坑时需要。

## 验证入口

- 完整验证：`pnpm verify`
- Web 局部验证：`pnpm verify:web`
- E2E 验证：`pnpm verify:e2e`
- MES AI 确定性 E2E：`pnpm --filter @repo/web-e2e test:e2e:ai-chat`
- MES AI 可视化最窄验证：`pnpm --filter @repo/ai-visualization-contract test`、`pnpm --filter @repo/api test -- ai-visualization-materializer presentation-transcript`、`pnpm --filter @repo/web test -- vega-lite-spec ai-visualization ai-chat-sheet`
- 基础命令：`pnpm lint`、`pnpm typecheck`、`pnpm --filter @repo/web test`、`pnpm build`

AI 汇报时必须说明实际运行了哪些命令、哪些通过、哪些未运行及原因。

## 文档回写规则

以下情况需要同步更新文档：

- 改动改变长期边界、默认做法或验证路径。
- 修复暴露出未来高概率重复出现的坑。
- 新增或拒绝某个会影响后续 AI 判断的长期决策。
- CI、部署、依赖、安全或环境行为发生变化。

判断依据进入 `docs/specs`、`docs/adr`、`docs/api`、`docs/ui`、`docs/standards`、`docs/ai/runbooks` 或 `AGENTS.md`，不要只留在聊天记录里。
