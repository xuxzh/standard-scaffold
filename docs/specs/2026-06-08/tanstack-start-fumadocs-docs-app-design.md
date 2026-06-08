# TanStack Start Fumadocs Docs App 设计

日期：2026-06-08

## 背景

当前仓库是 Turborepo 管理的 `pnpm` workspace，主应用位于 `apps/web`，技术栈为 React 19、Vite、TypeScript、TanStack Router 和 shadcn 风格组件。仓库已经有较多 Markdown 文档，但这些文档目前主要作为源码仓库内资料存在，不具备独立文档站的导航、搜索和阅读体验。

本次目标是为项目引入 Fumadocs 文档站能力。经过方案讨论后，不把文档功能集成到现有 `apps/web` 的 `/docs` 路由，而是在 workspace 中新增独立 `apps/docs` 应用。这样可以隔离文档站依赖、路由、构建和部署节奏，避免文档站形态反向影响后台业务应用。

本设计只定义后续实现范围。本次文档落地任务不创建 `apps/docs`，不安装依赖，不修改代码。

## 目标

在 monorepo 中新增一个独立的 TanStack Start + Fumadocs 文档应用设计，用于后续实现 `apps/docs`，并提供中文为主的首版文档站骨架、Fumadocs UI、MDX 内容源和默认搜索能力。

## 非目标

- 不把文档站集成到现有 `apps/web`。
- 不修改 `apps/web` 的路由、布局、鉴权、侧边栏或构建配置。
- 不迁移仓库现有 `docs/` 下的全部文档内容。
- 不把文档内容接入现有后台登录态或权限系统。
- 不在首版设计里实现多语言文档站。
- 不引入独立后端服务承载搜索。

## 范围级别

建议任务级别：`L2`。

原因：

- 新增 `apps/docs` workspace 应用。
- 新增 TanStack Start、Fumadocs MDX、Fumadocs UI 和搜索相关依赖。
- 新增独立应用路由、内容源、样式入口和构建脚本。
- 需要进入 `pnpm` workspace、Turbo pipeline 和局部验证链路。

本任务不按 `L3` 处理，因为首版不改现有根脚本语义、不升级现有依赖、不调整 CI、不重构 `apps/web`，且文档应用边界独立。

## 受影响边界

- Workspace：新增 `apps/docs`，现有 `pnpm-workspace.yaml` 已覆盖 `apps/*`，原则上无需修改。
- Turbo：`turbo.json` 已按任务名聚合 `build`、`lint`、`typecheck`，新增应用只要提供同名脚本即可进入现有 pipeline。
- 路由：新增 docs 应用内部路由，不影响 `apps/web`。
- 内容源：新增 Fumadocs MDX 内容目录和生成配置。
- 搜索：新增 docs 应用内部 `/api/search` 路由，使用 Fumadocs 默认搜索能力。
- 样式：docs 应用使用自己的 Tailwind 和 Fumadocs UI 样式入口，不复用 `apps/web/src/styles.css`。

## 建议方案

采用独立 `apps/docs` 应用：

- 框架：TanStack Start。
- 文档：Fumadocs MDX。
- UI：Fumadocs UI。
- 搜索：Fumadocs 默认 Orama 搜索路由。
- 包名：`@repo/docs`。
- 本地开发端口：`3001`，避免和 `apps/web` 的开发服务冲突。

应用结构建议如下：

```text
apps/docs/
  app.config.ts
  package.json
  source.config.ts
  tsconfig.json
  vite.config.ts
  content/docs/
    index.mdx
    getting-started.mdx
  src/
    components/mdx.tsx
    lib/layout.shared.tsx
    lib/source.ts
    routeTree.gen.ts
    router.tsx
    routes/
      __root.tsx
      index.tsx
      docs/$.tsx
      api/search.ts
    styles.css
```

说明：

- `source.config.ts` 定义 Fumadocs MDX collection。
- `src/lib/source.ts` 从生成的 `collections/server` 读取文档数据，并通过 Fumadocs loader 暴露 `source`。
- `src/routes/docs/$.tsx` 渲染 `/docs` 和 `/docs/<slug>` 页面。
- `src/routes/api/search.ts` 提供文档搜索接口。
- `src/lib/layout.shared.tsx` 存放文档站标题、导航和 search 配置，避免散落在多个 route 文件中。
- `src/components/mdx.tsx` 集中维护 MDX 组件映射。

## 为什么不用集成进 apps/web

集成到 `apps/web` 的优点是部署入口简单，但会带来以下问题：

- `apps/web` 当前是 Vite SPA + TanStack Router，不是 TanStack Start。
- Fumadocs 的完整文档站体验包含服务端 route、搜索 API 和内容生成链路，放进 SPA 会增加适配层。
- 文档站样式、搜索和 MDX 依赖会进入业务后台应用依赖图。
- 后台应用当前有登录保护、AdminLayout、主题和 i18n provider，文档站需要绕开这些边界，长期容易形成例外逻辑。

独立 `apps/docs` 能保持文档站自洽，也让后续部署到独立域名、子路径或静态环境时有更清晰的边界。

## 为什么用 TanStack Start 而不是 Next.js

Next.js 是 Fumadocs 常见路径，但本仓库已有 TanStack Router 生态基础。选择 TanStack Start 的原因：

- 与现有 `apps/web` 的 TanStack Router 心智模型更接近。
- 仍以 Vite 为基础，和当前前端工具链更一致。
- Fumadocs 官方提供 TanStack Start 手动安装路径。
- 独立应用可以使用 TanStack Start 的服务端 route 承载搜索，而不需要改造 `apps/web`。

首版不选择 Next.js，避免同一 monorepo 内同时存在两套前端框架心智和构建约定。

## 首版行为

- `/`：重定向或链接到 `/docs`，作为文档站入口。
- `/docs`：展示文档首页。
- `/docs/getting-started`：展示入门示例页。
- `/api/search`：提供 Fumadocs 默认搜索接口。
- 文档内容中文为主，代码、文件名、路由和变量名使用英文。
- 首批只新增最小 MDX 内容，用来验证文档站架构和搜索链路。

## 验证计划

实现阶段至少执行：

```bash
pnpm --filter @repo/docs lint
pnpm --filter @repo/docs typecheck
pnpm --filter @repo/docs build
pnpm lint
pnpm typecheck
pnpm build
```

手动验证：

- 启动 `pnpm --filter @repo/docs dev`。
- 打开 `http://127.0.0.1:3001`。
- 访问 `/docs` 和 `/docs/getting-started`。
- 搜索首批中文示例内容，确认 `/api/search` 可用。

本次文档落地阶段只做 Markdown 文件存在性、占位词和范围一致性检查，不运行代码测试。

## 风险

- TanStack Start 与 Fumadocs 的 API 版本可能变化，实施阶段需要以安装时官方文档和类型检查为准。
- Fumadocs 生成目录通常位于 `.source`，实施阶段需要确保 `.gitignore` 和 TypeScript alias 不冲突。
- 搜索 API 依赖服务端 route，部署环境需要支持 TanStack Start 的服务端运行形态。
- 如果未来希望将文档站部署到主站子路径，需要单独设计 base path、资源路径和反向代理策略。

## 需要更新的文档

- 新增本设计：`docs/specs/2026-06-08/tanstack-start-fumadocs-docs-app-design.md`。
- 新增实施计划：`docs/plans/2026-06-08/tanstack-start-fumadocs-docs-app.md`。
- 实现完成后，如确认 `apps/docs` 成为长期 workspace，应补充 `docs/ai/context-index.md` 的模块地图和验证入口。
