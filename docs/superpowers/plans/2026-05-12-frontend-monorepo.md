# 前端 Monorepo 初始化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 初始化一个 `pnpm workspace + Turborepo + Vite React 19 + TypeScript` 的前端 monorepo 框架。

**Architecture:** 根目录负责 workspace、Turbo 编排和统一脚本；`apps/web` 是第一个 Vite React 应用；`packages/*` 提供可复用的 TypeScript、ESLint 和 UI 包入口。第一阶段只搭框架，不加入业务功能。

**Tech Stack:** pnpm 10、Turborepo、Vite、React 19、TypeScript、ESLint 9 flat config。

---

## 文件结构

- 创建 `package.json`：根 workspace 元信息、脚本和开发依赖。
- 创建 `pnpm-workspace.yaml`：声明 `apps/*` 和 `packages/*`。
- 创建 `turbo.json`：声明 `dev`、`build`、`lint`、`typecheck` 任务。
- 创建 `.gitignore`：忽略依赖、产物、日志和本地环境文件。
- 创建 `packages/typescript-config/*`：共享 TypeScript 配置。
- 创建 `packages/eslint-config/*`：共享 ESLint flat config。
- 创建 `packages/ui/*`：最小共享 UI 包。
- 创建 `apps/web/*`：Vite React 19 应用。

## Task 1：根目录 workspace 配置

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`

- [ ] **Step 1: 创建根目录配置**

写入根 `package.json`，包含 `dev`、`build`、`lint`、`typecheck` 脚本，并使用 `turbo` 编排。

- [ ] **Step 2: 创建 workspace 和 Turbo 配置**

写入 `pnpm-workspace.yaml` 和 `turbo.json`，让 pnpm 发现 `apps/*`、`packages/*`，并让 Turbo 处理依赖任务顺序。

- [ ] **Step 3: 创建忽略规则**

写入 `.gitignore`，覆盖 `node_modules`、构建产物、日志和本地环境文件。

## Task 2：共享配置包

**Files:**
- Create: `packages/typescript-config/package.json`
- Create: `packages/typescript-config/base.json`
- Create: `packages/typescript-config/react-app.json`
- Create: `packages/eslint-config/package.json`
- Create: `packages/eslint-config/react.js`

- [ ] **Step 1: 创建 TypeScript 配置包**

写入基础 TS 配置和 React app 配置，供 `apps/web` 继承。

- [ ] **Step 2: 创建 ESLint 配置包**

写入 React app 可复用的 ESLint flat config，供 `apps/web/eslint.config.js` 引用。

## Task 3：共享 UI 包

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/src/index.ts`
- Create: `packages/ui/src/button.tsx`
- Create: `packages/ui/tsconfig.json`

- [ ] **Step 1: 创建 UI 包骨架**

写入一个最小 Button 组件和导出入口，后续可以扩展为组件库。

- [ ] **Step 2: 接入共享 TypeScript 配置**

让 `packages/ui` 继承 `packages/typescript-config/react-app.json`，并只做类型构建。

## Task 4：Vite React Web 应用

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/eslint.config.js`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/styles.css`

- [ ] **Step 1: 创建 Vite React 应用配置**

写入 `apps/web/package.json`，使用 React 19、React DOM 19、Vite 和 `@repo/ui`。

- [ ] **Step 2: 创建应用入口**

写入 `index.html`、`src/main.tsx`、`src/App.tsx` 和基础样式。

- [ ] **Step 3: 接入共享配置**

写入 `tsconfig.json`、`vite.config.ts` 和 `eslint.config.js`。

## Task 5：安装和验证

**Files:**
- Generate: `pnpm-lock.yaml`

- [ ] **Step 1: 安装依赖**

运行：`pnpm install`

Expected：生成 `pnpm-lock.yaml` 并安装 workspace 依赖。

- [ ] **Step 2: 构建验证**

运行：`pnpm build`

Expected：Turbo 成功构建 `packages/ui` 和 `apps/web`。

- [ ] **Step 3: Lint 验证**

运行：`pnpm lint`

Expected：ESLint 检查通过。

- [ ] **Step 4: 类型验证**

运行：`pnpm typecheck`

Expected：TypeScript 类型检查通过。
