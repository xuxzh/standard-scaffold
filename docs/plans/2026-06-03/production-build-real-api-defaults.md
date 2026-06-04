# 生产构建默认真实接口环境配置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `pnpm --filter @repo/web build` 默认读取仓库内的真实接口配置并关闭 API mock，同时保留开发者通过 `.env.local` 做本机覆盖的能力。

**Architecture:** 复用 Vite 默认的环境文件加载机制，不改运行时代码和构建脚本。通过新增 `apps/web/.env.production` 固定生产构建默认值，再更新 `apps/web/.env.example` 说明不同环境文件的职责，并用一次 Web 定向构建验证结果。

**Tech Stack:** Vite 7、React 19、TypeScript、pnpm workspace、环境变量文件。

---

## 范围与前置条件

- 变更级别：`L1`
- 当前工作区：`e:/Projects/standard-scaffold/.worktrees/codex-production-build-env`
- 当前分支：`codex-production-build-env`
- 只改环境文件与说明，不改 `apps/web/src/main.tsx`、`apps/web/src/mocks/config.ts` 和各 API client。

## 文件边界

- Create: `apps/web/.env.production`
- Modify: `apps/web/.env.example`
- Create: `docs/plans/2026-06-03/production-build-real-api-defaults.md`
- Verify: `apps/web/package.json`

## Task 1: 新增生产构建默认环境文件

**Files:**
- Create: `apps/web/.env.production`
- Inspect: `apps/web/.env.example`

- [ ] **Step 1: 对照现有示例文件，确认需要保留的环境变量键**

读取 `apps/web/.env.example`，确保生产构建文件至少包含以下键：

```env
VITE_ENABLE_API_MOCKING=false
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_WMS_API_BASE_URL=http://192.168.0.135:8283
VITE_MES_API_BASE_URL=http://192.168.0.135:8282
VITE_PRINT_API_BASE_URL=http://127.0.0.1:3002
```

- [ ] **Step 2: 创建 `apps/web/.env.production`**

写入以下内容：

```env
# 生产构建默认使用真实接口地址，并关闭浏览器端 API mock。
VITE_ENABLE_API_MOCKING=false
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_WMS_API_BASE_URL=http://192.168.0.135:8283
VITE_MES_API_BASE_URL=http://192.168.0.135:8282
VITE_PRINT_API_BASE_URL=http://127.0.0.1:3002
```

- [ ] **Step 3: 读取新文件，确认值与设计一致**

Run: `Get file contents for apps/web/.env.production`

Expected: 文件存在，且 `VITE_ENABLE_API_MOCKING=false` 与四个真实接口地址完整可见。

## Task 2: 更新示例文件说明

**Files:**
- Modify: `apps/web/.env.example`

- [ ] **Step 1: 在文件头部补充环境文件职责说明**

把开头注释调整为下列结构：

```env
# 复制为 apps/web/.env.local 后，按需调整本机开发配置。
# `.env.local` 用于开发联调覆盖，可按需启用 mock 或真实接口。
# `.env.production` 用于仓库内生产构建默认值，`vite build` 默认会读取它。
# VITE_ENABLE_API_MOCKING=true 时，应用会启用 MSW 拦截浏览器请求，适合长期本地联调。
# VITE_API_BASE_URL 用于未开启 API mock 时访问真实 app API。
# VITE_WMS_API_BASE_URL 用于未开启 API mock 时访问真实 WMS API。
# VITE_MES_API_BASE_URL 用于未开启 API mock 时访问真实 MES API。
# VITE_MOCK_RECORD_COUNT 用于配置本地 mock 初始化数据量；修改环境文件后需要重启 Vite。
```

- [ ] **Step 2: 保持示例值偏向开发用途**

保留示例文件里的 mock 默认值与示例地址，目标内容如下：

```env
VITE_ENABLE_API_MOCKING=true
VITE_MOCK_RECORD_COUNT=40
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_WMS_API_BASE_URL=http://127.0.0.1:8283
VITE_MES_API_BASE_URL=http://127.0.0.1:8282
VITE_PRINT_API_BASE_URL=http://127.0.0.1:3002
```

- [ ] **Step 3: 复读示例文件，确认说明与示例值没有冲突**

Run: `Get file contents for apps/web/.env.example`

Expected: 注释同时说明 `.env.local` 与 `.env.production` 的职责，且示例文件仍保留 `VITE_ENABLE_API_MOCKING=true`。

## Task 3: 验证构建默认值

**Files:**
- Verify: `apps/web/package.json`
- Verify: `apps/web/.env.production`
- Verify: `apps/web/.env.example`

- [ ] **Step 1: 确认构建脚本仍使用 Vite 默认 production mode**

读取 `apps/web/package.json`，确认脚本保持为：

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json && vite build"
  }
}
```

Expected: 不需要新增 `build:prod` 或修改 mode 参数。

- [ ] **Step 2: 运行定向构建验证**

Run: `pnpm --filter @repo/web build`

Expected: 构建成功，输出 `dist/` 产物，没有因环境变量缺失报错。

- [ ] **Step 3: 记录验证结论**

记录以下结论并在交付说明中明确：

```text
build 默认读取 .env.production，因此生产构建默认关闭 API mock；
开发者仍可通过 .env.local 或 .env.production.local 做本机覆盖。
```

## Task 4: 最小质量检查

**Files:**
- Verify: `apps/web/.env.production`
- Verify: `apps/web/.env.example`

- [ ] **Step 1: 获取最近编辑文件诊断**

Run: `GetDiagnostics` for:

```text
e:/Projects/standard-scaffold/.worktrees/codex-production-build-env/apps/web/.env.production
e:/Projects/standard-scaffold/.worktrees/codex-production-build-env/apps/web/.env.example
```

Expected: 没有新增诊断问题；如果编辑器不为 `.env` 文件返回诊断，也应记录为“无相关诊断”。

- [ ] **Step 2: 检查改动范围**

Run: `git status --short`

Expected: 只出现 `apps/web/.env.production`、`apps/web/.env.example` 和本次文档文件改动。
