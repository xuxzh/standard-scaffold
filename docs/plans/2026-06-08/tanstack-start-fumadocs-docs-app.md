# TanStack Start Fumadocs Docs App Implementation Plan

> **面向 Agent 执行者：** 优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans` 按任务执行本计划。步骤使用复选框 `- [ ]` 语法跟踪。

**目标：** 在 monorepo 中新增独立 `apps/docs` 应用，使用 TanStack Start + Fumadocs 提供中文文档站骨架、MDX 内容源、Fumadocs UI 和默认搜索能力。

**实现方式：** 不改现有 `apps/web`，在 `apps/docs` 内完成框架、路由、内容源、样式和搜索闭环。新增应用通过 workspace 脚本进入现有 Turbo `build`、`lint`、`typecheck` pipeline。

**技术栈：** pnpm、Turborepo、TanStack Start、TanStack Router、React 19、TypeScript、Vite、Tailwind CSS 4、Fumadocs MDX、Fumadocs UI。

---

## 执行边界

本计划用于后续实现阶段。本次文档落地任务不执行本计划中的编码步骤，不创建 `apps/docs`，不安装依赖，不修改代码。

实现阶段开始前必须先确认：

- 当前不在 `main` 或 `master` 上直接编辑。
- 已使用任务分支或隔离 worktree。
- 已重读 `docs/specs/2026-06-08/tanstack-start-fumadocs-docs-app-design.md`。

## 文件清单

- 新建：
  - `apps/docs/package.json`
  - `apps/docs/app.config.ts`
  - `apps/docs/vite.config.ts`
  - `apps/docs/tsconfig.json`
  - `apps/docs/source.config.ts`
  - `apps/docs/src/styles.css`
  - `apps/docs/src/router.tsx`
  - `apps/docs/src/routeTree.gen.ts`
  - `apps/docs/src/routes/__root.tsx`
  - `apps/docs/src/routes/index.tsx`
  - `apps/docs/src/routes/docs/$.tsx`
  - `apps/docs/src/routes/api/search.ts`
  - `apps/docs/src/lib/source.ts`
  - `apps/docs/src/lib/layout.shared.tsx`
  - `apps/docs/src/components/mdx.tsx`
  - `apps/docs/content/docs/index.mdx`
  - `apps/docs/content/docs/getting-started.mdx`
- 修改：
  - `pnpm-lock.yaml`
- 测试：
  - `pnpm --filter @repo/docs lint`
  - `pnpm --filter @repo/docs typecheck`
  - `pnpm --filter @repo/docs build`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`

### 任务 1：初始化 docs workspace 应用

**文件：**

- 新建：`apps/docs/package.json`
- 新建：`apps/docs/tsconfig.json`
- 新建：`apps/docs/app.config.ts`

- [ ] **步骤 1：确认 workspace 已覆盖 apps 目录**

从仓库根目录执行：

```bash
sed -n '1,80p' pnpm-workspace.yaml
```

预期输出包含：

```yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **步骤 2：创建 `apps/docs/package.json`**

创建文件：

```json
{
  "name": "@repo/docs",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vinxi dev --host 127.0.0.1 --port 3001",
    "build": "vinxi build",
    "lint": "eslint .",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@tanstack/react-router": "^1.170.6",
    "@tanstack/react-start": "^1.170.6",
    "fumadocs-core": "latest",
    "fumadocs-mdx": "latest",
    "fumadocs-ui": "latest",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@tailwindcss/vite": "^4.3.0",
    "@tanstack/router-plugin": "^1.170.6",
    "@types/mdx": "latest",
    "@types/node": "^25.9.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.0",
    "eslint": "^9.39.1",
    "tailwindcss": "^4.3.0",
    "typescript": "^5.9.3",
    "vite": "^7.2.2",
    "vinxi": "latest"
  }
}
```

- [ ] **步骤 3：创建 `apps/docs/tsconfig.json`**

创建文件：

```json
{
  "extends": "@repo/typescript-config/react-app.json",
  "compilerOptions": {
    "paths": {
      "@/*": [
        "./src/*"
      ],
      "collections/*": [
        "./.source/*"
      ]
    },
    "types": [
      "vite/client",
      "node"
    ]
  },
  "include": [
    "src",
    "content",
    "app.config.ts",
    "source.config.ts",
    "vite.config.ts"
  ]
}
```

- [ ] **步骤 4：创建 `apps/docs/app.config.ts`**

创建文件：

```ts
import { defineConfig } from "@tanstack/react-start/config";

export default defineConfig({});
```

- [ ] **步骤 5：安装依赖**

从仓库根目录执行：

```bash
pnpm install
```

预期：安装新增依赖并更新 `pnpm-lock.yaml`。

### 任务 2：接入 TanStack Start 和 Vite 配置

**文件：**

- 新建：`apps/docs/vite.config.ts`
- 新建：`apps/docs/src/router.tsx`
- 新建：`apps/docs/src/routeTree.gen.ts`

- [ ] **步骤 1：创建 `apps/docs/vite.config.ts`**

创建文件：

```ts
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMDX } from "fumadocs-mdx/vite";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    tanstackStart(),
    react(),
    fumadocsMDX(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **步骤 2：创建 `apps/docs/src/router.tsx`**

创建文件：

```tsx
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
```

- [ ] **步骤 3：创建临时 `routeTree.gen.ts` 占位文件**

创建文件：

```ts
/* eslint-disable */

import { rootRoute } from "./routes/__root";

export const routeTree = rootRoute;
```

说明：TanStack Router 插件会在后续 dev/build 过程中生成正式 route tree；如果生成文件形态与占位文件不同，以插件生成结果为准。

### 任务 3：接入 Fumadocs 内容源和 UI

**文件：**

- 新建：`apps/docs/source.config.ts`
- 新建：`apps/docs/src/lib/source.ts`
- 新建：`apps/docs/src/lib/layout.shared.tsx`
- 新建：`apps/docs/src/components/mdx.tsx`
- 新建：`apps/docs/src/styles.css`

- [ ] **步骤 1：创建 `apps/docs/source.config.ts`**

创建文件：

```ts
import { defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
});
```

- [ ] **步骤 2：创建 `apps/docs/src/lib/source.ts`**

创建文件：

```ts
import { loader } from "fumadocs-core/source";
import { createMDXSource } from "fumadocs-mdx";
import { docs } from "collections/server";

export const source = loader({
  baseUrl: "/docs",
  source: createMDXSource(docs),
});
```

- [ ] **步骤 3：创建 `apps/docs/src/lib/layout.shared.tsx`**

创建文件：

```tsx
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { source } from "./source";

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: "Standard Scaffold Docs",
  },
  tree: source.pageTree,
  searchToggle: {
    enabled: true,
  },
};
```

- [ ] **步骤 4：创建 `apps/docs/src/components/mdx.tsx`**

创建文件：

```tsx
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...components,
  };
}
```

- [ ] **步骤 5：创建 `apps/docs/src/styles.css`**

创建文件：

```css
@import "tailwindcss";
@import "fumadocs-ui/css/shadcn.css";
@import "fumadocs-ui/css/preset.css";

html,
body,
#root {
  min-height: 100svh;
}
```

### 任务 4：创建 docs 路由和搜索路由

**文件：**

- 新建：`apps/docs/src/routes/__root.tsx`
- 新建：`apps/docs/src/routes/index.tsx`
- 新建：`apps/docs/src/routes/docs/$.tsx`
- 新建：`apps/docs/src/routes/api/search.ts`

- [ ] **步骤 1：创建 `apps/docs/src/routes/__root.tsx`**

创建文件：

```tsx
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider";
import "../styles.css";

export const rootRoute = createRootRouteWithContext()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <RootProvider
          search={{
            options: {
              api: "/api/search",
            },
          }}
        >
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

- [ ] **步骤 2：创建 `apps/docs/src/routes/index.tsx`**

创建文件：

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium text-fd-muted-foreground">
          Standard Scaffold
        </p>
        <h1 className="text-4xl font-semibold tracking-normal">项目文档</h1>
        <p className="text-lg text-fd-muted-foreground">
          面向项目维护者的工程说明、集成约定和后续业务文档入口。
        </p>
      </div>
      <Link
        className="w-fit rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground"
        to="/docs"
      >
        进入文档
      </Link>
    </main>
  );
}
```

- [ ] **步骤 3：创建 `apps/docs/src/routes/docs/$.tsx`**

创建文件：

```tsx
import { createFileRoute, notFound } from "@tanstack/react-router";
import { DocsBody, DocsPage } from "fumadocs-ui/page";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/components/mdx";

export const Route = createFileRoute("/docs/$")({
  component: DocPage,
});

function DocPage() {
  const params = Route.useParams();
  const slug = params._splat ? params._splat.split("/") : [];
  const page = source.getPage(slug);

  if (!page) {
    throw notFound();
  }

  const Mdx = page.data.body;

  return (
    <DocsLayout {...baseOptions}>
      <DocsPage toc={page.data.toc}>
        <DocsBody>
          <h1>{page.data.title}</h1>
          <Mdx components={getMDXComponents()} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
```

- [ ] **步骤 4：创建 `apps/docs/src/routes/api/search.ts`**

创建文件：

```ts
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

const search = createFromSource(source);

export const APIRoute = createAPIFileRoute("/api/search")({
  GET: search.GET,
});
```

说明：如果实施时 Fumadocs 当前版本的 search server API 命名发生变化，以官方 TanStack Start 安装文档和类型检查为准，但仍保持 `/api/search` 对外路径不变。

### 任务 5：添加最小中文 MDX 内容

**文件：**

- 新建：`apps/docs/content/docs/index.mdx`
- 新建：`apps/docs/content/docs/getting-started.mdx`

- [ ] **步骤 1：创建文档首页**

创建文件：

```mdx
---
title: 文档首页
description: Standard Scaffold 文档站入口。
---

## 概览

这里是 Standard Scaffold 的项目文档入口。首版文档站用于验证 TanStack Start、Fumadocs MDX、Fumadocs UI 和搜索链路。

## 首版范围

- 提供独立文档应用。
- 提供中文 MDX 示例内容。
- 提供文档导航和默认搜索。
- 不迁移仓库现有文档全集。
```

- [ ] **步骤 2：创建入门页**

创建文件：

````mdx
---
title: 快速开始
description: 了解首版文档站的本地运行方式。
---

## 本地运行

文档应用位于 `apps/docs`，本地开发命令为：

```bash
pnpm --filter @repo/docs dev
```

默认访问地址为 `http://127.0.0.1:3001`。

## 验证命令

```bash
pnpm --filter @repo/docs lint
pnpm --filter @repo/docs typecheck
pnpm --filter @repo/docs build
```
````

### 任务 6：验证应用和 workspace

**文件：**

- 修改：`pnpm-lock.yaml`

- [ ] **步骤 1：运行 docs lint**

从仓库根目录执行：

```bash
pnpm --filter @repo/docs lint
```

预期：`@repo/docs` lint 通过。

- [ ] **步骤 2：运行 docs 类型检查**

从仓库根目录执行：

```bash
pnpm --filter @repo/docs typecheck
```

预期：`@repo/docs` typecheck 通过。

- [ ] **步骤 3：运行 docs 构建**

从仓库根目录执行：

```bash
pnpm --filter @repo/docs build
```

预期：`@repo/docs` build 通过。

- [ ] **步骤 4：运行 workspace 静态验证**

从仓库根目录执行：

```bash
pnpm lint
pnpm typecheck
pnpm build
```

预期：所有 workspace 的 lint、typecheck 和 build 通过。

- [ ] **步骤 5：手动验证文档站**

从仓库根目录执行：

```bash
pnpm --filter @repo/docs dev
```

打开：

```text
http://127.0.0.1:3001
http://127.0.0.1:3001/docs
http://127.0.0.1:3001/docs/getting-started
```

预期：

- 首页可进入文档站。
- `/docs` 显示“文档首页”。
- `/docs/getting-started` 显示“快速开始”。
- 搜索框能搜索到“快速开始”或“文档首页”。

## 文档落地自检

本次只落实 spec 和 plan 文档时，执行以下检查：

```bash
test -f docs/specs/2026-06-08/tanstack-start-fumadocs-docs-app-design.md
test -f docs/plans/2026-06-08/tanstack-start-fumadocs-docs-app.md
rg -n "TO""DO|TB""D|implement ""later|fill ""in details" docs/specs/2026-06-08/tanstack-start-fumadocs-docs-app-design.md docs/plans/2026-06-08/tanstack-start-fumadocs-docs-app.md
rg -n "本次文档落地任务不创建|不执行本计划中的编码步骤" docs/specs/2026-06-08/tanstack-start-fumadocs-docs-app-design.md docs/plans/2026-06-08/tanstack-start-fumadocs-docs-app.md
```

预期：

- 两个 `test -f` 命令退出码为 0。
- 占位词扫描无输出，退出码为 1。
- 范围边界扫描能命中 spec 和 plan 中的文档落地说明。
