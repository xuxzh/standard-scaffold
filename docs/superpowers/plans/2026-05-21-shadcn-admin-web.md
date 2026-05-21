# shadcn-admin Web 框架初始化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 monorepo 中把 `apps/web` 初始化为基于 `shadcn/ui`、Tailwind 和 TanStack Router 的后台应用骨架，并同时支持壳内页面和独立页面访问。

**Architecture:** 保留当前 `pnpm + turbo` monorepo 结构，仅升级 `apps/web`。应用内部改为路由驱动结构，使用 `AdminLayout` 承载后台主壳，独立示例页通过单独路由直接访问，不包裹侧边栏和顶部栏。`shadcn` 组件先收敛在 `apps/web/src/components/ui`，避免在初始化阶段过早抽象到共享包。

**Tech Stack:** pnpm、Turborepo、Vite、React 19、TypeScript、Tailwind CSS、shadcn/ui、TanStack Router、Lucide React、ESLint 9。

---

## 文件结构

- 修改 `apps/web/package.json`：增加后台框架所需运行时和开发时依赖。
- 修改 `apps/web/vite.config.ts`：补充路径别名等基础配置。
- 修改 `apps/web/src/main.tsx`：切换为路由应用入口并加载全局样式。
- 删除或替换 `apps/web/src/App.tsx`：不再作为主要应用入口。
- 替换 `apps/web/src/styles.css`：接入 Tailwind 和应用基础样式变量。
- 创建 `apps/web/components.json`：为 `shadcn` 提供生成配置。
- 创建 `apps/web/src/lib/utils.ts`：提供 `cn` 等基础工具。
- 创建 `apps/web/src/components/ui/*`：放置初始化阶段需要的基础 `shadcn` 组件。
- 创建 `apps/web/src/components/layout/*`：放置后台壳相关布局组件。
- 创建 `apps/web/src/routes/*`：放置路由定义和示例页面。
- 视情况修改 `apps/web/tsconfig.json`：为别名和新目录结构提供支持。

### Task 1: 接入基础依赖与样式体系

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/tsconfig.json`
- Create: `apps/web/components.json`
- Create: `apps/web/src/lib/utils.ts`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: 为 `apps/web` 增加后台框架依赖**

更新 `apps/web/package.json`，补充以下类别依赖：

- 运行时：`@tanstack/react-router`、`lucide-react`、`class-variance-authority`、`clsx`、`tailwind-merge`
- 开发时：`tailwindcss`、`@tailwindcss/vite` 或等效接入方式、`shadcn` 初始化所需配套依赖

- [ ] **Step 2: 配置 Vite 和 TypeScript 别名**

在 `apps/web/vite.config.ts` 和 `apps/web/tsconfig.json` 中增加 `@/* -> src/*` 映射，确保 `shadcn` 组件和路由文件都能使用统一别名。

- [ ] **Step 3: 创建 `shadcn` 配置文件**

新增 `apps/web/components.json`，指定样式文件、TSX 启用状态、路径别名和组件输出目录，目标输出到 `src/components/ui`。

- [ ] **Step 4: 创建基础工具函数**

新增 `apps/web/src/lib/utils.ts`，暴露 `cn(...inputs)`，供组件拼接 className。

- [ ] **Step 5: 切换到 Tailwind 全局样式**

用 Tailwind 指令和应用级 CSS 变量替换 `apps/web/src/styles.css`，保留最小全局 reset 和后台布局所需的基础变量。

### Task 2: 建立路由应用入口

**Files:**
- Modify: `apps/web/src/main.tsx`
- Create: `apps/web/src/routes/index.tsx`
- Create: `apps/web/src/routes/dashboard.tsx`
- Create: `apps/web/src/routes/examples.embedded.tsx`
- Create: `apps/web/src/routes/examples.standalone.tsx`
- Delete or stop using: `apps/web/src/App.tsx`

- [ ] **Step 1: 将入口从 `App.tsx` 切换到路由系统**

修改 `apps/web/src/main.tsx`，创建 router 实例并用路由 provider 挂载应用。

- [ ] **Step 2: 创建首批页面路由**

新增根级路由和示例页面路由，至少包含：

- `/` 重定向到 `/dashboard`
- `/dashboard`
- `/examples/embedded`
- `/examples/standalone`

- [ ] **Step 3: 明确停止使用旧的单页入口**

移除或保留但不再引用 `apps/web/src/App.tsx`，避免应用入口并存造成结构混乱。

### Task 3: 初始化后台布局壳

**Files:**
- Create: `apps/web/src/components/layout/admin-layout.tsx`
- Create: `apps/web/src/components/layout/app-sidebar.tsx`
- Create: `apps/web/src/components/layout/app-header.tsx`
- Modify: `apps/web/src/routes/dashboard.tsx`
- Modify: `apps/web/src/routes/examples.embedded.tsx`

- [ ] **Step 1: 创建后台主布局组件**

新增 `AdminLayout`，提供 sidebar、header 和主内容区域，布局参考 `shadcn-admin` 的后台壳，但保持实现最小化。

- [ ] **Step 2: 创建侧边栏导航**

新增 `app-sidebar.tsx`，至少包含指向 `/dashboard` 和 `/examples/embedded` 的导航项。

- [ ] **Step 3: 创建顶部栏**

新增 `app-header.tsx`，包含页面标题区域和一个最小操作区，为后续主题切换或用户菜单预留位置。

- [ ] **Step 4: 让壳内页面挂载到后台布局**

使 `/dashboard` 和 `/examples/embedded` 页面统一使用 `AdminLayout` 包裹，形成一致的后台访问体验。

### Task 4: 建立独立页面访问模式

**Files:**
- Modify: `apps/web/src/routes/examples.standalone.tsx`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/card.tsx`
- Create: `apps/web/src/components/ui/input.tsx`

- [ ] **Step 1: 初始化首批 `shadcn` 基础组件**

在 `src/components/ui` 中创建当前页面需要的最小组件集合，优先包含 `button`、`card`、`input`。

- [ ] **Step 2: 设计壳内示例页**

让 `/examples/embedded` 展示后台壳中页面应有的内容区组织方式，例如标题、卡片和表单片段。

- [ ] **Step 3: 设计独立示例页**

让 `/examples/standalone` 直接渲染内容，不经过 `AdminLayout`，用于验证“示例页面可单独访问”的需求。

### Task 5: 清理旧样式并完成验证

**Files:**
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/package.json`
- Generate: `pnpm-lock.yaml`

- [ ] **Step 1: 清理不再使用的旧首页样式**

移除旧 `App.tsx` 时代的 `.intro`、`.primary-action` 等专用样式，只保留全局和布局基础样式。

- [ ] **Step 2: 安装依赖**

Run: `pnpm install`
Expected: 安装新增依赖并更新 `pnpm-lock.yaml`

- [ ] **Step 3: 运行 lint**

Run: `pnpm lint`
Expected: 所有 workspace lint 通过

- [ ] **Step 4: 运行类型检查**

Run: `pnpm typecheck`
Expected: 所有 workspace typecheck 通过

- [ ] **Step 5: 运行构建**

Run: `pnpm build`
Expected: `apps/web` 和相关 workspace 构建通过
