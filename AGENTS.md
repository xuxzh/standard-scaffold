# AGENTS.md

这个仓库是一个由 Turborepo 管理的 pnpm workspace。优先做小而聚焦的修改，并保持脚手架的可复用性。

## 工作区结构

- `apps/web`：主 React 19 + Vite + TypeScript 应用
- `apps/web-e2e`：针对 `apps/web` 的 Playwright 端到端测试
- `packages/ui`：共享 UI 包入口，目前内容较少
- `packages/eslint-config`：共享 ESLint flat config
- `packages/typescript-config`：共享 TypeScript 基础配置

## 常用命令

- 安装依赖：`pnpm install`
- 启动全部开发任务：`pnpm dev`
- 构建全部 workspace：`pnpm build`
- 检查全部 workspace：`pnpm lint`
- 对全部 workspace 做类型检查：`pnpm typecheck`
- 在仓库根目录运行 E2E：`pnpm test:e2e`

做定向工作时，优先使用带 `--filter` 的命令：

- Web 应用测试：`pnpm --filter @repo/web test`
- Web 应用类型检查：`pnpm --filter @repo/web typecheck`
- Web 应用 lint：`pnpm --filter @repo/web lint`
- E2E 测试：`pnpm --filter @repo/web-e2e test:e2e`

## Web 应用约定

- 使用 `pnpm`，不要使用 `npm` 或 `yarn`。
- `apps/web` 使用 `@/` 指向 `src/*`。如果修改路径别名，需要同时保持 `tsconfig.json`、`vite.config.ts` 和 `vitest.config.ts` 一致。
- 应用当前使用的 UI 基础组件位于 `apps/web/src/components/ui`。除非任务明确要求做共享封装，否则不要迁移到 `packages/ui`。
- 应用壳层围绕 `AdminLayout`、`AppHeader` 和 `AppSidebar` 组织。
- I18n 通过 `apps/web/src/root-app.tsx` 中的副作用导入完成初始化。修改应用启动流程时，保留这个导入。
- Theme 和 i18n provider 包裹在 router 外层。除非变更确有需要且已经验证，否则不要调整 provider 顺序。

## 测试约定

- `apps/web` 使用 Vitest、jsdom 和 Testing Library。
- `apps/web/src/test/setup.ts` 包含 `matchMedia` 等浏览器 API 的测试 shim。
- `apps/web-e2e` 使用 Playwright，页面对象放在 `pages/`，共享辅助逻辑放在 `fixtures/` 和 `helpers/`。
- E2E 测试优先断言用户可见行为。
- E2E 选择器优先级是：`getByRole`、稳定文案、`data-testid`。
- 不要在 E2E 测试中依赖 Tailwind 类名或脆弱的 DOM 结构。

## 项目边界

- 除非任务明确是产品定制，否则脚手架层面的改动应保持通用。
- 优先沿用 `apps/web/src/components`、`routes` 和 `i18n` 中已有模式，不要平行再造一套结构。
- 将 `packages/ui` 视为按需使用的共享基础设施，而不是应用本地组件的默认存放位置。

## AI 驱动开发约定

- 仓库默认采用“文档驱动、验证优先、AI 受控执行”的工作方式。
- 新功能、跨文件改动、数据流调整和中等以上重构，先写 spec 或 plan，再进入实现。
- 局部小改动可以直接做，但必须附最小验证，且不要顺手扩大范围。
- 新生成或新增的仓库文档默认使用中文；除非任务明确要求或引用内容必须保留原文，否则不要输出英文文档主体。
- 完整治理基线见 `docs/superpowers/specs/2026-05-25-ai-driven-development-governance-design.md`。
- 日常入口、模板、清单和 runbook 见 `docs/superpowers/README.md`。

## 参考文档

- Monorepo 设计： [docs/superpowers/specs/2026-05-12-frontend-monorepo-design.md](docs/superpowers/specs/2026-05-12-frontend-monorepo-design.md)
- E2E 测试说明： [apps/web-e2e/README.md](apps/web-e2e/README.md)

## 校验说明

- Turbo 任务定义在 `turbo.json` 中；`build`、`lint` 和 `typecheck` 按拓扑顺序执行。
- 本地 E2E 默认访问 `http://127.0.0.1:4173`，并可自动启动 Web 应用。
- Staging E2E 运行需要 `E2E_MODE=staging` 和 `E2E_BASE_URL`。
