// @vitest-environment node

import { describe, expect, it } from "vitest";
import config from "./vite.config";

describe("vite dev proxy", () => {
  it("proxies MES API requests through the dev server", () => {
    const resolvedConfig =
      typeof config === "function"
        ? config({
            command: "serve",
            mode: "development",
            isPreview: false,
            isSsrBuild: false,
          })
        : config;
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
});
