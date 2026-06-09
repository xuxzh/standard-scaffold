// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
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

afterEach(() => {
  for (const key of DEV_PROXY_ENV_KEYS) {
    delete process.env[key];
  }
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
