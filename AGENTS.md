# AGENTS.md

这个仓库是由 Turborepo 管理的 pnpm workspace

## 工作区结构

- `apps/web`：主 React 19 + Vite + TypeScript 应用
- `apps/web-e2e`：针对 `apps/web` 的 Playwright 端到端测试
- `packages/ui`：共享 UI 包入口，目前内容较少
- `packages/eslint-config`：共享 ESLint flat config
- `packages/typescript-config`：共享 TypeScript 基础配置

## 常用命令

- 安装依赖：`pnpm install`
- 启动全部开发任务：`pnpm dev`
- 完整验证：`pnpm verify`
- Web 局部验证：`pnpm verify:web`
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
- 主要方法、类、属性在语义不直观或存在边界约束时必须补充代码注释；详细规则遵循 `docs/standards/web-code-guidelines.md` 的“注释约定”。
- 应用当前使用的 UI 基础组件位于 `apps/web/src/components/ui`。除非任务明确要求做共享封装，否则不要迁移到 `packages/ui`。
- 涉及 `apps/web` 的界面开发时，优先复用 `apps/web/src/components/ui` 中已有的 shadcn 组件和本地封装组件；如果仓库中缺少合适的通用组件，优先按现有项目方式拉取对应的 shadcn 组件，而不是自行从零实现；仅在 shadcn 组件无法满足需求且组合、样式扩展也不合理时，才新增本地定制组件或封装。
- 拉取新的 shadcn 组件时，应优先保持与现有组件体系和样式约定一致，避免重复引入能力重叠的组件。
- 应用壳层围绕 `AdminLayout`、`AppHeader` 和 `AppSidebar` 组织。
- I18n 通过 `apps/web/src/root-app.tsx` 中的副作用导入完成初始化。修改应用启动流程时，保留这个导入。
- Theme 和 i18n provider 包裹在 router 外层。除非变更确有需要且已经验证，否则不要调整 provider 顺序。
- Web 多语言开发遵循 `docs/standards/web-i18n-guidelines.md`。

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
- 任何代码改动前，AI 必须先说明当前变更级别：`L0`、`L1`、`L2` 或 `L3`。
- 新功能、跨文件改动、数据流调整和中等以上重构，按 `L2` 及以上处理，先写正式 spec 或 plan，再进入实现。
- 用户明确指定 `L2` 或 `L3` 时，AI 无权自行降级；如分级存在争议，默认按更高风险级别处理。
- `L2` 及以上进入实现前，必须已有仓库内正式 spec 或 plan；聊天计划、临时 TODO、`update_plan` 输出不算正式 spec 或 plan。
- 用户明确要求同时提供 spec 和 plan 时，两者都必须写入正式文档。
- `L3` 必须人工主导，AI 只能在明确批准的范围内做分析、草案、验证辅助或受控 patch，不得自行推进实现。
- 局部小改动可以直接做，但必须附最小验证，且不要顺手扩大范围。
- **🚨 禁止在 main / master 分支上直接修改代码；任何代码改动前必须先切换到任务分支或进入隔离 worktree。**
- `main` / `master` 只作为稳定集成分支，不直接提交开发改动；进入实质性编辑前，先切到任务分支或隔离 worktree。
- 默认每个任务使用独立分支，分支名格式 `<prefix>/<task-slug>`，按改动性质选择前缀（白名单：`feat/` `fix/` `opt/` `docs/` `refactor/` `chore/` `test/`，与 `scripts/worktree-add.sh` 的 `ALLOWED_PREFIXES` 一致），如 `feat/<task-slug>`。
- 任何等级（`L0`/`L1`/`L2`/`L3`）的任务在开始实质性编辑前，都必须进入 `.worktrees/{branch-name}/` 下的独立 worktree；不得在主工作目录直接切任务分支（详见 [docs/ai/branch-strategy.md](docs/ai/branch-strategy.md) 和 [docs/adr/0007-all-levels-worktree.md](docs/adr/0007-all-levels-worktree.md)）。
- 建 worktree 一律通过 `scripts/worktree-add.sh`（或 `pnpm worktree:add`）；Claude Code 内 `git worktree add` 会被项目级 `PreToolUse|Bash` hook 自动改写为 wrapper 调用（兼容 `rtk ` 前缀），文档兜底；禁止绕开 wrapper 直接 `git worktree add`。**wrapper 现强制校验并硬阻断违规**：目标路径必须落在 `<repo_root>/.worktrees/` 下，且用 `-b`/`-B` 新建的分支名前缀必须属于白名单（`feat/ fix/ opt/ docs/ refactor/ chore/ test/`）；不合规在创建前 `exit 1`。复合命令（`&&` / `;` / 管道）或 `git -C` 形式的 `git worktree add` 无法安全改写，会被 hook `deny`，请改用独立命令或 `pnpm worktree:add`。
- 如因磁盘空间、权限或特殊调试环境必须放在其他位置，需要在相关任务或文档中说明原因。
- AI 新会话优先从 `docs/ai/context-index.md` 获取仓库导航，再按具体任务读取 spec、plan、ADR 或 runbook。
- 即使使用外部技能或流程生成文档，正式 spec 与 plan 也统一放在 `docs/specs/`、`docs/plans/`。
- 纯文档分支合并前不要求运行完整 `pnpm verify`；应先确认 diff 仅包含 `docs/`、README 或说明文档，再做文档自检和 Git 状态确认。
- 完整治理基线见 `docs/ai/ai-development-governance.md`。
- 日常入口、模板、清单和 runbook 见 `docs/ai/README.md`。

## 开发约束文档

- 接口契约与集成约束：`docs/api/`
- 应用 UI 与交互约束：`docs/ui/`
- 代码组织与工程规范：`docs/standards/`
- 长期决策原因继续放在 `docs/adr/`，单次设计和执行计划继续放在 `docs/specs/`、`docs/plans/`

## 参考文档

- Monorepo 设计： [docs/specs/2026-05-12/frontend-monorepo-design.md](docs/specs/2026-05-12/frontend-monorepo-design.md)
- E2E 测试说明： [apps/web-e2e/README.md](apps/web-e2e/README.md)

## 校验说明

- Turbo 任务定义在 `turbo.json` 中；`build`、`lint` 和 `typecheck` 按拓扑顺序执行。
- 本地 E2E 默认访问 `http://127.0.0.1:4173`，并可自动启动 Web 应用。
- Staging E2E 运行需要 `E2E_MODE=staging` 和 `E2E_BASE_URL`。

## 关键说明

- 所有文档除非特别说明，否则一律优先使用中文
- 开发时需要同时实现多语言功能，代码中不要出现中文
