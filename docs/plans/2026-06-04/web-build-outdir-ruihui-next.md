# Web Build OutDir RUIHUI Next Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `pnpm --filter @repo/web build` 的产物输出到 `apps/web/dist/ruihui-next`，同时保持现有构建命令和静态资源命名规则不变。

**Architecture:** 直接在 `apps/web/vite.config.ts` 上配置 `build.outDir`，把输出路径从 Vite 默认的 `dist` 下沉到 `dist/ruihui-next`。同时修正文档里对 Web 生产产物目录的旧描述，并通过一次干净构建验证最终目录结构。

**Tech Stack:** Vite 7、React 19、TypeScript、pnpm workspace、Turbo。

---

## 范围与前置条件

- 变更级别：`L1`
- 当前分支：`codex-build-outdir-ruihui-next`
- 主锚点文件：`apps/web/vite.config.ts`
- 非目标：不改 `apps/web/package.json` 的 `build` 脚本，不改 `entryFileNames`、`chunkFileNames`、`assetFileNames`，不新增环境变量或部署脚本。

## 文件边界

- Modify: `apps/web/vite.config.ts`
- Modify: `docs/specs/2026-05-25/web-operations-and-data-access.md`
- Verify: `apps/web/package.json`
- Verify: `turbo.json`

### Task 1: 调整 Vite 输出目录

**Files:**
- Modify: `apps/web/vite.config.ts`
- Verify: `apps/web/package.json`
- Verify: `turbo.json`

- [ ] **Step 1: 确认当前构建命令和 Turbo 输出匹配不需要联动修改**

读取以下文件，确认当前约束成立：

```json
// apps/web/package.json
{
  "scripts": {
    "build": "tsc -p tsconfig.json && vite build"
  }
}
```

```json
// turbo.json
{
  "tasks": {
    "build": {
      "outputs": ["dist/**"]
    }
  }
}
```

Expected: `build` 仍由 `vite build` 驱动，Turbo 仍匹配 `dist/**`，因此本次只需修改 `apps/web/vite.config.ts`。

- [ ] **Step 2: 在 `build` 配置中加入 `outDir`**

把 `apps/web/vite.config.ts` 的 `build` 段调整为：

```ts
build: {
  outDir: "dist/ruihui-next",
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (!id.includes("node_modules")) {
          return undefined;
        }

        if (
          id.includes("/react/") ||
          id.includes("/react-dom/") ||
          id.includes("/scheduler/")
        ) {
          return "vendor-react";
        }

        if (id.includes("/@tanstack/")) {
          return "vendor-tanstack";
        }

        if (id.includes("/radix-ui/") || id.includes("/@radix-ui/")) {
          return "vendor-radix";
        }

        if (id.includes("/lucide-react/")) {
          return "vendor-icons";
        }

        return undefined;
      }
    }
  }
},
```

Implementation note: 只新增 `outDir`，不要改现有 `manualChunks()` 逻辑和 `resolve.alias`。

- [ ] **Step 3: 运行最近编辑文件诊断**

Run: `GetDiagnostics` for `file:///e:/Projects/standard-scaffold/apps/web/vite.config.ts`

Expected: 没有新增 TypeScript 或配置诊断；如果有格式或语法问题，先修正再继续。

### Task 2: 同步修正文档中的产物目录描述

**Files:**
- Modify: `docs/specs/2026-05-25/web-operations-and-data-access.md`

- [ ] **Step 1: 更新旧的产物目录描述**

把文档中的这条说明：

```md
- 生产产物目录为 `apps/web/dist`。
```

更新为：

```md
- 生产产物目录为 `apps/web/dist/ruihui-next`。
```

Expected: 旧文档不再和新的构建默认值冲突。

- [ ] **Step 2: 复读文档并确认没有其他同类旧描述**

Run: search for `apps/web/dist` under `docs/`

Expected: 除本次设计文档和计划文档中的对比性描述外，不再有把当前默认产物目录声明为 `apps/web/dist` 的长期文档。

### Task 3: 做一次干净构建验证

**Files:**
- Verify: `apps/web/vite.config.ts`
- Verify: `apps/web/package.json`

- [ ] **Step 1: 如存在旧构建目录，先删除 `apps/web/dist`**

If `e:/Projects/standard-scaffold/apps/web/dist` exists, remove it before validation so the resulting structure only reflects the new `outDir`.

Use the file tool equivalent of:

```text
Delete: e:/Projects/standard-scaffold/apps/web/dist
```

Expected: 不保留旧的 `dist/index.html` 或 `dist/assets` 历史产物，避免误判新输出目录结构。

- [ ] **Step 2: 运行 Web 定向构建**

Run:

```bash
pnpm --filter @repo/web build
```

Expected: 命令成功退出，且没有因为 `outDir` 变更导致的构建错误。

- [ ] **Step 3: 检查输出目录结构**

Run:

```powershell
Get-ChildItem -Path e:\Projects\standard-scaffold\apps\web\dist
Get-ChildItem -Path e:\Projects\standard-scaffold\apps\web\dist\ruihui-next
```

Expected:

```text
apps/web/dist
└── ruihui-next
    ├── assets
    └── index.html
```

Expected: `apps/web/dist/ruihui-next` 存在，目录下包含 `index.html` 和 `assets/`；不再把当前构建结果直接输出到 `apps/web/dist` 根目录。

### Task 4: 收尾检查并提交

**Files:**
- Modify: `apps/web/vite.config.ts`
- Modify: `docs/specs/2026-05-25/web-operations-and-data-access.md`

- [ ] **Step 1: 检查改动范围**

Run:

```bash
git status --short
git diff -- apps/web/vite.config.ts docs/specs/2026-05-25/web-operations-and-data-access.md
```

Expected: 只包含本次配置和文档调整，以及当前设计/计划文档。

- [ ] **Step 2: 记录验证结果**

在交付说明里明确记录以下事实：

```text
已运行 pnpm --filter @repo/web build 并通过；
当前产物目录为 apps/web/dist/ruihui-next；
静态资源命名和 manualChunks 拆包策略保持不变。
```

- [ ] **Step 3: 提交本次改动**

Run:

```bash
git add apps/web/vite.config.ts docs/specs/2026-05-25/web-operations-and-data-access.md docs/specs/2026-06-04/web-build-outdir-ruihui-next-design.md docs/plans/2026-06-04/web-build-outdir-ruihui-next.md
git commit -m "build: move web output into ruihui-next"
```

Expected: 产生一个只包含本次构建目录调整相关内容的提交。
