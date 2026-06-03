# Print API Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 参照 `mes-client.ts` / `wms-client.ts` 模式，新建 `print-client.ts` 和对应单元测试，暴露 `getPrintClient()` 供后续 Print 服务调用。

**Architecture:** 复用 `apps/web/src/lib/api/http-client.ts` 的 `createFetchTransport` + `createHttpClient` 抽象。通过 env key `VITE_PRINT_API_BASE_URL` 配置目标地址（默认端口 3002），懒初始化 transport，支持 mock 模式和测试注入。

**Tech Stack:** React 19、Vite、TypeScript、Vitest、pnpm workspace。

**变更级别:** `L1` — 纯新增文件，在既有模式下派生新 client，不修改任何已有代码，不改变核心架构边界。

---

## 范围与前置条件

- 本计划覆盖 2 个新增文件：`print-client.ts`、`print-client.test.ts`
- 不修改任何已有文件
- 前置条件：`http-client.ts`、`mes-client.ts`、`wms-client.ts` 已稳定存在（均已完成）
- Print 服务端口：**3002**，环境变量 key：`VITE_PRINT_API_BASE_URL`
- 命名约定：与现有 `mes-client`/`wms-client` 保持一致（全小写 + 连字符）

## 非目标

- 不调整 `http-client.ts` 公共抽象
- 不迁移或重构现有 client
- 不新增 Print 业务逻辑、service 或 UI 页面
- 不修改 `.env`、`.env.local` 或任何环境配置文件

## 文件边界

- Create: `apps/web/src/lib/api/print-client.ts`
- Create: `apps/web/src/lib/api/print-client.test.ts`
- Inspect (已有，作为模板): `apps/web/src/lib/api/mes-client.ts`、`apps/web/src/lib/api/wms-client.ts`、`apps/web/src/lib/api/mes-client.test.ts`、`apps/web/src/lib/api/wms-client.test.ts`

## 验证命令

```bash
pnpm --filter @repo/web test -- --run src/lib/api/print-client.test.ts
```

## Task 1: 新建 `print-client.ts`

参照 `mes-client.ts` 结构，仅替换标识符：

- [ ] env key 常量: `VITE_PRINT_API_BASE_URL`
- [ ] 内部函数: `getConfiguredPrintApiBaseUrl()` — 从 `import.meta.env` 读取
- [ ] 内部函数: `createDefaultPrintTransport()` — mock 模式返回无参 transport，否则用 `baseUrl` + `getAccessToken` 构建
- [ ] 模块级变量: `let printTransport: Transport | undefined`
- [ ] 导出: `getPrintClient()` — 懒初始化，调用 `createHttpClient({ transport, handleUnauthorized })`
- [ ] 导出: `setPrintTransportForTests(nextTransport)` — 测试用，直接覆写 transport
- [ ] 导出: `resetPrintTransportForTests()` — 测试用，重置为 undefined

## Task 2: 新建 `print-client.test.ts`

参照 `mes-client.test.ts`，4 个测试用例：

- [ ] Test 1: "uses the configured Print API base URL"  
  `vi.stubEnv("VITE_PRINT_API_BASE_URL", "http://192.168.0.135:3002")` + mock 关闭 + token，验证 `getPrintClient().postDataResult(...)` 正确拼接 URL 并携带 `Authorization: Bearer token-1`

- [ ] Test 2: "throws a clear error when the Print API base URL is missing"  
  `vi.stubEnv("VITE_PRINT_API_BASE_URL", "")` + mock 关闭，断言 `getPrintClient()` 抛出 `"VITE_PRINT_API_BASE_URL is not configured"`

- [ ] Test 3: "uses same-origin fetch when API mocking is enabled without a Print base URL"  
  `VITE_PRINT_API_BASE_URL` 为空 + `VITE_ENABLE_API_MOCKING=true`，验证路径不拼接 base URL

- [ ] Test 4: "allows tests to inject a Print transport"  
  `setPrintTransportForTests(transport)` 注入 mock transport，验证 `getPrintClient().post(...)` 调用注入的 transport

- [ ] `afterEach` 中调用 `resetPrintTransportForTests()` + `localStorage.clear()` + `vi.unstubAllEnvs()` + `vi.unstubAllGlobals()`

## Task 3: 运行验证

- [ ] 执行 `pnpm --filter @repo/web test -- --run src/lib/api/print-client.test.ts`
- [ ] 预期：4 个测试全部通过，无新增错误
