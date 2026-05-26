# AI 上下文索引

这个文件是 AI 新会话进入仓库时的导航地图。它不替代具体 spec、plan 或 runbook，只聚合稳定入口和判断顺序。

## 仓库定位

本仓库是 Turborepo 管理的 pnpm workspace，目标是提供可复用的 React 前端脚手架，并以“文档驱动、验证优先、AI 受控执行”的方式组织开发。

## 先读顺序

1. `AGENTS.md`：仓库级高频规则和不可破坏的边界。
2. `docs/ai/README.md`：AI 开发日常入口、任务级别和完成定义。
3. `docs/ai/ai-development-governance.md`：AI 治理基线。
4. `docs/adr/README.md`：长期决策索引。
5. `docs/ai/runbooks/ai-development-runbook.md`：常见执行陷阱和验证习惯。
6. `docs/ai/runbooks/business-feature-ai-delivery-runbook.md`：已有接口文档和 UI 原型的业务功能分步交付流程。

## 主要模块地图

- `apps/web`：主 React 19 + Vite + TypeScript 应用。
- `apps/web/src/root-app.tsx`：应用 provider 与 router 组合入口；保留 i18n 副作用导入。
- `apps/web/src/components/layout`：应用壳层，围绕 `AdminLayout`、`AppHeader` 和 `AppSidebar` 组织。
- `apps/web/src/components/ui`：当前应用本地 UI 基础组件；不要默认迁移到 `packages/ui`。
- `apps/web/src/features/*`：按功能组织 contract 和 service。
- `apps/web/src/lib/api`：通用 transport、应用级 client 和 HTTP 错误归一化。
- `apps/web-e2e`：Playwright 端到端测试，页面对象在 `pages/`，共享辅助逻辑在 `fixtures/` 和 `helpers/`。
- `packages/eslint-config`：共享 ESLint flat config。
- `packages/typescript-config`：共享 TypeScript 配置。
- `packages/ui`：共享 UI 包入口，当前不作为应用本地组件默认存放位置。

## 长期约束文档

- `docs/api/`：接口契约、错误模型、分页筛选排序等远程集成约束。
- `docs/ui/`：应用壳层、组件复用、页面状态和可访问性等 UI 约束。
- `docs/ui/form-patterns.md`：Web 表单默认使用 React Hook Form、Zod 和 shadcn Field 组件体系。
- `docs/standards/`：代码组织、数据分层、状态边界和验证方式等工程规范。

## 稳定架构约定

- Theme 和 i18n provider 包裹在 router 外层；除非有明确设计和验证，不调整 provider 顺序。
- 新增远程资源优先沿用 `contract -> service -> route/component`。
- 组件局部交互状态留在组件内，跨树 UI 偏好用 Context，远程数据交给 React Query。
- E2E 优先断言用户可见行为，选择器优先级为 `getByRole`、稳定文案、`data-testid`。
- 脚手架层面的改动保持通用，避免引入具体业务定制。

## 任务入口

- `L0`：局部低风险改动，可直接做，但必须有最小验证。
- `L1`：从 `docs/ai/templates/task-packet-template.md` 开始，明确目标、锚点、假设、验证和非目标。
- `L2`：先写 spec 或 plan，再进入实现。
- 已有接口文档和 UI 原型的业务功能：从 `docs/ai/runbooks/business-feature-ai-delivery-runbook.md` 开始，按 spec、plan、可验证切片推进。
- `L3`：人工主导，AI 只做分析、草案、验证辅助和风险评审。

## 验证入口

- 完整验证：`pnpm verify`
- Web 局部验证：`pnpm verify:web`
- E2E 验证：`pnpm verify:e2e`
- 基础命令：`pnpm lint`、`pnpm typecheck`、`pnpm --filter @repo/web test`、`pnpm build`

AI 汇报时必须说明实际运行了哪些命令、哪些通过、哪些未运行及原因。

## 文档回写规则

以下情况需要同步更新文档：

- 改动改变长期边界、默认做法或验证路径。
- 修复暴露出未来高概率重复出现的坑。
- 新增或拒绝某个会影响后续 AI 判断的长期决策。
- CI、部署、依赖、安全或环境行为发生变化。

判断依据进入 `docs/specs`、`docs/adr`、`docs/api`、`docs/ui`、`docs/standards`、`docs/ai/runbooks` 或 `AGENTS.md`，不要只留在聊天记录里。
