// @vitest-environment node

import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import config from "./vite.config";

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

describe("vite dev proxy", () => {
  it("proxies MES API requests through the dev server", () => {
    const resolvedConfig = resolveConfig();
    const proxy = resolvedConfig.server?.proxy;

    expect(proxy?.["/api/mes"]).toMatchObject({
      target: "http://192.168.0.135:8282",
      changeOrigin: true,
    });
    expect(
      proxy?.["/api/mes"]?.rewrite?.(
        "/api/mes/PackagingLevelApi/GetPackagingLevelAutoQueryDatas",
      ),
    ).toBe("/PackagingLevelApi/GetPackagingLevelAutoQueryDatas");
  });

  it("registers debug IP rewrite proxy configuration middleware", () => {
    const resolvedConfig = resolveConfig();

    expect(
      resolvedConfig.plugins?.some(
        (plugin) =>
          plugin !== null &&
          plugin !== undefined &&
          typeof plugin === "object" &&
          "name" in plugin &&
          plugin.name === "debug-ip-rewrite-proxy",
      ),
    ).toBe(true);
  });

  it("keeps the original API proxy target when debug rewrite is disabled", () => {
    const resolvedConfig = resolveConfig();
    const mesProxy = resolvedConfig.server?.proxy?.["/api/mes"];
    const router = mesProxy?.router;

    expect(typeof router).toBe("function");
    expect(
      router?.({ url: "/api/mes/Health" } as IncomingMessage),
    ).toBe("http://192.168.0.135:8282");
  });
});
