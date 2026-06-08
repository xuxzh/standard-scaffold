# Web 调试 IP 替换代理 Implementation Plan

> **面向 Agent 执行者：** 优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans` 按任务执行本计划。步骤使用复选框 `- [ ]` 语法跟踪。

**目标：** 在 `apps/web` 增加开发期调试 IP 替换代理，命中规则后只替换请求 host/IP，保留原协议、端口、路径和 query。

**实现方式：** 第一版基于现有 Vite dev proxy `/api/app`、`/api/wms`、`/api/mes`、`/api/print` 做动态 target 重写，并新增 Web 配置页读写同源调试端点。规则判断和 URL 预览做成浏览器与 Vite 配置共用的纯 TypeScript 模块，避免 UI 预览和真实代理行为分叉。

**技术栈：** React 19、Vite、TypeScript、TanStack Router、i18next、shadcn 本地 UI 组件、Vitest、Testing Library、pnpm workspace。

**变更级别：** `L2` — 涉及开发期请求代理、Web 配置页、路由导航和跨文件测试，但限定在开发/测试调试能力内，不改变业务 API contract/service 分层。

---

## 范围与前置条件

- 设计依据：`docs/specs/2026-06-08/debug-ip-rewrite-proxy-design.md`
- 当前本地真实接口联调推荐使用 `.env.local` 中的同源 base URL：

```env
VITE_API_BASE_URL=/api/app
VITE_WMS_API_BASE_URL=/api/wms
VITE_MES_API_BASE_URL=/api/mes
VITE_PRINT_API_BASE_URL=/api/print
```

- 第一版只保证进入 Vite dev proxy 的 `/api/*` 请求可被动态替换目标 host。
- 生产构建和浏览器直接访问绝对 URL，例如 `http://192.168.0.135:8282/...`，不纳入第一版代理范围。
- 页面入口放在后台壳层内，路径为 `/debug/ip-rewrite-proxy`。

## 非目标

- 不支持端口映射。
- 不新增多条规则、多目标 host 或规则优先级编排。
- 不改写协议、path、query、method、body。
- 不修改业务 feature service。
- 不把调试代理作为生产环境功能暴露。
- 不引入新的表单库或状态管理库。

## 文件清单

- 新建：
  - `apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.ts`
  - `apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.test.ts`
  - `apps/web/vite/debug-ip-rewrite-proxy-plugin.ts`
  - `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.ts`
  - `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.test.ts`
  - `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx`
  - `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx`
  - `apps/web/src/routes/debug.ip-rewrite-proxy.tsx`
- 修改：
  - `apps/web/vite.config.ts`
  - `apps/web/vite.config.test.ts`
  - `apps/web/src/root-app.tsx`
  - `apps/web/src/components/layout/app-sidebar.tsx`
  - `apps/web/src/i18n/resources/zh-CN/common.ts`
  - `apps/web/src/i18n/resources/en-US/common.ts`
  - `apps/web/.env.example`
- 测试：
  - `pnpm --filter @repo/web test -- --run src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.test.ts`
  - `pnpm --filter @repo/web test -- --run vite.config.test.ts`
  - `pnpm --filter @repo/web test -- --run src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.test.ts`
  - `pnpm --filter @repo/web test -- --run src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx`
  - `pnpm --filter @repo/web test -- --run src/app.test.tsx`
  - `pnpm --filter @repo/web typecheck`
  - `pnpm --filter @repo/web lint`

## 实现切片

### 任务 1：新增纯规则模型和 URL 重写函数

**文件：**

- 新建：`apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.ts`
- 新建：`apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.test.ts`

- [ ] **步骤 1：编写失败测试**

新增 `apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import {
  defaultDebugIpRewriteProxyConfig,
  getDebugIpRewriteProxyPreview,
  normalizeDebugIpRewriteProxyConfig,
  parseDebugIpRewriteProxyPorts,
  shouldRewriteDebugIpUrl,
} from "./debug-ip-rewrite-proxy";

describe("debug IP rewrite proxy rules", () => {
  it("keeps the original protocol, port, path, and query when all mode matches", () => {
    const config = normalizeDebugIpRewriteProxyConfig({
      ...defaultDebugIpRewriteProxyConfig,
      enabled: true,
      targetHost: "127.0.0.1",
      mode: "all",
    });

    const preview = getDebugIpRewriteProxyPreview(
      config,
      "http://192.168.1.20:8288/api/users?id=1",
    );

    expect(preview).toEqual({
      ok: true,
      matched: true,
      originalUrl: "http://192.168.1.20:8288/api/users?id=1",
      rewrittenUrl: "http://127.0.0.1:8288/api/users?id=1",
    });
  });

  it("matches only configured ports in ports mode", () => {
    const config = normalizeDebugIpRewriteProxyConfig({
      enabled: true,
      targetHost: "127.0.0.1",
      mode: "ports",
      ports: [8288, 3004],
      pattern: "",
    });

    expect(
      shouldRewriteDebugIpUrl(
        config,
        "http://192.168.1.20:8288/api/users",
      ),
    ).toBe(true);
    expect(
      shouldRewriteDebugIpUrl(
        config,
        "http://192.168.1.20:9000/api/users",
      ),
    ).toBe(false);
  });

  it("matches the full original URL in regex mode", () => {
    const config = normalizeDebugIpRewriteProxyConfig({
      enabled: true,
      targetHost: "127.0.0.1",
      mode: "regex",
      ports: [],
      pattern: "^http://192\\.168\\.1\\.20:8288/api/order/.*",
    });

    expect(
      shouldRewriteDebugIpUrl(
        config,
        "http://192.168.1.20:8288/api/order/1001",
      ),
    ).toBe(true);
    expect(
      shouldRewriteDebugIpUrl(
        config,
        "http://192.168.1.20:8288/api/users/1001",
      ),
    ).toBe(false);
  });

  it("rejects target hosts that contain protocol, port, path, query, or hash", () => {
    expect(() =>
      normalizeDebugIpRewriteProxyConfig({
        enabled: true,
        targetHost: "http://127.0.0.1:8288",
        mode: "all",
        ports: [],
        pattern: "",
      }),
    ).toThrow("替换目标 IP/Host 不允许包含协议、端口、路径、query 或 hash");
  });

  it("rejects invalid ports and invalid regular expressions", () => {
    expect(() => parseDebugIpRewriteProxyPorts("8288,0,70000")).toThrow(
      "端口必须是 1-65535 的整数",
    );
    expect(() =>
      normalizeDebugIpRewriteProxyConfig({
        enabled: true,
        targetHost: "127.0.0.1",
        mode: "regex",
        ports: [],
        pattern: "[",
      }),
    ).toThrow("正则表达式无效");
  });

  it("returns a preview error for malformed original URLs", () => {
    const preview = getDebugIpRewriteProxyPreview(
      {
        ...defaultDebugIpRewriteProxyConfig,
        enabled: true,
      },
      "/api/users",
    );

    expect(preview).toEqual({
      ok: false,
      error: "请输入完整 URL，例如 http://192.168.1.20:8288/api/users",
    });
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

从仓库根目录执行：

```bash
pnpm --filter @repo/web test -- --run src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.test.ts
```

预期：

```text
FAIL src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.test.ts
Cannot find module './debug-ip-rewrite-proxy'
```

- [ ] **步骤 3：实现纯规则模块**

新增 `apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.ts`：

```ts
export const DEBUG_IP_REWRITE_PROXY_CONFIG_PATH =
  "/__debug/ip-rewrite-proxy/config";

export type DebugIpRewriteProxyMode = "all" | "ports" | "regex";

export type DebugIpRewriteProxyConfig = {
  enabled: boolean;
  targetHost: string;
  mode: DebugIpRewriteProxyMode;
  ports: number[];
  pattern: string;
};

export type DebugIpRewriteProxyPreview =
  | {
      ok: true;
      matched: boolean;
      originalUrl: string;
      rewrittenUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

export const defaultDebugIpRewriteProxyConfig: DebugIpRewriteProxyConfig = {
  enabled: false,
  targetHost: "127.0.0.1",
  mode: "ports",
  ports: [],
  pattern: "",
};

function isDebugIpRewriteProxyMode(
  value: unknown,
): value is DebugIpRewriteProxyMode {
  return value === "all" || value === "ports" || value === "regex";
}

function assertValidTargetHost(targetHost: string) {
  if (!targetHost.trim()) {
    throw new Error("替换目标 IP/Host 不能为空");
  }

  if (/[:/?#]/.test(targetHost) || targetHost.includes("://")) {
    throw new Error(
      "替换目标 IP/Host 不允许包含协议、端口、路径、query 或 hash",
    );
  }
}

function assertValidPort(port: number) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("端口必须是 1-65535 的整数");
  }
}

function getUrlPort(url: URL) {
  if (url.port) {
    return Number(url.port);
  }

  if (url.protocol === "http:") {
    return 80;
  }

  if (url.protocol === "https:") {
    return 443;
  }

  return Number.NaN;
}

function rewriteUrlHost(originalUrl: string, targetHost: string) {
  const url = new URL(originalUrl);
  url.hostname = targetHost;
  return url.toString();
}

export function parseDebugIpRewriteProxyPorts(value: string) {
  const ports = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item));

  ports.forEach(assertValidPort);

  return ports;
}

export function formatDebugIpRewriteProxyPorts(ports: number[]) {
  return ports.join(",");
}

export function normalizeDebugIpRewriteProxyConfig(
  input: Partial<DebugIpRewriteProxyConfig>,
): DebugIpRewriteProxyConfig {
  const config = {
    ...defaultDebugIpRewriteProxyConfig,
    ...input,
    targetHost:
      typeof input.targetHost === "string"
        ? input.targetHost.trim()
        : defaultDebugIpRewriteProxyConfig.targetHost,
    mode: isDebugIpRewriteProxyMode(input.mode)
      ? input.mode
      : defaultDebugIpRewriteProxyConfig.mode,
    ports: Array.isArray(input.ports)
      ? input.ports.map((port) => Number(port))
      : defaultDebugIpRewriteProxyConfig.ports,
    pattern:
      typeof input.pattern === "string"
        ? input.pattern
        : defaultDebugIpRewriteProxyConfig.pattern,
  };

  assertValidTargetHost(config.targetHost);
  config.ports.forEach(assertValidPort);

  if (config.mode === "regex") {
    if (!config.pattern.trim()) {
      throw new Error("正则表达式不能为空");
    }

    try {
      new RegExp(config.pattern);
    } catch {
      throw new Error("正则表达式无效");
    }
  }

  return config;
}

export function shouldRewriteDebugIpUrl(
  config: DebugIpRewriteProxyConfig,
  originalUrl: string,
) {
  if (!config.enabled) {
    return false;
  }

  const url = new URL(originalUrl);

  if (config.mode === "all") {
    return true;
  }

  if (config.mode === "ports") {
    return config.ports.includes(getUrlPort(url));
  }

  return new RegExp(config.pattern).test(originalUrl);
}

export function getDebugIpRewriteProxyPreview(
  config: DebugIpRewriteProxyConfig,
  originalUrl: string,
): DebugIpRewriteProxyPreview {
  try {
    const parsedUrl = new URL(originalUrl);
    const normalizedUrl = parsedUrl.toString();
    const matched = shouldRewriteDebugIpUrl(config, normalizedUrl);

    return {
      ok: true,
      matched,
      originalUrl,
      rewrittenUrl: matched
        ? rewriteUrlHost(normalizedUrl, config.targetHost)
        : originalUrl,
    };
  } catch {
    return {
      ok: false,
      error: "请输入完整 URL，例如 http://192.168.1.20:8288/api/users",
    };
  }
}
```

- [ ] **步骤 4：再次运行验证**

执行：

```bash
pnpm --filter @repo/web test -- --run src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.test.ts
```

预期：

```text
PASS src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.test.ts
```

- [ ] **步骤 5：提交切片**

```bash
git status --short
git add apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.ts apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.test.ts
git commit -m "feat(web): add debug ip rewrite rules"
```

### 任务 2：把 Vite dev proxy 接入动态 IP 替换配置

**文件：**

- 新建：`apps/web/vite/debug-ip-rewrite-proxy-plugin.ts`
- 修改：`apps/web/vite.config.ts`
- 修改：`apps/web/vite.config.test.ts`

- [ ] **步骤 1：扩展 Vite 配置测试**

在 `apps/web/vite.config.test.ts` 中保留现有测试，并追加：

```ts
  it("registers debug IP rewrite proxy configuration middleware", () => {
    const resolvedConfig =
      typeof config === "function"
        ? config({
            command: "serve",
            mode: "development",
            isPreview: false,
            isSsrBuild: false,
          })
        : config;

    expect(
      resolvedConfig.plugins?.some(
        (plugin) => plugin?.name === "debug-ip-rewrite-proxy",
      ),
    ).toBe(true);
  });

  it("keeps the original API proxy target when debug rewrite is disabled", () => {
    const resolvedConfig =
      typeof config === "function"
        ? config({
            command: "serve",
            mode: "development",
            isPreview: false,
            isSsrBuild: false,
          })
        : config;
    const mesProxy = resolvedConfig.server?.proxy?.["/api/mes"];

    expect(mesProxy?.router?.({ url: "/api/mes/Health" })).toBe(
      "http://192.168.0.135:8282",
    );
  });
```

- [ ] **步骤 2：运行测试确认失败**

执行：

```bash
pnpm --filter @repo/web test -- --run vite.config.test.ts
```

预期：

```text
FAIL vite.config.test.ts
expected false to be true
```

- [ ] **步骤 3：新增 Vite 调试代理插件**

新增 `apps/web/vite/debug-ip-rewrite-proxy-plugin.ts`：

```ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ProxyOptions } from "vite";
import {
  DEBUG_IP_REWRITE_PROXY_CONFIG_PATH,
  defaultDebugIpRewriteProxyConfig,
  getDebugIpRewriteProxyPreview,
  normalizeDebugIpRewriteProxyConfig,
  type DebugIpRewriteProxyConfig,
} from "../src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy";

type ApiProxyOptions = {
  target: string;
  prefix: string;
};

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

function readJsonBody(request: IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    let rawBody = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      rawBody += chunk;
    });
    request.on("end", () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch {
        reject(new Error("请求体必须是合法 JSON"));
      }
    });
    request.on("error", reject);
  });
}

function createOriginalUrl(target: string, rewrittenPath: string) {
  return new URL(rewrittenPath, `${target.replace(/\/$/, "")}/`).toString();
}

export function createDebugIpRewriteProxyState(
  initialConfig: DebugIpRewriteProxyConfig = defaultDebugIpRewriteProxyConfig,
) {
  let config = initialConfig;

  return {
    getConfig() {
      return config;
    },
    setConfig(nextConfig: DebugIpRewriteProxyConfig) {
      config = nextConfig;
    },
  };
}

export function createDebuggableApiProxy({
  target,
  prefix,
}: ApiProxyOptions): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    router: (request) => {
      const originalRequestPath = request.url ?? "";
      const rewrittenPath = originalRequestPath.replace(
        new RegExp(`^${prefix}`),
        "",
      );
      const originalUrl = createOriginalUrl(target, rewrittenPath);
      const preview = getDebugIpRewriteProxyPreview(
        debugIpRewriteProxyState.getConfig(),
        originalUrl,
      );

      if (!preview.ok || !preview.matched) {
        return target;
      }

      return new URL(preview.rewrittenUrl).origin;
    },
    rewrite: (path) => path.replace(new RegExp(`^${prefix}`), ""),
  };
}

export const debugIpRewriteProxyState = createDebugIpRewriteProxyState();

export function debugIpRewriteProxyPlugin(): Plugin {
  return {
    name: "debug-ip-rewrite-proxy",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== DEBUG_IP_REWRITE_PROXY_CONFIG_PATH) {
          next();
          return;
        }

        if (request.method === "GET") {
          sendJson(response, 200, debugIpRewriteProxyState.getConfig());
          return;
        }

        if (request.method === "PUT") {
          try {
            const body = await readJsonBody(request);
            const nextConfig = normalizeDebugIpRewriteProxyConfig(
              body as Partial<DebugIpRewriteProxyConfig>,
            );
            debugIpRewriteProxyState.setConfig(nextConfig);
            sendJson(response, 200, nextConfig);
          } catch (error) {
            sendJson(response, 400, {
              message:
                error instanceof Error ? error.message : "调试代理配置无效",
            });
          }
          return;
        }

        sendJson(response, 405, {
          message: "Method Not Allowed",
        });
      });
    },
  };
}
```

- [ ] **步骤 4：接入 `vite.config.ts`**

修改 `apps/web/vite.config.ts`：

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import { fileURLToPath, URL } from "node:url";
import {
  createDebuggableApiProxy,
  debugIpRewriteProxyPlugin,
} from "./vite/debug-ip-rewrite-proxy-plugin";
```

替换 `createApiProxy`：

```ts
function createApiProxy(prefix: string, target: string): ProxyOptions {
  return createDebuggableApiProxy({
    prefix,
    target,
  });
}
```

替换 `plugins` 和 `server.proxy`：

```ts
plugins: [react(), tailwindcss(), debugIpRewriteProxyPlugin()],
server: {
  proxy: {
    "/api/app": createApiProxy("/api/app", devProxyTargets.app),
    "/api/wms": createApiProxy("/api/wms", devProxyTargets.wms),
    "/api/mes": createApiProxy("/api/mes", devProxyTargets.mes),
    "/api/print": createApiProxy("/api/print", devProxyTargets.print),
  },
},
```

- [ ] **步骤 5：再次运行验证**

执行：

```bash
pnpm --filter @repo/web test -- --run vite.config.test.ts
```

预期：

```text
PASS vite.config.test.ts
```

- [ ] **步骤 6：提交切片**

```bash
git status --short
git add apps/web/vite/debug-ip-rewrite-proxy-plugin.ts apps/web/vite.config.ts apps/web/vite.config.test.ts
git commit -m "feat(web): wire debug ip rewrite dev proxy"
```

### 任务 3：新增 Web 配置服务

**文件：**

- 新建：`apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.ts`
- 新建：`apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.test.ts`

- [ ] **步骤 1：编写失败测试**

新增 `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.test.ts`：

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultDebugIpRewriteProxyConfig } from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy";
import {
  getDebugIpRewriteProxyConfig,
  saveDebugIpRewriteProxyConfig,
} from "./debug-ip-rewrite-proxy-service";

describe("debug IP rewrite proxy service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the current proxy config", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          ...defaultDebugIpRewriteProxyConfig,
          enabled: true,
          targetHost: "127.0.0.1",
          mode: "all",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getDebugIpRewriteProxyConfig()).resolves.toMatchObject({
      enabled: true,
      targetHost: "127.0.0.1",
      mode: "all",
    });
  });

  it("saves a normalized proxy config", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          enabled: true,
          targetHost: "127.0.0.1",
          mode: "ports",
          ports: [8288],
          pattern: "",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await saveDebugIpRewriteProxyConfig({
      enabled: true,
      targetHost: "127.0.0.1",
      mode: "ports",
      ports: [8288],
      pattern: "",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/__debug/ip-rewrite-proxy/config",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: true,
          targetHost: "127.0.0.1",
          mode: "ports",
          ports: [8288],
          pattern: "",
        }),
      },
    );
  });

  it("throws the server validation message when saving fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        return new Response(
          JSON.stringify({
            message: "端口必须是 1-65535 的整数",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }),
    );

    await expect(
      saveDebugIpRewriteProxyConfig({
        enabled: true,
        targetHost: "127.0.0.1",
        mode: "ports",
        ports: [0],
        pattern: "",
      }),
    ).rejects.toThrow("端口必须是 1-65535 的整数");
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

执行：

```bash
pnpm --filter @repo/web test -- --run src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.test.ts
```

预期：

```text
FAIL src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.test.ts
Cannot find module './debug-ip-rewrite-proxy-service'
```

- [ ] **步骤 3：实现配置服务**

新增 `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.ts`：

```ts
import {
  DEBUG_IP_REWRITE_PROXY_CONFIG_PATH,
  normalizeDebugIpRewriteProxyConfig,
  type DebugIpRewriteProxyConfig,
} from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy";

async function parseJsonResponse(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "调试代理配置请求失败",
    );
  }

  return data;
}

export async function getDebugIpRewriteProxyConfig() {
  const response = await fetch(DEBUG_IP_REWRITE_PROXY_CONFIG_PATH);
  const data = await parseJsonResponse(response);

  return normalizeDebugIpRewriteProxyConfig(
    data as Partial<DebugIpRewriteProxyConfig>,
  );
}

export async function saveDebugIpRewriteProxyConfig(
  config: DebugIpRewriteProxyConfig,
) {
  const normalizedConfig = normalizeDebugIpRewriteProxyConfig(config);
  const response = await fetch(DEBUG_IP_REWRITE_PROXY_CONFIG_PATH, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizedConfig),
  });
  const data = await parseJsonResponse(response);

  return normalizeDebugIpRewriteProxyConfig(
    data as Partial<DebugIpRewriteProxyConfig>,
  );
}
```

- [ ] **步骤 4：再次运行验证**

执行：

```bash
pnpm --filter @repo/web test -- --run src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.test.ts
```

预期：

```text
PASS src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.test.ts
```

- [ ] **步骤 5：提交切片**

```bash
git status --short
git add apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.ts apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.test.ts
git commit -m "feat(web): add debug ip rewrite config service"
```

### 任务 4：新增调试配置页面和页面测试

**文件：**

- 新建：`apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx`
- 新建：`apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx`

- [ ] **步骤 1：编写页面测试**

新增 `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx`：

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n/config";
import { DebugIpRewriteProxyPage } from "./debug-ip-rewrite-proxy-page";

describe("DebugIpRewriteProxyPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("previews IP rewrite without changing the original port", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        return new Response(
          JSON.stringify({
            enabled: true,
            targetHost: "127.0.0.1",
            mode: "ports",
            ports: [8288],
            pattern: "",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }),
    );

    render(<DebugIpRewriteProxyPage />);

    await screen.findByDisplayValue("127.0.0.1");
    await userEvent.type(
      screen.getByLabelText("原始 URL"),
      "http://192.168.1.20:8288/api/users?id=1",
    );

    expect(
      await screen.findByText("http://127.0.0.1:8288/api/users?id=1"),
    ).toBeInTheDocument();
  });

  it("shows only the regex field in regex mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        return new Response(
          JSON.stringify({
            enabled: false,
            targetHost: "127.0.0.1",
            mode: "ports",
            ports: [],
            pattern: "",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }),
    );

    render(<DebugIpRewriteProxyPage />);

    await screen.findByText("端口列表");
    await userEvent.click(screen.getByRole("button", { name: "正则匹配" }));

    expect(screen.getByText("正则表达式")).toBeInTheDocument();
    expect(screen.queryByText("端口列表")).not.toBeInTheDocument();
  });

  it("saves the current config", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      if (init?.method === "PUT") {
        return new Response(String(init.body), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      return new Response(
        JSON.stringify({
          enabled: false,
          targetHost: "127.0.0.1",
          mode: "ports",
          ports: [],
          pattern: "",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DebugIpRewriteProxyPage />);

    await screen.findByDisplayValue("127.0.0.1");
    await userEvent.type(screen.getByLabelText("端口列表"), "8288");
    await userEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/__debug/ip-rewrite-proxy/config",
        expect.objectContaining({
          method: "PUT",
        }),
      );
    });
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

执行：

```bash
pnpm --filter @repo/web test -- --run src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx
```

预期：

```text
FAIL src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx
Cannot find module './debug-ip-rewrite-proxy-page'
```

- [ ] **步骤 3：实现页面组件**

新增 `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx`。实现要求：

- 用 `useState` 保存表单状态，不引入新的全局 store。
- 首次加载调用 `getDebugIpRewriteProxyConfig()`。
- `targetHost` 输入框 label 为 `替换目标 IP/Host`。
- 使用原生 button + `role="switch"` 实现启用开关，样式参考 `packaging-type-form-sheet.tsx`。
- 使用三个按钮作为分段控件：`端口拦截`、`正则匹配`、`全部拦截`。
- 端口模式展示 `端口列表` 输入框，保存前调用 `parseDebugIpRewriteProxyPorts`。
- 正则模式展示 `正则表达式` 输入框。
- 预览区输入 label 为 `原始 URL`，调用 `getDebugIpRewriteProxyPreview` 展示命中结果。
- 保存按钮文案为 `保存配置`，重置按钮文案为 `重置配置`。
- 保存成功使用 `toast.success("调试代理配置已保存")`。
- 保存失败使用 `toast.error(error.message)`。

页面布局可沿用 `EmbeddedExamplePage` 中 `Card`、`Field`、`Input`、`Button` 的组合，不新增本地 UI 基础组件。

- [ ] **步骤 4：再次运行验证**

执行：

```bash
pnpm --filter @repo/web test -- --run src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx
```

预期：

```text
PASS src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx
```

- [ ] **步骤 5：提交切片**

```bash
git status --short
git add apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx
git commit -m "feat(web): add debug ip rewrite settings page"
```

### 任务 5：接入路由、导航和多语言文案

**文件：**

- 新建：`apps/web/src/routes/debug.ip-rewrite-proxy.tsx`
- 修改：`apps/web/src/root-app.tsx`
- 修改：`apps/web/src/components/layout/app-sidebar.tsx`
- 修改：`apps/web/src/i18n/resources/zh-CN/common.ts`
- 修改：`apps/web/src/i18n/resources/en-US/common.ts`
- 修改：`apps/web/src/app.test.tsx`

- [ ] **步骤 1：更新应用级测试**

在 `apps/web/src/app.test.tsx` 中新增一个 authenticated shell 测试，使用既有 token setup 模式，断言调试代理菜单和页面可见：

```tsx
  it("renders the debug IP rewrite proxy route in the admin shell", async () => {
    localStorage.setItem("access_token", "token-1");

    render(<App initialEntries={["/debug/ip-rewrite-proxy"]} />);

    expect(
      await screen.findByRole("heading", { name: "调试 IP 替换代理" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-nav-debug-ip-rewrite-proxy")).toHaveTextContent(
      "IP 替换代理",
    );
  });
```

- [ ] **步骤 2：运行测试确认失败**

执行：

```bash
pnpm --filter @repo/web test -- --run src/app.test.tsx
```

预期：

```text
FAIL src/app.test.tsx
Unable to find role="heading" and name "调试 IP 替换代理"
```

- [ ] **步骤 3：新增路由文件**

新增 `apps/web/src/routes/debug.ip-rewrite-proxy.tsx`：

```tsx
import { DebugIpRewriteProxyPage } from "@/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page";

export function DebugIpRewriteProxyRoute() {
  return <DebugIpRewriteProxyPage />;
}
```

- [ ] **步骤 4：接入 `root-app.tsx`**

在 `apps/web/src/root-app.tsx` 新增 import：

```ts
import { DebugIpRewriteProxyRoute } from "@/routes/debug.ip-rewrite-proxy";
```

新增 route：

```tsx
const debugIpRewriteProxyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/debug/ip-rewrite-proxy",
  beforeLoad: requireAuth,
  component: () => (
    <AdminLayout>
      <DebugIpRewriteProxyRoute />
    </AdminLayout>
  ),
});
```

把 `debugIpRewriteProxyRoute` 加入 `routeTree`。

- [ ] **步骤 5：更新导航和 i18n**

在 `apps/web/src/i18n/resources/zh-CN/common.ts` 的 `navigation` 中新增：

```ts
debugTools: "调试工具",
debugIpRewriteProxy: "IP 替换代理",
```

在 `pages` 中新增：

```ts
debugIpRewriteProxy: {
  title: "调试 IP 替换代理",
  description: "命中规则后只替换请求目标 IP/Host，保留原协议、端口、路径和查询参数。",
},
```

在 `apps/web/src/i18n/resources/en-US/common.ts` 的 `navigation` 中新增：

```ts
debugTools: "Debug Tools",
debugIpRewriteProxy: "IP Rewrite Proxy",
```

在 `pages` 中新增：

```ts
debugIpRewriteProxy: {
  title: "Debug IP Rewrite Proxy",
  description:
    "Rewrite only the request target IP/host while preserving the protocol, port, path, and query.",
},
```

在 `apps/web/src/components/layout/app-sidebar.tsx` 的 `groupedItems` 中新增一组，默认展开状态增加 `debug: true`：

```tsx
{
  key: "debug",
  title: t("navigation.debugTools"),
  icon: WorkflowIcon,
  items: [
    {
      title: t("navigation.debugIpRewriteProxy"),
      to: "/debug/ip-rewrite-proxy",
      icon: Link2,
      testId: "sidebar-nav-debug-ip-rewrite-proxy",
    },
  ],
},
```

- [ ] **步骤 6：再次运行验证**

执行：

```bash
pnpm --filter @repo/web test -- --run src/app.test.tsx
```

预期：

```text
PASS src/app.test.tsx
```

- [ ] **步骤 7：提交切片**

```bash
git status --short
git add apps/web/src/routes/debug.ip-rewrite-proxy.tsx apps/web/src/root-app.tsx apps/web/src/components/layout/app-sidebar.tsx apps/web/src/i18n/resources/zh-CN/common.ts apps/web/src/i18n/resources/en-US/common.ts apps/web/src/app.test.tsx
git commit -m "feat(web): route debug ip rewrite proxy page"
```

### 任务 6：补充环境说明和收口验证

**文件：**

- 修改：`apps/web/.env.example`

- [ ] **步骤 1：更新 `.env.example` 注释**

在 `apps/web/.env.example` 的 API base URL 注释附近补充：

```env
# 调试 IP 替换代理只作用于本地 Vite dev proxy 下的 /api/app、/api/wms、/api/mes、/api/print 请求。
# 如果需要使用调试 IP 替换代理，本地真实接口联调时请保持以下 base URL 为 /api/* 同源前缀。
```

- [ ] **步骤 2：运行完整定向验证**

从仓库根目录执行：

```bash
pnpm --filter @repo/web test -- --run src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.test.ts
pnpm --filter @repo/web test -- --run vite.config.test.ts
pnpm --filter @repo/web test -- --run src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.test.ts
pnpm --filter @repo/web test -- --run src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx
pnpm --filter @repo/web test -- --run src/app.test.tsx
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

预期：

```text
所有命令通过。
```

- [ ] **步骤 3：提交最终文档/配置切片**

```bash
git status --short
git add apps/web/.env.example
git commit -m "docs(web): document debug ip rewrite proxy env usage"
```

## 风险与执行注意事项

- `root-app.tsx` 当前有部分已有缩进不一致，本计划不要求顺手格式化整个文件，只添加本任务需要的 route。
- `debug-ip-rewrite-proxy-plugin.ts` 被 Vite config 引用时必须保持 Node/browser 共享模块无 React、无 DOM、无 `import.meta.env` 依赖。
- 如果 `ProxyOptions.router` 的类型在当前 Vite 版本中不能直接接受测试里的简化 request 对象，测试里用 `as Parameters<NonNullable<typeof mesProxy.router>>[0]` 或局部类型断言收窄，不要放宽生产代码类型。
- 如果真实后端依赖 `Host` header，`changeOrigin: true` 会让代理使用动态 target 的 host；这符合调试目标，但需要在联调说明里提醒。
- 第一版不处理生产 `.env.production` 中的绝对 API base URL；需要调试代理时使用本地 `/api/*` base URL。

## 验收标准

- `/debug/ip-rewrite-proxy` 页面在登录后的后台壳层内可访问。
- 页面能读取、保存和重置调试代理配置。
- 页面预览能显示 `http://192.168.1.20:8288/api/users?id=1` 到 `http://127.0.0.1:8288/api/users?id=1` 的转换。
- Vite dev proxy 在配置关闭时保持原 target。
- Vite dev proxy 在配置开启且端口/正则/全部模式命中时，只改变 target host，不改变原端口和 path rewrite 结果。
- 定向测试、typecheck 和 lint 全部通过。
