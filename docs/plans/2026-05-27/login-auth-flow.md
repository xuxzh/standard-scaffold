# 登录与 Token 刷新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `apps/web` 增加独立登录页、受保护后台路由、持久 token 存储和 HTTP `401` 后的 refresh/retry 闭环。

**Architecture:** 按 `lib/auth -> lib/api -> features/auth -> route/page` 分层推进。token 读写集中在 `lib/auth`，HTTP `401` 重放能力集中在 `lib/api`，登录接口适配放在 `features/auth`，`root-app.tsx` 只做路由装配和保护，不在页面中散落底层请求逻辑。

**Tech Stack:** React 19、TypeScript、TanStack Router、React Hook Form、Zod、Vitest、Testing Library、i18next、pnpm workspace。

---

## 文件边界

- Modify: `apps/web/src/lib/auth/token-store.ts`
- Create: `apps/web/src/lib/auth/token-store.test.ts`
- Create: `apps/web/src/lib/auth/auth-session.ts`
- Create: `apps/web/src/lib/auth/auth-session.test.ts`
- Modify: `apps/web/src/lib/api/http-client.ts`
- Modify: `apps/web/src/lib/api/http-client.test.ts`
- Modify: `apps/web/src/lib/api/app-client.ts`
- Modify: `apps/web/src/lib/api/app-client.test.ts`
- Modify: `apps/web/src/lib/api/wms-client.ts`
- Modify: `apps/web/src/lib/api/wms-client.test.ts`
- Create: `apps/web/src/features/auth/auth-contract.ts`
- Create: `apps/web/src/features/auth/auth-service.ts`
- Create: `apps/web/src/features/auth/auth-service.test.ts`
- Create: `apps/web/src/features/auth/login-page.tsx`
- Create: `apps/web/src/features/auth/login-page.test.tsx`
- Modify: `apps/web/src/root-app.tsx`
- Modify: `apps/web/src/app.test.tsx`
- Create: `apps/web/src/i18n/resources/zh-CN/auth.ts`
- Create: `apps/web/src/i18n/resources/en-US/auth.ts`
- Modify: `apps/web/src/i18n/config.ts`

## Task 1: Token Store

**Files:**

- Modify: `apps/web/src/lib/auth/token-store.ts`
- Create: `apps/web/src/lib/auth/token-store.test.ts`

- [ ] **Step 1: Write the failing token-store tests**

Create `apps/web/src/lib/auth/token-store.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import {
  clearAuthToken,
  getAccessToken,
  getAuthToken,
  getRefreshToken,
  hasAuthToken,
  setAccessTokenForTests,
  setAuthToken,
} from "@/lib/auth/token-store";

afterEach(() => {
  localStorage.clear();
});

describe("token-store", () => {
  it("persists the complete auth token in localStorage", () => {
    setAuthToken({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });

    expect(getAuthToken()).toEqual({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });
    expect(getAccessToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");
    expect(hasAuthToken()).toBe(true);
  });

  it("clears every auth token field", () => {
    setAuthToken({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });

    clearAuthToken();

    expect(getAuthToken()).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(hasAuthToken()).toBe(false);
  });

  it("keeps the existing test helper behavior for bearer injection tests", () => {
    setAccessTokenForTests("access-only");

    expect(getAccessToken()).toBe("access-only");
    expect(hasAuthToken()).toBe(true);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/lib/auth/token-store.test.ts
```

Expected: FAIL because `getAuthToken`, `setAuthToken`, `getRefreshToken`, `hasAuthToken`, and `clearAuthToken` are not implemented.

- [ ] **Step 3: Implement minimal token-store support**

Update `apps/web/src/lib/auth/token-store.ts`:

```ts
const accessTokenStorageKey = "accessToken";
const refreshTokenStorageKey = "refreshToken";
const tokenTypeStorageKey = "tokenType";
const expiresInStorageKey = "expiresIn";

export type AuthToken = {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export function getAccessToken() {
  return localStorage.getItem(accessTokenStorageKey);
}

export function getRefreshToken() {
  return localStorage.getItem(refreshTokenStorageKey);
}

export function getAuthToken(): AuthToken | null {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  const tokenType = localStorage.getItem(tokenTypeStorageKey);
  const expiresInValue = localStorage.getItem(expiresInStorageKey);
  const expiresIn = expiresInValue ? Number(expiresInValue) : NaN;

  if (!accessToken || !refreshToken || !tokenType || !Number.isFinite(expiresIn)) {
    return null;
  }

  return {
    tokenType,
    accessToken,
    refreshToken,
    expiresIn,
  };
}

export function hasAuthToken() {
  return Boolean(getAccessToken());
}

export function setAuthToken(token: AuthToken) {
  localStorage.setItem(tokenTypeStorageKey, token.tokenType);
  localStorage.setItem(accessTokenStorageKey, token.accessToken);
  localStorage.setItem(refreshTokenStorageKey, token.refreshToken);
  localStorage.setItem(expiresInStorageKey, String(token.expiresIn));
}

export function clearAuthToken() {
  localStorage.removeItem(tokenTypeStorageKey);
  localStorage.removeItem(accessTokenStorageKey);
  localStorage.removeItem(refreshTokenStorageKey);
  localStorage.removeItem(expiresInStorageKey);
}

export function setAccessTokenForTests(token: string) {
  localStorage.setItem(accessTokenStorageKey, token);
}

export function clearAccessTokenForTests() {
  localStorage.removeItem(accessTokenStorageKey);
}
```

- [ ] **Step 4: Verify token-store tests pass**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/lib/auth/token-store.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit token-store slice**

Run:

```bash
git add apps/web/src/lib/auth/token-store.ts apps/web/src/lib/auth/token-store.test.ts
git commit -m "feat: expand auth token store"
```

## Task 2: Auth Contract And Service

**Files:**

- Create: `apps/web/src/features/auth/auth-contract.ts`
- Create: `apps/web/src/features/auth/auth-service.ts`
- Create: `apps/web/src/features/auth/auth-service.test.ts`

- [ ] **Step 1: Write failing auth-service tests**

Create `apps/web/src/features/auth/auth-service.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { login, refreshAuthToken } from "@/features/auth/auth-service";
import {
  resetAppTransportForTests,
  setAppTransportForTests,
} from "@/lib/api/app-client";
import type { DataResult, Transport } from "@/lib/api/http-client";

function tokenResult(accessToken: string, refreshToken: string): DataResult<{
  TokenType: string;
  AccessToken: string;
  ExpiresIn: number;
  RefreshToken: string;
}> {
  return {
    Success: true,
    Code: null,
    Message: "ok",
    Record: 1,
    SkipCount: 0,
    TotalCount: 1,
    Attach: {
      TokenType: "Bearer",
      AccessToken: accessToken,
      ExpiresIn: 604800,
      RefreshToken: refreshToken,
    },
  };
}

afterEach(() => {
  resetAppTransportForTests();
});

describe("auth-service", () => {
  it("posts login credentials with the exact backend field names", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: tokenResult("access-1", "refresh-1"),
    }));
    setAppTransportForTests(transport);

    await expect(
      login({
        userCode: "DemoAdmin",
        password: "Icpt1357!!",
      }),
    ).resolves.toEqual({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/account/login",
      body: {
        UserCode: "DemoAdmin",
        Password: "Icpt1357!!",
      },
      signal: undefined,
    });
  });

  it("posts only RefreshToken when refreshing the session", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: tokenResult("access-2", "refresh-2"),
    }));
    setAppTransportForTests(transport);

    await expect(refreshAuthToken("refresh-1")).resolves.toEqual({
      tokenType: "Bearer",
      accessToken: "access-2",
      refreshToken: "refresh-2",
      expiresIn: 604800,
    });

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/account/refresh",
      body: {
        RefreshToken: "refresh-1",
      },
      signal: undefined,
    });
  });
});
```

- [ ] **Step 2: Run the failing auth-service tests**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/features/auth/auth-service.test.ts
```

Expected: FAIL because the auth contract and service files do not exist.

- [ ] **Step 3: Implement auth contract and service**

Create `apps/web/src/features/auth/auth-contract.ts`:

```ts
import type { AuthToken } from "@/lib/auth/token-store";

export type LoginCredentials = {
  userCode: string;
  password: string;
};

export type AuthTokenResponse = {
  TokenType: string;
  AccessToken: string;
  ExpiresIn: number;
  RefreshToken: string;
};

export function mapAuthTokenResponse(response: AuthTokenResponse): AuthToken {
  return {
    tokenType: response.TokenType,
    accessToken: response.AccessToken,
    expiresIn: response.ExpiresIn,
    refreshToken: response.RefreshToken,
  };
}
```

Create `apps/web/src/features/auth/auth-service.ts`:

```ts
import {
  mapAuthTokenResponse,
  type AuthTokenResponse,
  type LoginCredentials,
} from "@/features/auth/auth-contract";
import { getAppClient } from "@/lib/api/app-client";
import type { AuthToken } from "@/lib/auth/token-store";

export async function login(
  credentials: LoginCredentials,
  options: { signal?: AbortSignal } = {},
): Promise<AuthToken> {
  const result = await getAppClient().postDataResult<AuthTokenResponse>(
    "/account/login",
    {
      UserCode: credentials.userCode,
      Password: credentials.password,
    },
    options,
  );

  return mapAuthTokenResponse(result.Attach);
}

export async function refreshAuthToken(
  refreshToken: string,
  options: { signal?: AbortSignal } = {},
): Promise<AuthToken> {
  const result = await getAppClient().postDataResult<AuthTokenResponse>(
    "/account/refresh",
    {
      RefreshToken: refreshToken,
    },
    options,
  );

  return mapAuthTokenResponse(result.Attach);
}
```

- [ ] **Step 4: Verify auth-service tests pass**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/features/auth/auth-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit auth-service slice**

Run:

```bash
git add apps/web/src/features/auth/auth-contract.ts apps/web/src/features/auth/auth-service.ts apps/web/src/features/auth/auth-service.test.ts
git commit -m "feat: add auth service"
```

## Task 3: HTTP 401 Refresh And Retry

**Files:**

- Modify: `apps/web/src/lib/api/http-client.ts`
- Modify: `apps/web/src/lib/api/http-client.test.ts`
- Create: `apps/web/src/lib/auth/auth-session.ts`
- Create: `apps/web/src/lib/auth/auth-session.test.ts`
- Modify: `apps/web/src/lib/api/app-client.ts`
- Modify: `apps/web/src/lib/api/app-client.test.ts`
- Modify: `apps/web/src/lib/api/wms-client.ts`
- Modify: `apps/web/src/lib/api/wms-client.test.ts`

- [ ] **Step 1: Write failing retry tests in `http-client.test.ts`**

Append these tests to `apps/web/src/lib/api/http-client.test.ts`:

```ts
it("calls the unauthorized handler and retries the original request once", async () => {
  const transport = vi
    .fn<Transport>()
    .mockResolvedValueOnce({
      status: 401,
      data: { message: "expired" },
    })
    .mockResolvedValueOnce({
      status: 200,
      data: { ok: true },
    });
  const handleUnauthorized = vi.fn(async () => true);
  const client = createHttpClient({
    transport,
    handleUnauthorized,
  });

  await expect(client.get("/dashboard/stats")).resolves.toEqual({ ok: true });

  expect(handleUnauthorized).toHaveBeenCalledTimes(1);
  expect(transport).toHaveBeenCalledTimes(2);
});

it("does not retry login or refresh requests after 401", async () => {
  const transport = vi.fn<Transport>(async () => ({
    status: 401,
    data: { message: "invalid credentials" },
  }));
  const handleUnauthorized = vi.fn(async () => true);
  const client = createHttpClient({
    transport,
    handleUnauthorized,
  });

  await expect(client.post("/account/login", {})).rejects.toMatchObject({
    status: 401,
  });
  await expect(client.post("/account/refresh", {})).rejects.toMatchObject({
    status: 401,
  });

  expect(handleUnauthorized).not.toHaveBeenCalled();
  expect(transport).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run the failing retry tests**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/lib/api/http-client.test.ts
```

Expected: FAIL because `createHttpClient` does not accept `handleUnauthorized`.

- [ ] **Step 3: Implement retry support in `http-client.ts`**

Update `HttpClientOptions` and `request` in `apps/web/src/lib/api/http-client.ts`:

```ts
type HttpClientOptions = {
  transport: Transport;
  handleUnauthorized?: () => Promise<boolean>;
};

function shouldHandleUnauthorized(path: string) {
  return path !== "/account/login" && path !== "/account/refresh";
}
```

Change `createHttpClient` to destructure `handleUnauthorized`, and change the request flow:

```ts
export function createHttpClient({ transport, handleUnauthorized }: HttpClientOptions) {
  async function request<T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    options: HttpRequestOptions = {},
    hasRetriedUnauthorized = false,
  ) {
    try {
      const response = await transport({
        method,
        path,
        body,
        signal: options.signal,
      });

      if (
        response.status === 401 &&
        handleUnauthorized &&
        shouldHandleUnauthorized(path) &&
        !hasRetriedUnauthorized
      ) {
        const canRetry = await handleUnauthorized();

        if (canRetry) {
          return await request<T>(method, path, body, options, true);
        }
      }

      if (response.status >= 400) {
        throw new HttpClientError({
          message: getErrorMessage(response.data),
          code: "HTTP_ERROR",
          status: response.status,
        });
      }

      return response.data as T;
    } catch (error) {
      throw normalizeHttpClientError(error);
    }
  }
```

- [ ] **Step 4: Verify retry tests pass**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/lib/api/http-client.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write failing auth-session tests**

Create `apps/web/src/lib/auth/auth-session.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAppTransportForTests, setAppTransportForTests } from "@/lib/api/app-client";
import type { DataResult, Transport } from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken, getRefreshToken, setAuthToken } from "@/lib/auth/token-store";

function tokenResult(accessToken: string, refreshToken: string): DataResult<{
  TokenType: string;
  AccessToken: string;
  ExpiresIn: number;
  RefreshToken: string;
}> {
  return {
    Success: true,
    Code: null,
    Message: "ok",
    Record: 1,
    SkipCount: 0,
    TotalCount: 1,
    Attach: {
      TokenType: "Bearer",
      AccessToken: accessToken,
      ExpiresIn: 604800,
      RefreshToken: refreshToken,
    },
  };
}

afterEach(() => {
  localStorage.clear();
  resetAppTransportForTests();
});

describe("handleUnauthorizedSession", () => {
  it("refreshes the stored token and returns true when refresh succeeds", async () => {
    setAuthToken({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: tokenResult("access-2", "refresh-2"),
    }));
    setAppTransportForTests(transport);

    await expect(handleUnauthorizedSession()).resolves.toBe(true);

    expect(getAccessToken()).toBe("access-2");
    expect(getRefreshToken()).toBe("refresh-2");
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("shares one refresh request across concurrent 401 handlers", async () => {
    setAuthToken({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: tokenResult("access-2", "refresh-2"),
    }));
    setAppTransportForTests(transport);

    await expect(
      Promise.all([
        handleUnauthorizedSession(),
        handleUnauthorizedSession(),
        handleUnauthorizedSession(),
      ]),
    ).resolves.toEqual([true, true, true]);

    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("clears auth state and returns false when refresh fails", async () => {
    setAuthToken({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });
    setAppTransportForTests(async () => ({
      status: 401,
      data: { message: "refresh expired" },
    }));

    await expect(handleUnauthorizedSession()).resolves.toBe(false);

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
```

- [ ] **Step 6: Run the failing auth-session tests**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/lib/auth/auth-session.test.ts
```

Expected: FAIL because `auth-session.ts` does not exist.

- [ ] **Step 7: Implement auth-session**

Create `apps/web/src/lib/auth/auth-session.ts`:

```ts
import { refreshAuthToken } from "@/features/auth/auth-service";
import {
  clearAuthToken,
  getRefreshToken,
  setAuthToken,
} from "@/lib/auth/token-store";

let refreshPromise: Promise<boolean> | null = null;

async function refreshStoredToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearAuthToken();
    return false;
  }

  try {
    const nextToken = await refreshAuthToken(refreshToken);
    setAuthToken(nextToken);
    return true;
  } catch {
    clearAuthToken();
    return false;
  }
}

export async function handleUnauthorizedSession() {
  refreshPromise ??= refreshStoredToken().finally(() => {
    refreshPromise = null;
  });

  return await refreshPromise;
}
```

- [ ] **Step 8: Wire app and WMS clients to the unauthorized handler**

In `apps/web/src/lib/api/app-client.ts`, import `handleUnauthorizedSession` and pass it to `createHttpClient`:

```ts
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
```

```ts
export function getAppClient() {
  return createHttpClient({
    transport: appTransport,
    handleUnauthorized: handleUnauthorizedSession,
  });
}
```

In `apps/web/src/lib/api/wms-client.ts`, do the same:

```ts
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
```

```ts
export function getWmsClient() {
  wmsTransport ??= createDefaultWmsTransport();

  return createHttpClient({
    transport: wmsTransport,
    handleUnauthorized: handleUnauthorizedSession,
  });
}
```

- [ ] **Step 9: Verify retry integration tests**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/lib/api/http-client.test.ts apps/web/src/lib/auth/auth-session.test.ts apps/web/src/lib/api/app-client.test.ts apps/web/src/lib/api/wms-client.test.ts
```

Expected: PASS. If `app-client.test.ts` or `wms-client.test.ts` sees an extra refresh call, update only the test fixture to return `200` for normal requests; do not disable retry behavior.

- [ ] **Step 10: Commit refresh/retry slice**

Run:

```bash
git add apps/web/src/lib/api/http-client.ts apps/web/src/lib/api/http-client.test.ts apps/web/src/lib/auth/auth-session.ts apps/web/src/lib/auth/auth-session.test.ts apps/web/src/lib/api/app-client.ts apps/web/src/lib/api/app-client.test.ts apps/web/src/lib/api/wms-client.ts apps/web/src/lib/api/wms-client.test.ts
git commit -m "feat: refresh auth token on unauthorized responses"
```

## Task 4: Route Protection

**Files:**

- Modify: `apps/web/src/root-app.tsx`
- Modify: `apps/web/src/app.test.tsx`

- [ ] **Step 1: Add failing route protection tests**

Append or update tests in `apps/web/src/app.test.tsx`:

```tsx
it("redirects unauthenticated shell routes to login with the original path", async () => {
  render(<App initialEntries={["/packaging/packaging-type"]} />);

  expect(await screen.findByRole("heading", { name: "登录" })).toBeInTheDocument();
  expect(window.location.pathname).toBe("/");
});

it("keeps standalone routes public", async () => {
  render(<App initialEntries={["/examples/standalone"]} />);

  expect(await screen.findByTestId("standalone-page")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "登录" })).not.toBeInTheDocument();
});

it("renders shell routes when an access token exists", async () => {
  localStorage.setItem("accessToken", "access-1");

  render(<App initialEntries={["/dashboard"]} />);

  expect(await screen.findByRole("heading", { name: "仪表盘" })).toBeInTheDocument();
  expect(screen.getByTestId("admin-shell")).toBeInTheDocument();
});
```

Note: with memory history, assert rendered login UI rather than browser URL. Add a later login-page test for redirect search handling.

- [ ] **Step 2: Run route tests and verify failure**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/app.test.tsx
```

Expected: FAIL because `/login` route and auth guards do not exist.

- [ ] **Step 3: Add auth route helpers inside `root-app.tsx`**

In `apps/web/src/root-app.tsx`, import:

```ts
import { LoginPage } from "@/features/auth/login-page";
import { hasAuthToken } from "@/lib/auth/token-store";
```

Add helpers near route definitions:

```ts
function getSafeRedirect(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }

  return value;
}

function requireAuth({ location }: { location: { href: string } }) {
  if (!hasAuthToken()) {
    throw redirect({
      to: "/login",
      search: {
        redirect: location.href,
      },
    });
  }
}
```

- [ ] **Step 4: Add `/login` and protect shell routes**

Add the route:

```tsx
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: getSafeRedirect(search.redirect),
  }),
  beforeLoad: ({ search }) => {
    if (hasAuthToken()) {
      throw redirect({
        to: search.redirect ?? "/dashboard",
      });
    }
  },
  component: LoginPage,
});
```

Add `beforeLoad: requireAuth` to `dashboardRoute`, `embeddedExampleRoute`, and `packagingRoute`. Keep `standaloneExampleRoute` public.

Update `routeTree` to include `loginRoute`.

- [ ] **Step 5: Verify route protection tests pass**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/app.test.tsx
```

Expected: PASS after `LoginPage` exists. If this task is executed before Task 5, create `apps/web/src/features/auth/login-page.tsx` with the focused form from Task 5 Step 4 in the same slice before re-running the test.

- [ ] **Step 6: Commit route protection slice**

Run:

```bash
git add apps/web/src/root-app.tsx apps/web/src/app.test.tsx
git commit -m "feat: protect admin routes"
```

## Task 5: Login Page And I18n

**Files:**

- Create: `apps/web/src/features/auth/login-page.tsx`
- Create: `apps/web/src/features/auth/login-page.test.tsx`
- Create: `apps/web/src/i18n/resources/zh-CN/auth.ts`
- Create: `apps/web/src/i18n/resources/en-US/auth.ts`
- Modify: `apps/web/src/i18n/config.ts`
- Modify: `apps/web/src/app.test.tsx`

- [ ] **Step 1: Add i18n resources**

Create `apps/web/src/i18n/resources/zh-CN/auth.ts`:

```ts
const zhCNAuth = {
  login: {
    title: "登录",
    description: "使用你的账号进入后台工作台。",
    userCode: "用户编码",
    userCodePlaceholder: "请输入用户编码",
    password: "密码",
    passwordPlaceholder: "请输入密码",
    submit: "登录",
    submitting: "登录中",
    validation: {
      userCodeRequired: "请输入用户编码。",
      passwordRequired: "请输入密码。",
    },
    feedback: {
      failed: "登录失败，请检查账号或密码。",
    },
  },
} as const;

export default zhCNAuth;
```

Create `apps/web/src/i18n/resources/en-US/auth.ts`:

```ts
const enUSAuth = {
  login: {
    title: "Sign In",
    description: "Use your account to enter the admin workspace.",
    userCode: "User Code",
    userCodePlaceholder: "Enter user code",
    password: "Password",
    passwordPlaceholder: "Enter password",
    submit: "Sign In",
    submitting: "Signing In",
    validation: {
      userCodeRequired: "Enter user code.",
      passwordRequired: "Enter password.",
    },
    feedback: {
      failed: "Unable to sign in. Check the account or password.",
    },
  },
} as const;

export default enUSAuth;
```

Update `apps/web/src/i18n/config.ts` imports, `resources`, and `ns` to include `auth`.

- [ ] **Step 2: Write failing login-page tests**

Create `apps/web/src/features/auth/login-page.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/config";
import { App } from "@/root-app";
import {
  resetAppTransportForTests,
  setAppTransportForTests,
} from "@/lib/api/app-client";
import type { DataResult, Transport } from "@/lib/api/http-client";

function tokenResult(): DataResult<{
  TokenType: string;
  AccessToken: string;
  ExpiresIn: number;
  RefreshToken: string;
}> {
  return {
    Success: true,
    Code: null,
    Message: "ok",
    Record: 1,
    SkipCount: 0,
    TotalCount: 1,
    Attach: {
      TokenType: "Bearer",
      AccessToken: "access-1",
      ExpiresIn: 604800,
      RefreshToken: "refresh-1",
    },
  };
}

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage("zh-CN");
});

afterEach(() => {
  resetAppTransportForTests();
});

describe("LoginPage", () => {
  it("submits UserCode and Password then returns to the redirect target", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: tokenResult(),
    }));
    setAppTransportForTests(transport);

    render(<App initialEntries={["/login?redirect=/packaging/packaging-type"]} />);

    fireEvent.change(await screen.findByLabelText("用户编码"), {
      target: { value: "DemoAdmin" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "Icpt1357!!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "POST",
          path: "/account/login",
          body: {
            UserCode: "DemoAdmin",
            Password: "Icpt1357!!",
          },
        }),
      );
    });
    expect(await screen.findByRole("heading", { name: "包装类型维护" })).toBeInTheDocument();
    expect(localStorage.getItem("accessToken")).toBe("access-1");
    expect(localStorage.getItem("refreshToken")).toBe("refresh-1");
  });

  it("falls back to dashboard when redirect is missing", async () => {
    setAppTransportForTests(async () => ({
      status: 200,
      data: tokenResult(),
    }));

    render(<App initialEntries={["/login"]} />);

    fireEvent.change(await screen.findByLabelText("用户编码"), {
      target: { value: "DemoAdmin" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "Icpt1357!!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("heading", { name: "仪表盘" })).toBeInTheDocument();
  });

  it("shows validation errors without submitting empty credentials", async () => {
    const transport = vi.fn<Transport>();
    setAppTransportForTests(transport);

    render(<App initialEntries={["/login"]} />);

    fireEvent.click(await screen.findByRole("button", { name: "登录" }));

    expect(await screen.findByText("请输入用户编码。")).toBeInTheDocument();
    expect(screen.getByText("请输入密码。")).toBeInTheDocument();
    expect(transport).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run login-page tests and verify failure**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/features/auth/login-page.test.tsx
```

Expected: FAIL because `LoginPage` is not implemented.

- [ ] **Step 4: Implement focused login page**

Create `apps/web/src/features/auth/login-page.tsx`:

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { LogInIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as z from "zod";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login } from "@/features/auth/auth-service";
import { setAuthToken } from "@/lib/auth/token-store";

const loginFormSchema = z.object({
  userCode: z.string().min(1, "login.validation.userCodeRequired"),
  password: z.string().min(1, "login.validation.passwordRequired"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginPage() {
  const { t } = useTranslation(["auth", "common"]);
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      userCode: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const token = await login(values);
      setAuthToken(token);

      await navigate({
        to: search.redirect ?? "/dashboard",
        replace: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("login.feedback.failed", { ns: "auth" });
      toast.error(message || t("login.feedback.failed", { ns: "auth" }));
    }
  }

  return (
    <main className="flex min-h-svh flex-col bg-muted/30">
      <div className="flex justify-end p-4">
        <LanguageToggle />
      </div>
      <section className="flex flex-1 items-center justify-center px-6 pb-16">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardDescription>{t("brand.standardScaffold", { ns: "common" })}</CardDescription>
            <CardTitle className="text-2xl">{t("login.title", { ns: "auth" })}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("login.description", { ns: "auth" })}
            </p>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Controller
                  name="userCode"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="login-user-code">
                        {t("login.userCode", { ns: "auth" })}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="login-user-code"
                        aria-invalid={fieldState.invalid}
                        autoComplete="username"
                        placeholder={t("login.userCodePlaceholder", { ns: "auth" })}
                      />
                      {fieldState.invalid && (
                        <FieldError>
                          {t(fieldState.error?.message ?? "login.validation.userCodeRequired", {
                            ns: "auth",
                          })}
                        </FieldError>
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="login-password">
                        {t("login.password", { ns: "auth" })}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="login-password"
                        aria-invalid={fieldState.invalid}
                        autoComplete="current-password"
                        placeholder={t("login.passwordPlaceholder", { ns: "auth" })}
                        type="password"
                      />
                      {fieldState.invalid && (
                        <FieldError>
                          {t(fieldState.error?.message ?? "login.validation.passwordRequired", {
                            ns: "auth",
                          })}
                        </FieldError>
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <LogInIcon data-icon="inline-start" />
                {form.formState.isSubmitting
                  ? t("login.submitting", { ns: "auth" })
                  : t("login.submit", { ns: "auth" })}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Verify login-page and app route tests pass**

Run:

```bash
pnpm --filter @repo/web test apps/web/src/features/auth/login-page.test.tsx apps/web/src/app.test.tsx
```

Expected: PASS. If existing app tests now fail because they assume no auth token, update their `beforeEach` to set `localStorage.setItem("accessToken", "access-1")` only for tests that render protected shell routes directly.

- [ ] **Step 6: Commit login-page slice**

Run:

```bash
git add apps/web/src/features/auth/login-page.tsx apps/web/src/features/auth/login-page.test.tsx apps/web/src/i18n/resources/zh-CN/auth.ts apps/web/src/i18n/resources/en-US/auth.ts apps/web/src/i18n/config.ts apps/web/src/app.test.tsx
git commit -m "feat: add login page"
```

## Task 6: Final Verification And Browser Check

**Files:**

- Verify all changed `apps/web` files.

- [ ] **Step 1: Run full web unit tests**

Run:

```bash
pnpm --filter @repo/web test
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
pnpm --filter @repo/web typecheck
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm --filter @repo/web lint
```

Expected: PASS.

- [ ] **Step 4: Run a local browser smoke check**

Run the dev server:

```bash
pnpm --filter @repo/web dev
```

Open the served URL and verify:

- `/dashboard` redirects to `/login` when localStorage has no `accessToken`.
- `/examples/standalone` renders without login.
- `/login` renders the focused form, language toggle, and no admin shell.
- Submitting valid mocked credentials stores `accessToken` and reaches the expected redirect when tests or mocks are configured.

- [ ] **Step 5: Commit final verification-only adjustments if needed**

Only commit if Step 1-4 required small fixes. Stage the exact files changed by those fixes, then commit:

```bash
git add apps/web/src
git commit -m "fix: stabilize login auth flow"
```

## Self-Review Checklist

- Spec coverage: Tasks cover token storage, login contract, refresh contract, 401 retry, protected routes, login page, i18n, and verification.
- Field consistency: Login body uses `UserCode` and `Password`.
- Retry safety: `/account/login` and `/account/refresh` are excluded from automatic retry.
- Redirect safety: `redirect` accepts only same-origin path strings beginning with one `/`.
- Scope control: No register, forgot password, role permission, JWT pre-refresh, Cookie auth, or `localForage`.
