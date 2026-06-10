// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import config from "./vite.config";

const DEV_PROXY_ENV_KEYS = [
  "DEV_API_PROXY_ENABLED",
  "DEV_API_PROXY_TARGET",
  "DEV_WMS_API_PROXY_TARGET",
  "DEV_MES_API_PROXY_TARGET",
  "DEV_PRINT_API_PROXY_TARGET",
] as const;

function resolveConfig() {
  return typeof config === "function"
    ? config({
        command: "serve",
        mode: "development",
        isPreview: false,
        isSsrBuild: false,
      })
    : config;
}

// vite.config.ts reads via `loadEnv(...)` then merges with `process.env`,
// with `process.env` winning. `.env.local` is loaded by `loadEnv` and may
// carry a `DEV_API_PROXY_ENABLED=false` from the developer's local
// overrides, which would leak into every test that doesn't set the var
// itself. Reset before each test and explicitly default to "true" so the
// "default-enabled" cases are deterministic. Individual tests that need
// the disabled state (e.g. "skips the proxy block") can still override.
beforeEach(() => {
  for (const key of DEV_PROXY_ENV_KEYS) {
    delete process.env[key];
  }
  process.env.DEV_API_PROXY_ENABLED = "true";
});

describe("vite dev proxy", () => {
  it("registers the four API proxies with the default targets when enabled", () => {
    const resolvedConfig = resolveConfig();
    const proxy = resolvedConfig.server?.proxy;

    expect(proxy?.["/api/app"]).toMatchObject({
      target: "http://192.168.0.135:8288",
      changeOrigin: true,
    });
    expect(proxy?.["/api/wms"]).toMatchObject({
      target: "http://192.168.0.135:8283",
      changeOrigin: true,
    });
    expect(proxy?.["/api/mes"]).toMatchObject({
      target: "http://192.168.0.135:8282",
      changeOrigin: true,
    });
    expect(proxy?.["/api/print"]).toMatchObject({
      target: "http://192.168.0.135:3002",
      changeOrigin: true,
    });
  });

  it("removes each service prefix before forwarding the request", () => {
    const resolvedConfig = resolveConfig();
    const proxy = resolvedConfig.server?.proxy;
    const cases = [
      ["/api/app", "/api/app/users?page=1", "/users?page=1"],
      ["/api/wms", "/api/wms/inventory", "/inventory"],
      ["/api/mes", "/api/mes/packaging/types", "/packaging/types"],
      ["/api/print", "/api/print/templates", "/templates"],
    ] as const;

    for (const [proxyPrefix, requestPath, expectedPath] of cases) {
      const proxyOptions = proxy?.[proxyPrefix];

      expect(proxyOptions).toBeTypeOf("object");
      if (!proxyOptions || typeof proxyOptions === "string") {
        throw new Error(`Missing proxy options for ${proxyPrefix}`);
      }

      expect(proxyOptions.rewrite?.(requestPath)).toBe(expectedPath);
    }
  });

  it("skips the proxy block entirely when DEV_API_PROXY_ENABLED is false", () => {
    process.env.DEV_API_PROXY_ENABLED = "false";

    const resolvedConfig = resolveConfig();

    expect(resolvedConfig.server?.proxy).toBeUndefined();
  });

  it("honors DEV_MES_API_PROXY_TARGET to override the MES proxy target", () => {
    process.env.DEV_MES_API_PROXY_TARGET = "http://1.2.3.4:9000";

    const resolvedConfig = resolveConfig();

    expect(resolvedConfig.server?.proxy?.["/api/mes"]).toMatchObject({
      target: "http://1.2.3.4:9000",
      changeOrigin: true,
    });
    // 其他三个 target 仍走默认值，证明覆盖是按 key 粒度的
    expect(resolvedConfig.server?.proxy?.["/api/app"]).toMatchObject({
      target: "http://192.168.0.135:8288",
    });
  });
});
