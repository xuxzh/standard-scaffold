# CLAUDE.md

> **⚠️ 改代码前的硬性步骤（违反一次扣分）**
>
> 进入**任何**代码编辑前，必须按顺序完成：
>
> 1. **声明变更级别**（`L0` / `L1` / `L2` / `L3`）—— 在聊天里先说「变更级别：L1」之类的明确声明。详见 `AGENTS.md` L62。
> 2. **先切任务分支**（L0/L1 用 `codex-<task-slug>`，L2/L3 用 `.worktrees/` worktree）—— **然后**再开始编辑。详见 `AGENTS.md` L69–L71。
> 3. **确认当前分支不是 `main` / `master`** —— 稳定集成分支不直接接受开发改动。
> 4. **commit 前**用 `git diff --stat` 检查改动范围，不顺手扩大 scope。
>
> 完整规则与例外场景见 `AGENTS.md`（L62、L65、L68–L72）。

本文件为 Claude Code（claude.ai/code）在此仓库中工作时提供指引。

## 概览

本仓库是由 Turborepo 管理的 pnpm workspace，主应用为 `apps/web`（React 19 + Vite + TypeScript）。仓库内不含后端代码，前端连接外部 .NET 服务（MES、WMS、App API）。

### 常用命令

```bash
pnpm install                 # 安装依赖
pnpm dev                     # 启动全部开发任务（Vite 监听 127.0.0.1:5173）
pnpm build                   # 构建全部 workspace
pnpm lint                    # 检查全部 workspace（ESLint flat config）
pnpm typecheck               # 对全部 workspace 做类型检查

# 仅针对 Web 应用（优先使用 --filter 做定向操作）
pnpm --filter @repo/web test          # 运行单元测试（Vitest + jsdom）
pnpm --filter @repo/web lint          # 检查 Web 应用
pnpm --filter @repo/web typecheck     # 对 Web 应用做类型检查（tsc --noEmit）

# E2E 测试（Playwright）
pnpm --filter @repo/web-e2e test:e2e          # 无头模式
pnpm --filter @repo/web-e2e test:e2e:headed   # 有头浏览器
pnpm --filter @repo/web-e2e test:e2e:mock     # 使用 API mock

# E2E 快捷入口（从仓库根目录直接运行）
pnpm test:e2e                   # 无头模式
pnpm test:e2e:headed            # 有头浏览器
pnpm test:e2e:mock              # 使用 API mock
pnpm test:e2e:staging           # 指向 staging 环境

# 运行单个测试文件
pnpm --filter @repo/web test -- path/to/file.test.ts

# 完整 CI 流水线（lint → typecheck → test → e2e → build）
pnpm verify
pnpm verify:web               # 仅 Web：lint + typecheck + test + build
```

### 环境变量

从 `apps/web/.env.example` 复制为 `apps/web/.env.local` 后按需调整：

| 变量 | 说明 |
|------|------|
| `VITE_ENABLE_API_MOCKING` | `true` 启用 MSW mock（本地开发默认），`false` 访问真实后端 |
| `VITE_MOCK_RECORD_COUNT` | mock 初始化数据量，修改后需重启 Vite |
| `VITE_API_BASE_URL` | 通用 App API 地址 |
| `VITE_WMS_API_BASE_URL` | WMS API 地址 |
| `VITE_MES_API_BASE_URL` | MES API 地址 |

## 架构

### 分层结构

```
Route（薄层，转发页面组件）
  → Page（编排 filters、table、pagination、dialogs、mutations）
    → Feature 组件（Table、FilterForm、FormDialog）
      → 共享 DataTable / Field 组件
    → Service（通过 HttpClient 调用原始 API）
      → Contract（TypeScript 类型、映射函数、常量）
    → Query hooks（TanStack React Query，每个 feature 的 queries.ts）
```

`root-app.tsx` 中的 Provider 顺序（无明确设计不要调整）：`I18nProvider` → `ThemeProvider` → `QueryClientProvider` → `RouterProvider` + `Toaster`。

### API 层（`apps/web/src/lib/api/`）

- `http-client.ts` — 核心 `HttpClient`，封装 `fetch`，自动注入 Bearer token，401 时自动刷新 token，解析 `DataResult<T>` 响应信封（`{ Success, Code, Message, Attach, TotalCount }`）。
- 三个单例客户端：`getAppClient()`（通用）、`getMesClient()`（MES）、`getWmsClient()`（WMS）。各自通过环境变量解析 base URL，并支持测试用 DI 钩子。
- 后端约定：全部 POST，字段使用 PascalCase，路由为 `/{Controller}/{Action}`。查询返回 `DataResult<T>`，写操作返回 `OpResult`。分页：`PageIndex` 从 1 开始。精确查询在值前加 `$` 前缀。详见 `docs/api/common-api-spec.md`。

### Auth 层（`apps/web/src/lib/auth/`）

- `token-store.ts` — Token 基于 localStorage（accessToken、refreshToken、tokenType、expiresIn），提供 get/set/clear 及 `*ForTests` 测试辅助函数。`hasAuthToken()` 判断是否已登录。
- `auth-session.ts` — 登录/登出流程，token 刷新逻辑（401 时 `HttpClient` 自动调用）。
- `auth-redirect.ts` — 登录后安全重定向，`isSafeRedirectPath()` 防 open redirect。
- `user-display-store.ts` — 当前用户显示名缓存。
- 路由通过 `beforeLoad` + `requireAuth` 守卫；`/login` 路由检测已登录用户自动跳转 Dashboard。

### Feature 模式（`apps/web/src/features/<domain>/<feature>/`）

每个 CRUD feature 遵循以下结构（新增 feature 时可作为模板）：

| 文件 | 用途 |
|------|------|
| `*-contract.ts` | 类型定义、映射函数（`camelCase` ↔ `PascalCase`）、筛选/分页默认值 |
| `*-service.ts` | 通过客户端发起 HTTP 请求，返回解析后的 `DataResult<T>` |
| `*-queries.ts` | TanStack Query hooks（列表查询、选项查询、增删改 mutations） |
| `*-page.tsx` | 顶层编排组件：维护筛选/分页/选中状态，将查询接入表格和表单 |
| `*-table.tsx` | `DataTable` 封装：列定义、选择框、操作按钮 |
| `*-filter-form.tsx` | 筛选项 + 搜索/重置按钮 |
| `*-form-dialog.tsx` 或 `*-form-sheet.tsx` | 创建/编辑表单（Dialog 或 Sheet 中）；使用 react-hook-form + zod + Field 组件 |
| `index.ts` | Barrel 文件，显式命名导出对外入口 |
| `*.test.ts` | Vitest 测试 |

Query client 配置：`retry: false`，`staleTime: 30_000`。

### 状态管理分工

- **服务端状态** → TanStack React Query（feature `*-queries.ts` 中的 queries 与 mutations）
- **UI 偏好** → Zustand store（`stores/app-store.ts`，极简——当前仅有 `activeScopeName`）
- **主题** → React Context（`components/theme/theme-provider.tsx`）
- **表单/交互的临时状态** → 组件内 `useState`

### i18n（`apps/web/src/i18n/`）

两种语言：`zh-CN`（默认/回退）、`en-US`。四个命名空间：`common`、`dashboard`、`examples`、`auth`。资源文件为 TypeScript 对象，位于 `resources/<locale>/<namespace>.ts`。所有用户可见文案必须通过 `useTranslation()` 获取——禁止在代码中硬编码中文或英文字符串。新增或修改文案时，必须同步维护两种语言的资源文件。Key 采用语义化层级命名（如 `pages.packagingRule.actions.create`），不使用英文原文作为 key。详见 `docs/standards/web-i18n-guidelines.md`。

### UI 组件

shadcn/ui New York 风格，基于 Radix primitives，使用 Tailwind CSS v4（通过 `@tailwindcss/vite`）编写样式。图标：`lucide-react`。类名合并：`@/lib/utils` 中的 `cn()`（clsx + tailwind-merge）。Toast 反馈：`sonner`。`DataTable` 组件（`components/data-table/`）封装 TanStack Table，内置固定列、加载/空状态和可选的展开行。表单组件（`Field`、`FieldGroup`、`FieldLabel`、`FieldError`）提供一致的布局和 ARIA——应复用它们，不要用原生 div 重建。其他关键共享组件：`data-export/`（Excel 导出，基于 xlsx 库）、`data-picker/`（关联数据选择器）。

## 非显而易见的约定

- **始终使用 `pnpm`**，不使用 npm 或 yarn。
- **不要在 `main`/`master` 上直接提交开发改动**——先切分支。分支命名：`codex-<task-slug>`。
- **AI 必须先声明变更级别**——在编辑任何代码前，说明是 `L0`/`L1`/`L2`/`L3`。`L2` 及以上在进入实现前，必须已有写入 `docs/specs/` 或 `docs/plans/` 的正式 spec 或 plan。聊天中的计划、TODO、`update_plan` 输出不算正式文档。
- **保持 `packages/ui` 精简**——UI 组件应放在 `apps/web/src/components/ui`，除非明确要求，否则不要迁移到共享包。
- **新增远程数据源遵循 Contract → Service → Route/Component**。页面消费的是已整理的数据，不应直接接触原始 HTTP 响应。
- **后端 API 是外部 .NET 服务**——本仓库无后端代码。通过 MSW 进行 mock（`VITE_ENABLE_API_MOCKING=true`）。Mock store 位于 `apps/web/src/mocks/`。
- **删除和更新接口期望完整的业务 DTO 对象**，不能只传 Id。详见 `docs/api/common-api-spec.md` 第 2.4 节。
- **E2E 选择器优先级**：`getByRole` > 稳定文案 > `data-testid`。禁止依赖 Tailwind 类名或脆弱的 DOM 结构。
- **全部文档默认使用中文**，除非特别说明。代码注释、标识符和测试使用英文。
- **路径别名** `@/` → `src/*`，由 `tsconfig.json`、`vite.config.ts`、`vitest.config.ts` 三者共同维护——修改时需保持三者一致。
- **Git worktree 默认位置**：`.worktrees/`（仓库根目录下），在并行任务、长任务、`L2/L3` 或高风险改动时使用。

## CI

GitLab CI（`.gitlab-ci.yml`）使用 Playwright Docker 镜像（`mcr.microsoft.com/playwright:v1.56.1-noble`），单阶段 `validate`：`lint → typecheck → test → e2e → build`。使用 pnpm store 缓存加速。E2E 报告和测试结果作为 artifact 保留。

## 参考文档

- `AGENTS.md` — 完整治理规则、AI 开发约定、任务分级
- `docs/ai/context-index.md` — AI 会话导航地图，模块锚点和任务类型分流
- `docs/ai/README.md` — 任务入口、变更级别、完成定义
- `docs/api/common-api-spec.md` — 后端 API 契约：`DataResult<T>`、CRUD 模式、查询规则
- `docs/api/http-contract-guidelines.md` — 前端契约约定
- `docs/standards/web-code-guidelines.md` — 代码组织、barrel 导出约定、注释规范
- `docs/standards/web-business-module-guidelines.md` — 业务模块目录结构约定
- `docs/standards/web-i18n-guidelines.md` — 多语言规范
- `docs/ui/components/form-patterns.md` — 表单实现模式
- `docs/ui/components/table-patterns.md` — 表格实现模式
- `docs/ui/pages/` — 查询页（`01-query-page.md`）和 CRUD 页（`02-crud-page.md`）页面模式
- `docs/ui/common-ui-spec.md` — 通用 UI 交互规范
- `docs/adr/` — 架构决策记录（数据分层、mock 统一、任务分级治理等）
- `docs/specs/2026-05-12/frontend-monorepo-design.md` — monorepo 设计说明
- `apps/web-e2e/README.md` — E2E 测试约定
