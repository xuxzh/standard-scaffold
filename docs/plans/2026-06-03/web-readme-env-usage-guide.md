# Web README 环境使用说明补充 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/web/README.md` 中补齐团队环境使用说明，让开发者清楚区分开发覆盖与生产构建默认值，并能按常见场景直接操作。

**Architecture:** 保持 `apps/web/README.md` 作为 Web 应用的单一入口文档，不新建额外说明文件。通过重写现有 `.env` 初始化章节并补充环境文件职责、常见场景和覆盖规则，在不改代码的前提下更新团队使用认知。

**Tech Stack:** Markdown、Vite 环境文件约定、pnpm workspace。

---

## 范围与前置条件

- 变更级别：`L1`
- 当前工作区：`e:/Projects/standard-scaffold/.worktrees/codex-production-build-env`
- 当前分支：`codex-production-build-env`
- 只修改文档，不变更运行时代码、构建脚本和环境变量键名。

## 文件边界

- Modify: `apps/web/README.md`
- Create: `docs/plans/2026-06-03/web-readme-env-usage-guide.md`

## Task 1: 重构 README 的环境说明结构

**Files:**

- Modify: `apps/web/README.md`

- [ ] **Step 1: 读取当前 README 环境相关章节**

重点核对以下内容是否存在并准备替换：

```text
## `.env` 初始化
## 本地运行
## 常用命令
```

- [ ] **Step 2: 将 `.env` 初始化章节改写为“环境文件与初始化”**

目标结构如下：

````md
## 环境文件与初始化

`apps/web` 依赖 Vite 环境文件为 app/WMS/MES/Print API 提供地址，并控制是否启用浏览器端 API mock。

初始化本机开发配置：

```bash
cp apps/web/.env.example apps/web/.env.local
```
````

````

- [ ] **Step 3: 在初始化章节后插入环境文件职责说明**

写入以下四条说明，表达含义保持一致：

```md
- `apps/web/.env.example`：示例模板，用于初始化本机配置，不作为团队默认运行值。
- `apps/web/.env.local`：开发者本机覆盖配置，用于 mock 开发或真实接口联调，不提交到仓库。
- `apps/web/.env.production`：仓库内生产构建默认值，`pnpm --filter @repo/web build` 默认读取。
- `apps/web/.env.production.local`：本机临时覆盖生产构建值，优先级高于 `.env.production`。
````

## Task 2: 增加常见场景操作说明

**Files:**

- Modify: `apps/web/README.md`

- [ ] **Step 1: 添加“本地 mock 开发”示例**

在 README 中加入以下示例内容：

````md
### 本地 mock 开发

在 `apps/web/.env.local` 中设置：

```env
VITE_ENABLE_API_MOCKING=true
VITE_MOCK_RECORD_COUNT=40
```
````

然后运行：

```bash
pnpm --filter @repo/web dev
```

````

- [ ] **Step 2: 添加“本地真实接口联调”示例**

在 README 中加入以下示例内容：

```md
### 本地真实接口联调

在 `apps/web/.env.local` 中设置：

```env
VITE_ENABLE_API_MOCKING=false
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_WMS_API_BASE_URL=http://192.168.0.135:8283
VITE_MES_API_BASE_URL=http://192.168.0.135:8282
VITE_PRINT_API_BASE_URL=http://127.0.0.1:3002
````

修改后需要重启 Vite 开发服务器：

```bash
pnpm --filter @repo/web dev
```

````

- [ ] **Step 3: 添加“生产构建”说明**

在 README 中加入以下说明：

```md
### 生产构建

直接运行：

```bash
pnpm --filter @repo/web build
````

默认会读取 `apps/web/.env.production`，因此不需要在打包前手工改 `.env.local`。

如果本机存在 `apps/web/.env.production.local`，它会覆盖仓库中的 `.env.production`。

````

## Task 3: 调整 README 现有说明避免冲突

**Files:**
- Modify: `apps/web/README.md`

- [ ] **Step 1: 删除或改写旧的 `.env.local` 单一路径描述**

将这类旧表述改写为更准确版本：

```md
- `VITE_API_BASE_URL`、`VITE_WMS_API_BASE_URL` 和 `VITE_MES_API_BASE_URL` 在关闭 API mock 时都建议配置
- 修改 `.env.local` 后需要重启 Vite 开发服务器
- `.env.local` 用于本机私有配置，不应提交到仓库
- `.env.example` 只保留示例值和初始化模板
````

改写目标：

```md
- 关闭 API mock 时，需要为对应数据域配置真实 API base URL。
- 修改 `.env.local` 或 `.env.production.local` 后，需要重新执行对应命令。
- `.env.local` 和 `.env.production.local` 都属于本机私有覆盖文件，不应提交到仓库。
- `.env.example` 只提供初始化模板；团队默认生产构建值以 `.env.production` 为准。
```

- [ ] **Step 2: 保留 README 的原有结构顺序**

确保以下章节仍然存在，且顺序不被打乱：

```text
## 启动前准备
## 环境文件与初始化
## 本地运行
## 常用命令
## 测试与验证
```

- [ ] **Step 3: 复读 README，确认文案自洽**

Run: `Get file contents for apps/web/README.md`

Expected: 环境说明与 `.env.production` 新约定一致，不再把 `.env.local` 描述成唯一入口。

## Task 4: 最小文档验证

**Files:**

- Verify: `apps/web/README.md`

- [ ] **Step 1: 获取 README 诊断信息**

Run: `GetDiagnostics` for:

```text
e:/Projects/standard-scaffold/.worktrees/codex-production-build-env/apps/web/README.md
```

Expected: 没有新增 diagnostics。

- [ ] **Step 2: 检查 Markdown 中的关键字是否齐全**

Run: search for:

```text
.env.example
.env.local
.env.production
.env.production.local
pnpm --filter @repo/web build
```

Expected: README 能搜索到上述关键字。

- [ ] **Step 3: 检查改动范围**

Run: `git status --short`

Expected: 至少出现 `apps/web/README.md` 及本次 spec/plan 文档改动，不应引入无关文件修改。
