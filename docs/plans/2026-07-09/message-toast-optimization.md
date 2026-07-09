# 全局消息提示系统优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` or equivalent step-by-step execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 把全站 54 个分散的 `toast.success/error` 调用收敛到统一的 `notify` 工具层，调整 sonner Toaster 位置到顶部居中，新增 `[F]` 前缀标识前端消息，并在所有接口调用提示中同步展示后端 `res.Message`，让用户能直观区分前后端提示并看到后端原始信息。

**实现方式：** 1) 在 `apps/web/src/components/ui/sonner.tsx` 把 Toaster 切到 `top-center`；2) 新增 `apps/web/src/lib/notify.ts` 统一包装层，自动加 `[F]` 前缀并支持 `description` 透出后端 `Message`；3) 将 `postDataResult` 返回类型由 `Attach` 调整为完整 `DataResult<T>`，让成功路径也能拿到后端 `Message`；4) 在 `createAppQueryClient` 增加 `queryCache`/`mutationCache.onError`，集中处理 `HttpClientError`；5) 迁移所有调用点至 `notify`，删掉重复的 `getErrorMessage` 与 `useEffect([isError])`。

**技术栈：** React 19、TypeScript、TanStack Query v5、sonner v2、i18next + react-i18next、Vitest、Testing Library。

## 全局约束

- 任务级别：`L2`。涉及跨文件行为变更（sonner 全局配置、http-client 返回类型、QueryClient 缓存层、10 个页面调用点、i18n 资源），同时也是跨目录改动。
- 不在 `main` 直接修改；当前任务 worktree 为 `.worktrees/codex-message-toast-optimization`，分支为 `codex-message-toast-optimization`。
- 代码中不出现硬编码中/英 UI 文案；新增文案必须同步 `zh-CN` 和 `en-US` 资源。
- 提示格式：前端文案作为 toast 主标题并自动加 `[F]` 前缀；后端 `Message` 作为 sonner `description` 副标题。
- 不改变 `<Toaster />` 在 `apps/web/src/root-app.tsx` 的挂载位置；只调整 `sonner.tsx` 内部的 Toaster props。
- 保留 i18n namespace 组织原则（feature feedback 留在 `pages.<feature>.feedback.*`，新增通用提示模板只放 `common.feedback.*`）。
- 测试断言：`toast.success/error` → `notify.success/error` 调用方式与原签名兼容（`(message, options?)`）；测试中通过 `vi.mock("@/lib/notify", ...)` 替换。

## 设计要点

### 1. Toaster 位置与样式

- `apps/web/src/components/ui/sonner.tsx`：
  - 给底层 `Sonner` 传 `position="top-center"`。
  - 通过 `style`/`className` 让顶部距离适中（约 `top: 16px`），避免被全局 header 遮挡。
  - 保留现有 `theme`/`icons`/`className`/`--normal-bg` 等样式 token。

### 2. notify 工具层

- 新建 `apps/web/src/lib/notify.ts`，导出 `notify.success(message, options?)` 与 `notify.error(message, options?)`：
  - 行为等价于 `toast.success/error(message, options)`，但 `message` 形参会自动加 `[F] ` 前缀（除非传 `options.silent` 或显式覆盖）。
  - `options.description` 直接透传给 sonner（用于显示后端 `Message`）。
  - 接受 `options.duration` / `options.id` 等其它 sonner 原生字段。
- 导出 `notify.fromHttpClientError(error: unknown, fallback: string)`：
  - 接收任意错误，若为 `HttpClientError` 则把 `error.message`（即后端 `Message`）作为 `description`、把 `fallback`（来自 i18n）作为主标题；非 `HttpClientError` 时只用 `fallback` 作为主标题。
- 导出 `notify.apiSuccess(i18nKey, dataResult, options?)`：
  - 接收 i18n key 与 `DataResult<T>`；若 `dataResult.Message` 非空则作为 `description`，主标题使用 i18n key 翻译结果。

### 3. 调整 `postDataResult` 返回类型

- 修改 `apps/web/src/lib/api/http-client.ts`：
  - `postDataResult<T>` 改为返回 `Promise<DataResult<T>>`（不再返回 `Attach`），业务失败继续抛 `HttpClientError`，行为不变。
  - 不破坏 `get<T>` / `post<T>`。
- 修改所有 service 调用方与 `<feature>-queries.ts`，把 `await postDataResult<X>(...)` 改为消费完整 `DataResult<X>`：
  - `auth-service.ts`：返回值原样透传（已有逻辑保持），调用处解构 `Attach`。
  - `packaging-*` / `material-packaging-relation` / `material-picker` / `material-unit` / `inventory-verification-strategy` / `label-rule` / `print-template` / `data-import` 等 13 个 service 文件：保留函数签名 `Attach`，但内部 `return dataResult.Attach`。
- 修改所有 `useXxxMutation` 的回调签名（`useMutation({ mutationFn })`），让 `mutationFn` 返回完整 `DataResult<T>`，然后页面调用 `mutateAsync` 后能拿到 `Message`。

### 4. 集中化 React Query 错误处理

- 修改 `apps/web/src/lib/query-client.ts`：
  - 引入 `QueryCache` 与 `MutationCache`，分别绑定 `onError`：
    - 对 `queryCache.onError`：若 `error instanceof HttpClientError` 且不是静默忽略（如登录刷新 token 接口），调用 `notify.fromHttpClientError(error, t("common.feedback.loadFailed"))`。
    - 对 `mutationCache.onError`：调用 `notify.fromHttpClientError(error, t("common.feedback.submitFailed"))`。
    - 提供 `defaultOptions.mutations.onError` 作为兜底。
  - i18n 文案读不到 React Hook 上下文，使用 `i18next.t(...)` 静态调用（`i18next` 已通过 `apps/web/src/i18n/config.ts` 初始化）。
- 让 `createAppQueryClient` 在创建时已经能 import i18n 与 `HttpClientError`，因此 query-client.ts 顶部 `import i18n from "@/i18n/config"` 是可接受的副作用导入。
- 登录页（`auth-service.ts` 中 `/account/login` 失败）保留页面级 `notify.fromHttpClientError`，因为它在 QueryClient 之前；不依赖 queryCache。

### 5. 迁移调用点

逐文件迁移到 `notify`，删除 `getErrorMessage` 重复实现：

- `apps/web/src/features/auth/login-page.tsx`：catch 中调用 `notify.fromHttpClientError(error, t("login.feedback.failed", { ns: "auth" }))`；登录成功后无需 toast（直接跳转）。
- `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx`：toast → notify.success/error。
- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.tsx`：删除 `getErrorMessage` 与列表 `useEffect([isError])`；mutation 成功后调用 `notify.apiSuccess("pages.packagingType.feedback.created", result)` 风格；删除内嵌的 try/catch（queryCache 已处理）。
- `apps/web/src/features/mes/packaging/packaging-level/packaging-level-page.tsx`：同上。
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.tsx`：同上。
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx`：toast.error → notify.error（保留行内校验提示）。
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.tsx`：同上。
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.tsx`：同上。
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.tsx`：同上。
- `apps/web/src/components/examples/react-hook-form-example.tsx`：toast.success → notify.success。

### 6. i18n 资源

- 在 `apps/web/src/i18n/resources/zh-CN/common.ts` 与 `en-US/common.ts` 新增：
  - `common.feedback.loadFailed`：通用列表加载失败提示。
  - `common.feedback.submitFailed`：通用提交失败提示。
  - `common.feedback.prefix`：`[F]`，提供给 notify 模板使用（避免硬编码）；保留字符串可被 `t` 注入替换的占位符。
- 现有 `pages.<feature>.feedback.*` 文案全部保留（成功 toast 的主标题仍来自这里）。

### 7. 测试改造

- 6 个页面的 `*.test.tsx` 文件：
  - `vi.mock("sonner", ...)` 改为 `vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn(), fromHttpClientError: vi.fn(), apiSuccess: vi.fn() } }))`。
  - 用 `expect(notify.error).toHaveBeenCalledWith(...)` / `expect(notify.apiSuccess).toHaveBeenCalledWith(...)` 替代现有断言。
  - 新增 1 个用例覆盖顶部居中位置与 `[F]` 前缀（构造一个 `notify.success("hello")` 调用，断言实际传给 sonner 的 message 以 `[F] ` 开头）。
- 新增 `apps/web/src/lib/notify.test.ts`：单元测试 `notify.success` 的前缀拼接、`notify.fromHttpClientError` 的 fallback 行为、`notify.apiSuccess` 对空 `Message` 的退化。

## 文件清单

### 新建

- `apps/web/src/lib/notify.ts`
- `apps/web/src/lib/notify.test.ts`
- `docs/plans/2026-07-09/message-toast-optimization.md`

### 修改

- `apps/web/src/components/ui/sonner.tsx`（position + 顶部间距）
- `apps/web/src/lib/api/http-client.ts`（`postDataResult` 返回类型）
- `apps/web/src/lib/query-client.ts`（QueryCache + MutationCache.onError）
- `apps/web/src/i18n/resources/zh-CN/common.ts`（新增 `common.feedback.*`）
- `apps/web/src/i18n/resources/en-US/common.ts`（同上）
- `apps/web/src/features/auth/auth-service.ts`（返回值透传）
- `apps/web/src/features/auth/login-page.tsx`
- `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx`
- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.tsx`
- `apps/web/src/features/mes/packaging/packaging-level/packaging-level-page.tsx`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.tsx`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.tsx`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.tsx`
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.tsx`
- `apps/web/src/components/examples/react-hook-form-example.tsx`
- 8 个 `<feature>-queries.ts`（mutation 函数返回类型调整为 `DataResult<T>`）：
  - `apps/web/src/features/auth/auth-queries.ts`（如存在）
  - `apps/web/src/features/mes/packaging/*/*-queries.ts`（按实际文件）
  - `apps/web/src/features/mes/material/material-picker-queries.ts`（如存在）

### 测试

- 上述 6 个 `*.test.tsx` 全部更新 mock 目标
- 新增 `apps/web/src/lib/notify.test.ts`

---

## 任务 1：调整 Toaster 位置与样式

**文件：**

- 修改：`apps/web/src/components/ui/sonner.tsx`

**接口：**

- 消费：现有 `Toaster` 组件 props 透传。
- 产出：底层 `<Sonner position="top-center" />` + 顶部留出 16px 间距。

- [ ] **步骤 1：在 sonner.tsx 中显式传入 `position="top-center"`**

```text
在 Toaster 函数组件内给 <Sonner> 显式加 position="top-center"，并通过 className/style 增加 toaster 顶部偏移。
```

- [ ] **步骤 2：typecheck 验证**

```bash
cd apps/web
pnpm typecheck
```

预期：sonner.tsx 通过类型检查。

## 任务 2：新增 notify 工具层与单测

**文件：**

- 新建：`apps/web/src/lib/notify.ts`
- 新建：`apps/web/src/lib/notify.test.ts`

**接口：**

- 消费：sonner 的 `toast.success/error`；`HttpClientError` 类型；i18n `t`。
- 产出：
  - `notify.success(message, options?)` → 调 `toast.success("[F] " + message, options)`。
  - `notify.error(message, options?)` → 调 `toast.error("[F] " + message, options)`。
  - `notify.fromHttpClientError(error, fallback)` → 按 `error.message` / `fallback` 决定 title 和 description。
  - `notify.apiSuccess(i18nKey, dataResult, options?)` → 若 `dataResult.Message` 非空则同时作为 description。

- [ ] **步骤 1：编写失败用例**

```text
在 notify.test.ts 编写以下用例：
1. notify.success("保存成功") 应该让内部 toast.success 收到 "[F] 保存成功"
2. notify.error("保存失败") 同理
3. notify.fromHttpClientError(new HttpClientError({ message: "后端报错", code: "BUSINESS_ERROR" }), "提交失败") 应调用 toast.error("提交失败", { description: "后端报错" })
4. notify.apiSuccess("pages.x.created", { Success: true, Code: null, Message: "已创建", Attach: null, ... }) 应调用 toast.success("[F] pages.x.created", { description: "已创建" })
```

- [ ] **步骤 2：运行测试确认失败**

```bash
cd apps/web
pnpm exec vitest run src/lib/notify.test.ts
```

预期：测试因找不到模块或未实现而失败。

- [ ] **步骤 3：实现 notify 模块**

```text
apps/web/src/lib/notify.ts：
- 导入 toast from "sonner"
- 内部 helper prefixMessage(m) => m.startsWith("[F]") ? m : "[F] " + m
- 导出 notify.success/error/fromHttpClientError/apiSuccess
```

- [ ] **步骤 4：再次运行验证**

```bash
cd apps/web
pnpm exec vitest run src/lib/notify.test.ts
```

预期：notify.test.ts 全部通过。

## 任务 3：调整 postDataResult 返回 DataResult 与 service/queries 同步

**文件：**

- 修改：`apps/web/src/lib/api/http-client.ts`
- 修改：所有 service 文件（13 个）
- 修改：所有 `<feature>-queries.ts`（mutation 函数返回类型）

**接口：**

- 消费：调用方需要 `result.Message` 作为描述。
- 产出：
  - `postDataResult<T>(path, body?, options?)` 返回 `Promise<DataResult<T>>`。
  - service 文件函数签名仍是 `(...) => Promise<Attach>`，内部 `return (await postDataResult<Attach>(...)).Attach`。
  - queries 文件 `mutationFn` 返回 `DataResult<Attach>`；`onSuccess` 拿完整 result。

- [ ] **步骤 1：先调整 http-client.ts 类型**

```text
postDataResult<T> 由 Promise<T> 改为 Promise<DataResult<T>>；
assertSuccessfulDataResult<T>(data): DataResult<T> 已经存在，可直接返回。
```

- [ ] **步骤 2：调整 service 函数内部**

```text
每个 service 函数 (现在 return await postDataResult<X>(...)) 改为：
const result = await postDataResult<X>(...);
return result.Attach;
```

- [ ] **步骤 3：调整 queries 文件**

```text
mutationFn 不再 return result.Attach，让其返回 result (DataResult<X>)；
mutation 的 onSuccess 回调可选地拿 result.Message。
```

- [ ] **步骤 4：typecheck**

```bash
cd apps/web
pnpm typecheck
```

预期：所有调用方通过类型检查；没有破坏页面组件。

## 任务 4：集中化 React Query 错误处理

**文件：**

- 修改：`apps/web/src/lib/query-client.ts`

**接口：**

- 消费：所有 `useQuery`/`useMutation` 的错误（已是 `HttpClientError`）。
- 产出：QueryCache + MutationCache 自动 toast；登录路径在 QueryClient 之外仍由页面处理。

- [ ] **步骤 1：实现 query-client.ts**

```text
在 createAppQueryClient() 内：
- import { QueryCache, MutationCache } from "@tanstack/react-query"
- import i18n from "@/i18n/config"（副作用已在 root-app 触发）
- import { notify } from "@/lib/notify"
- 新增 queryCache = new QueryCache({ onError: (err) => notify.fromHttpClientError(err, i18n.t("common.feedback.loadFailed")) })
- 新增 mutationCache = new MutationCache({ onError: (err) => notify.fromHttpClientError(err, i18n.t("common.feedback.submitFailed")) })
- 在 new QueryClient({ queryCache, mutationCache, defaultOptions }) 中传入
```

- [ ] **步骤 2：typecheck**

```bash
cd apps/web
pnpm typecheck
```

预期：通过。

## 任务 5：迁移所有页面调用点到 notify

**文件：**

- 修改 10 个生产文件（详见上文文件清单）

**接口：**

- 消费：现有 `toast.success/error` 调用与 `getErrorMessage(error)` 重复实现。
- 产出：所有 `toast.*` 调用替换为 `notify.*`；删除页面内 `useEffect([isError])` 与 `try/catch`（queryCache 已处理）；mutation 成功后用 `notify.apiSuccess(i18nKey, result)`。

- [ ] **步骤 1：迁移 auth/login-page.tsx**

```text
保持原有 try/catch（auth/login 走 axios 而非 react query）；
catch 中改为 notify.fromHttpClientError(error, t("login.feedback.failed", { ns: "auth" }))。
```

- [ ] **步骤 2：迁移其余 9 个页面**

```text
import { toast } from "sonner" 改为 import { notify } from "@/lib/notify"；
toast.success(...) → notify.success(...) 或 notify.apiSuccess("pages.x.feedback.created", result, ...)；
toast.error(...) → notify.error(...)（页面内手动 catch 的情况）；
删除 getErrorMessage 局部实现和 useEffect([isError]) 列表错误监听。
```

- [ ] **步骤 3：更新所有 `*.test.tsx` mock**

```text
vi.mock("sonner", ...) 改为 vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn(), fromHttpClientError: vi.fn(), apiSuccess: vi.fn() } }));
toastSuccess / toastError 改名 notifySuccess / notifyError / notifyApiSuccess；
断言改为 expect(notify.*).toHaveBeenCalledWith(...)。
```

- [ ] **步骤 4：lint + 单测**

```bash
cd apps/web
pnpm exec eslint src/lib/notify.ts src/lib/notify.test.ts src/features/auth/login-page.tsx src/features/mes/packaging/packaging-type/packaging-type-page.tsx src/features/mes/packaging/packaging-level/packaging-level-page.tsx src/features/mes/packaging/packaging-kit/packaging-kit-page.tsx src/features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx src/features/mes/packaging/packaging-spec/packaging-spec-page.tsx src/features/mes/packaging/packaging-rule/packaging-rule-page.tsx src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.tsx src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx src/components/examples/react-hook-form-example.tsx
pnpm exec vitest run src/lib/notify.test.ts src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx src/features/mes/packaging/packaging-level/packaging-level-page.test.tsx src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx
```

预期：lint 通过；上述页面测试通过。

## 任务 6：i18n 资源补齐

**文件：**

- 修改：`apps/web/src/i18n/resources/zh-CN/common.ts`
- 修改：`apps/web/src/i18n/resources/en-US/common.ts`

**接口：**

- 消费：`common.feedback.loadFailed`、`common.feedback.submitFailed`。
- 产出：两个 locale 同步新增键；保持 `as const` 与 `export default` 风格。

- [ ] **步骤 1：在 common.ts 内新增通用反馈键**

```text
zh-CN:
common.feedback.prefix: "[F]"
common.feedback.loadFailed: "加载失败"
common.feedback.submitFailed: "提交失败"

en-US:
common.feedback.prefix: "[F]"
common.feedback.loadFailed: "Failed to load"
common.feedback.submitFailed: "Submit failed"
```

- [ ] **步骤 2：typecheck + 现有 i18n 测试**

```bash
cd apps/web
pnpm typecheck
pnpm exec vitest run src/i18n/config.test.ts
```

预期：通过。

## 任务 7：最终验证

- [ ] **步骤 1：lint 全量**

```bash
pnpm lint
```

预期：全部通过。

- [ ] **步骤 2：typecheck 全量**

```bash
pnpm typecheck
```

预期：全部通过。

- [ ] **步骤 3：Web 单测全量**

```bash
pnpm --filter @repo/web test
```

预期：全部通过。

- [ ] **步骤 4：构建验证**

```bash
pnpm build
```

预期：构建成功。

- [ ] **步骤 5：手工验证（开发模式）**

```bash
pnpm dev
```

手动访问以下流程，确认 toast 在顶部居中、文案带 `[F]` 前缀、接口失败时显示后端 Message：

1. `/login`：错误密码登录 → 顶部居中 toast 出现，文案以 `[F]` 开头，描述为后端返回的错误信息。
2. `/packaging/packaging-type`：列表加载失败 → 顶部居中提示。
3. `/packaging/packaging-type`：新建一条成功 → 顶部居中提示带 `[F] 已新建` + 后端 Message。
4. `/packaging/packaging-type`：删除一个被引用的记录 → 顶部居中错误提示带 `[F] 删除失败` + 后端 Message。

## 非目标

- 不调整 i18n namespace 注册、provider 顺序、router 配置。
- 不引入新的 UI 组件或第三方库；只使用现有 sonner。
- 不重写 export / import 流程的提示；仅替换 toast 调用方式。
- 不修改 `http-client.ts` 的 transport、401 处理、envelope 校验逻辑。
- 不调整 `apps/web-e2e` 测试；E2E 行为可见性不变（toast 位置由 CSS 改变，selector 仍可基于文案）。