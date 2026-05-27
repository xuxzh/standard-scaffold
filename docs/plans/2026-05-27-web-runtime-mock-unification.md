# Web 运行时 Mock 收敛到 MSW Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `apps/web` 的运行时 mock 统一走 `fetch + msw`，并把 `createMockTransport` 收敛为测试 seam。

**Architecture:** 保持 `contract -> service -> route/component` 分层不变，只收敛运行时 transport 选择规则。`app-client.ts` 与 `wms-client.ts` 统一采用 fetch transport；`mocks/handlers.ts` 作为浏览器运行时 mock 的唯一 adapter 集中点；transport 注入 API 继续保留给单元测试。

**Tech Stack:** React 19、Vite、TypeScript、MSW、Vitest、Testing Library、pnpm workspace。

---

## 文件边界

- Modify: `apps/web/src/lib/api/app-client.ts`
- Modify: `apps/web/src/lib/api/app-client.test.ts`
- Modify: `apps/web/src/mocks/handlers.ts`
- Modify: `apps/web/.env.example`
- Modify: `docs/specs/2026-05-25-web-operations-and-data-access.md`
- Create: `docs/adr/0003-web-runtime-mock-unification.md`（若在执行阶段确认要固化 ADR）

## Task 1: 重写 App Client 运行时规则测试

**Files:**

- Modify: `apps/web/src/lib/api/app-client.test.ts`

- [ ] **Step 1: 写出新的失败测试**

把 `apps/web/src/lib/api/app-client.test.ts` 改成以下测试集合，覆盖收敛后的三条规则：

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAppClient,
  resetAppTransportForTests,
  setAppTransportForTests,
} from "@/lib/api/app-client";
import type { Transport } from "@/lib/api/http-client";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetAppTransportForTests();
});

describe("getAppClient", () => {
  it("throws a clear error when API mocking is disabled and the API base URL is missing", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");

    expect(() => {
      resetAppTransportForTests();
      getAppClient();
    }).toThrow("VITE_API_BASE_URL is not configured");
  });

  it("uses same-origin fetch when API mocking is enabled", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "true");

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    resetAppTransportForTests();

    await expect(getAppClient().get("/dashboard/stats")).resolves.toEqual({
      ok: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/dashboard/stats",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("sends the access token when the API base URL is configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    localStorage.setItem("accessToken", "token-1");

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    resetAppTransportForTests();

    await expect(getAppClient().get("/dashboard/stats")).resolves.toEqual({
      ok: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/dashboard/stats",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
        }),
      }),
    );
  });

  it("allows tests to inject an app transport", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: {
        ok: true,
      },
    }));

    setAppTransportForTests(transport);

    await expect(getAppClient().post("/Health/Check")).resolves.toEqual({
      ok: true,
    });

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/Health/Check",
      body: undefined,
      signal: undefined,
    });
  });
});
```

- [ ] **Step 2: 运行测试，确认先失败**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/lib/api/app-client.test.ts
```

Expected: FAIL，因为当前 `app-client.ts` 仍会在缺少 `VITE_API_BASE_URL` 时回退到运行时 `createMockTransport`，且还没有导出 `setAppTransportForTests` 的这组测试场景。

- [ ] **Step 3: 提交测试改动**

Run:

```bash
git add apps/web/src/lib/api/app-client.test.ts
git commit -m "test: redefine app client runtime transport rules"
```

## Task 2: 收敛 App Client 到 Fetch Transport

**Files:**

- Modify: `apps/web/src/lib/api/app-client.ts`

- [ ] **Step 1: 实现最小运行时收敛**

将 `apps/web/src/lib/api/app-client.ts` 改为以下结构，删除运行时 `createMockTransport`、本地 `delay()` 和 `handleDashboardStats()`：

```ts
import {
  createFetchTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken } from "@/lib/auth/token-store";
import { isApiMockingEnabled } from "@/mocks/config";

const API_BASE_URL_ENV_KEY = "VITE_API_BASE_URL";

function getConfiguredApiBaseUrl() {
  return import.meta.env[API_BASE_URL_ENV_KEY] as string | undefined;
}

function createDefaultAppTransport() {
  const baseUrl = getConfiguredApiBaseUrl();

  if (isApiMockingEnabled()) {
    return createFetchTransport();
  }

  if (!baseUrl) {
    throw new Error(`${API_BASE_URL_ENV_KEY} is not configured`);
  }

  return createFetchTransport({
    baseUrl,
    getToken: getAccessToken,
  });
}

let appTransport: Transport | undefined;

export function getAppClient() {
  appTransport ??= createDefaultAppTransport();

  return createHttpClient({
    transport: appTransport,
    handleUnauthorized: handleUnauthorizedSession,
  });
}

export function setAppTransportForTests(nextTransport: Transport) {
  appTransport = nextTransport;
}

export function resetAppTransportForTests() {
  appTransport = undefined;
}
```

- [ ] **Step 2: 运行聚焦测试，确认通过**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/lib/api/app-client.test.ts
```

Expected: PASS，说明：

- mock 模式走同源 fetch
- 真实模式必须配置 `VITE_API_BASE_URL`
- transport 注入 seam 仍可用于测试

- [ ] **Step 3: 运行相邻测试，确认没有破坏现有数据访问 seam**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/lib/api/wms-client.test.ts apps/web/src/lib/api/http-client.test.ts
```

Expected: PASS，说明 app client 收敛没有破坏 WMS client 与通用 transport 行为。

- [ ] **Step 4: 提交运行时收敛改动**

Run:

```bash
git add apps/web/src/lib/api/app-client.ts
git commit -m "refactor: unify app runtime mock transport"
```

## Task 3: 对齐 MSW Handlers 作为运行时唯一 Mock Adapter

**Files:**

- Modify: `apps/web/src/mocks/handlers.ts`

- [ ] **Step 1: 先补运行时延迟行为测试或校验点**

在修改前先确认当前 `handlers.ts` 中已经覆盖这三个接口：

```ts
http.get("/dashboard/stats", ...)
http.post("/account/login", ...)
http.post("/account/refresh", ...)
```

执行前人工核对文件中是否存在这三条 handler；如果缺任何一条，先补齐再进入下一步。

- [ ] **Step 2: 把 dashboard 的运行时延迟迁移到 handlers**

更新 `apps/web/src/mocks/handlers.ts`，让 `dashboard` handler 自己承担轻量延迟，替代原先 `app-client.ts` 的 `handleDashboardStats()`：

```ts
import { http, HttpResponse, delay } from "msw";
import { dashboardStatsResponse } from "@/features/dashboard/dashboard-contract";
import type {
  PackagingTypeApiDto,
  PackagingTypeListQuery,
} from "@/features/wms/packaging/packaging-type/packaging-contract";
import {
  createPackagingTypeMockStore,
  type CreatePackagingTypePayload,
  type UpdatePackagingTypePayload,
} from "@/mocks/data/packaging-type-store";
import {
  createMockLoginResponse,
  createMockRefreshResponse,
} from "@/mocks/data/auth-session";

const packagingTypeStore = createPackagingTypeMockStore();

export const handlers = [
  http.get("/dashboard/stats", async () => {
    await delay(120);

    return HttpResponse.json(dashboardStatsResponse);
  }),
  http.post("/account/login", async ({ request }) => {
    const response = createMockLoginResponse(await request.json());

    return HttpResponse.json(response.data, { status: response.status });
  }),
  http.post("/account/refresh", async ({ request }) => {
    const response = createMockRefreshResponse(await request.json());

    return HttpResponse.json(response.data, { status: response.status });
  }),
  http.post("/PackagingTypeApi/GetPackagingTypeAutoQueryDatas", async ({ request }) =>
    HttpResponse.json(
      packagingTypeStore.query(
        (await request.json()) as Partial<PackagingTypeListQuery>,
      ),
    ),
  ),
  http.post("/PackagingTypeApi/StorePackagingTypeData", async ({ request }) =>
    HttpResponse.json(
      packagingTypeStore.create(
        (await request.json()) as CreatePackagingTypePayload,
      ),
    ),
  ),
  http.post("/PackagingTypeApi/UpdatePackagingTypeData", async ({ request }) =>
    HttpResponse.json(
      packagingTypeStore.update(
        (await request.json()) as UpdatePackagingTypePayload,
      ),
    ),
  ),
  http.post("/PackagingTypeApi/RemovePackagingTypeData", async ({ request }) =>
    HttpResponse.json(
      packagingTypeStore.remove(
        (await request.json()) as Pick<PackagingTypeApiDto, "Id">,
      ),
    ),
  ),
  http.post("/PackagingTypeApi/RemoveBatchPackagingTypeDatas", async ({ request }) =>
    HttpResponse.json(
      packagingTypeStore.removeBatch(
        (await request.json()) as Array<Pick<PackagingTypeApiDto, "Id">>,
      ),
    ),
  ),
];
```

- [ ] **Step 3: 运行与 dashboard、auth 相关测试**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/features/auth/auth-service.test.ts apps/web/src/app.test.tsx
```

Expected: PASS。如果这里失败，优先排查是否有测试还在依赖 `app-client.ts` 的运行时内存 mock，而不是 `msw` 或 transport 注入。

- [ ] **Step 4: 提交 handler 收口改动**

Run:

```bash
git add apps/web/src/mocks/handlers.ts
git commit -m "refactor: centralize runtime mock handlers in msw"
```

## Task 4: 更新环境与运行约定文档

**Files:**

- Modify: `apps/web/.env.example`
- Modify: `docs/specs/2026-05-25-web-operations-and-data-access.md`
- Create: `docs/adr/0003-web-runtime-mock-unification.md`（可选但推荐）

- [ ] **Step 1: 更新环境模板说明**

把 `apps/web/.env.example` 调整为明确说明 mock 与真实模式语义：

```env
# 复制为 apps/web/.env.local 后，按需调整以下配置。
# VITE_ENABLE_API_MOCKING=true 时，应用会启用 MSW 拦截浏览器请求，适合长期本地联调。
# VITE_WMS_API_BASE_URL 用于未开启 API mock 时访问真实 WMS API。
VITE_ENABLE_API_MOCKING=true
VITE_WMS_API_BASE_URL=http://127.0.0.1:8283
```

如果本次执行要让 app API 也支持真实地址配置，则补充：

```env
# VITE_API_BASE_URL 用于未开启 API mock 时访问真实 app API。
VITE_API_BASE_URL=http://127.0.0.1:8080
```

- [ ] **Step 2: 更新运行与数据访问 spec**

把 `docs/specs/2026-05-25-web-operations-and-data-access.md` 中这两段替换为新的表述：

```md
- 应用级 client 与 WMS client 在运行时统一走 fetch transport。
- 本地 mock 模式通过 `VITE_ENABLE_API_MOCKING=true` 启动 `msw`，由浏览器层 handlers 拦截请求。
- 测试如果需要替换数据源，应使用 `setAppTransportForTests` / `resetAppTransportForTests` 或 `setWmsTransportForTests` / `resetWmsTransportForTests` 注入 transport，而不是直接改组件实现。
```

同时把：

```md
- 当前 dashboard 数据来自应用内 mock transport，不依赖外部 API 环境变量；后续切换真实后端时，再补充部署期配置说明。
```

替换为：

```md
- 当前 dashboard、登录和本地业务请求在 mock 模式下由 `msw` 提供浏览器层拦截；关闭 mock 时需要配置真实 API 地址。
```

- [ ] **Step 3: 固化 ADR（推荐执行）**

新增 `docs/adr/0003-web-runtime-mock-unification.md`：

```md
# ADR-0003 收敛 Web 运行时 Mock 到 MSW

日期：2026-05-27

## 状态

Accepted

## 背景

`apps/web` 运行时同时存在 app client 内存 mock 和 `msw` browser mock，导致运行时行为不一致、调试体验混乱，并增加同一接口的重复维护成本。

## 决策

- `apps/web` 的运行时 mock 统一走 `fetch + msw`。
- `createMockTransport` 仅保留给测试 seam。
- `app-client.ts` 与 `wms-client.ts` 不再提供运行时内存 mock 回退。
- 未开启 mock 且缺少必要 base URL 时，直接暴露配置错误。

## 后果

- 正向影响：浏览器调试、E2E 和本地联调对运行时请求的观察方式一致。
- 约束或成本：开发环境必须明确选择 mock 模式或真实 API 配置，不能再依赖静默回退假数据。
- 后续触发条件：如未来引入 SSR、Node 侧渲染或服务端测试运行时，需要重新评估 `msw` 在非浏览器上下文中的 adapter 设计。
```

- [ ] **Step 4: 提交文档改动**

Run:

```bash
git add apps/web/.env.example docs/specs/2026-05-25-web-operations-and-data-access.md docs/adr/0003-web-runtime-mock-unification.md
git commit -m "docs: document runtime mock unification"
```

如果本次不新增 ADR，则从 `git add` 中移除该文件，并在提交说明中写明“仅更新 spec 与环境说明”。

## Task 5: 最终验证与浏览器证据

**Files:**

- Verify all modified files above.

- [ ] **Step 1: 运行 web 定向验证**

Run:

```bash
pnpm --filter @repo/web test
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

Expected: PASS。

- [ ] **Step 2: 运行本地 E2E（如环境允许）**

Run:

```bash
pnpm --filter @repo/web-e2e test:e2e
```

Expected: PASS；至少登录和基础页面导航在 `VITE_ENABLE_API_MOCKING=true` 模式下保持稳定。

- [ ] **Step 3: 收集浏览器层验证证据**

本地启动：

```bash
pnpm --filter @repo/web dev
```

然后在浏览器中手工验证：

- 打开登录页并提交 mock 账号。
- 在 DevTools `Network` 面板确认 `/account/login` 请求可见。
- 在请求条目中确认它由 `Service Worker` 拦截，或显示来自 `ServiceWorker`。
- 进入 dashboard 后确认 `/dashboard/stats` 请求同样可见。

- [ ] **Step 4: 提交最终验证后的收尾提交**

Run:

```bash
git status --short
git add apps/web/src/lib/api/app-client.ts apps/web/src/lib/api/app-client.test.ts apps/web/src/mocks/handlers.ts apps/web/.env.example docs/specs/2026-05-25-web-operations-and-data-access.md docs/adr/0003-web-runtime-mock-unification.md
git commit -m "refactor: unify web runtime mocking with msw"
```

如果前面已经按任务提交过，这一步改为检查工作区干净，并只在还有未提交改动时再提交。

## 自检清单

- `app-client.ts` 是否已彻底移除运行时 `createMockTransport` 回退
- `handlers.ts` 是否承接了 dashboard、登录、刷新三类 app 级 mock
- `app-client.test.ts` 是否不再断言“缺少 base URL 时返回本地登录 mock”
- `wms-client.test.ts` 与 `http-client.test.ts` 是否仍通过
- 文档是否明确说明 mock 模式与真实模式的配置语义
