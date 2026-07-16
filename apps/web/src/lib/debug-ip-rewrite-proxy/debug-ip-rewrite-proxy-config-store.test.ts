import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEBUG_IP_REWRITE_PROXY_CONFIG_STORAGE_KEY,
  loadDebugIpRewriteProxyConfigFromStorage,
  resolveDebugIpRewriteProxyBaseUrl,
  saveDebugIpRewriteProxyConfigToStorage,
} from "./debug-ip-rewrite-proxy-config-store";
import {
  defaultDebugIpRewriteProxyConfig,
  type DebugIpRewriteProxyConfig,
} from "./debug-ip-rewrite-proxy";

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllEnvs();
});

function buildConfig(
  overrides: Partial<DebugIpRewriteProxyConfig> = {},
): DebugIpRewriteProxyConfig {
  return {
    ...defaultDebugIpRewriteProxyConfig,
    enabled: true,
    targetHost: "127.0.0.1",
    mode: "ports",
    ports: [8288, 8282],
    pattern: "",
    baseUrls: {
      app: "http://192.168.0.135:8288",
      wms: "http://192.168.0.135:8283",
      mes: "http://192.168.0.135:8282",
      print: "http://192.168.0.135:3002",
    },
    ...overrides,
  };
}

describe("debug IP rewrite proxy localStorage store", () => {
  it("returns env defaults when localStorage is empty", () => {
    const config = loadDebugIpRewriteProxyConfigFromStorage();

    expect(config.enabled).toBe(false);
    expect(config.targetHost).toBe("127.0.0.1");
    expect(config.mode).toBe("ports");
    expect(config.ports).toEqual([]);
    expect(config.pattern).toBe("");
  });

  it("keeps only absolute HTTP(S) environment values as debug defaults", () => {
    vi.stubEnv("VITE_API_BASE_URL", "/api/app");
    vi.stubEnv("VITE_WMS_API_BASE_URL", "http://wms.example.test");
    vi.stubEnv("VITE_MES_API_BASE_URL", "https://mes.example.test");
    vi.stubEnv("VITE_PRINT_API_BASE_URL", "ftp://print.example.test");

    const config = loadDebugIpRewriteProxyConfigFromStorage();

    expect(config.baseUrls).toEqual({
      app: "",
      wms: "http://wms.example.test",
      mes: "https://mes.example.test",
      print: "",
    });
  });

  it("loads a previously stored config and validates it", () => {
    const stored = buildConfig();
    window.localStorage.setItem(
      DEBUG_IP_REWRITE_PROXY_CONFIG_STORAGE_KEY,
      JSON.stringify(stored),
    );

    const loaded = loadDebugIpRewriteProxyConfigFromStorage();

    expect(loaded).toEqual(stored);
  });

  it("falls back to defaults when stored JSON is malformed", () => {
    window.localStorage.setItem(
      DEBUG_IP_REWRITE_PROXY_CONFIG_STORAGE_KEY,
      "{not valid json",
    );

    const loaded = loadDebugIpRewriteProxyConfigFromStorage();

    expect(loaded).toEqual(defaultDebugIpRewriteProxyConfig);
  });

  it("falls back to defaults when stored config fails normalization", () => {
    window.localStorage.setItem(
      DEBUG_IP_REWRITE_PROXY_CONFIG_STORAGE_KEY,
      JSON.stringify({
        enabled: true,
        targetHost: "http://invalid:80",
        mode: "all",
        ports: [],
        pattern: "",
      }),
    );

    const loaded = loadDebugIpRewriteProxyConfigFromStorage();

    expect(loaded).toEqual(defaultDebugIpRewriteProxyConfig);
  });

  it("fills missing baseUrls from env defaults when stored config omits them", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_WMS_API_BASE_URL", "");
    vi.stubEnv("VITE_MES_API_BASE_URL", "http://env-host:8282");
    vi.stubEnv("VITE_PRINT_API_BASE_URL", "");
    window.localStorage.setItem(
      DEBUG_IP_REWRITE_PROXY_CONFIG_STORAGE_KEY,
      JSON.stringify({
        enabled: false,
        targetHost: "127.0.0.1",
        mode: "ports",
        ports: [8282],
        pattern: "",
        baseUrls: { mes: "http://stored:9999" },
      }),
    );

    const loaded = loadDebugIpRewriteProxyConfigFromStorage();

    expect(loaded.baseUrls.mes).toBe("http://stored:9999");
    expect(loaded.baseUrls.app).toBe("");
    expect(loaded.baseUrls.wms).toBe("");
    expect(loaded.baseUrls.print).toBe("");
  });

  it("falls back to disabled defaults for an enabled config with relative base URLs", () => {
    vi.stubEnv("VITE_API_BASE_URL", "/api/app");
    vi.stubEnv("VITE_WMS_API_BASE_URL", "/api/wms");
    vi.stubEnv("VITE_MES_API_BASE_URL", "/api/mes");
    vi.stubEnv("VITE_PRINT_API_BASE_URL", "/api/print");
    window.localStorage.setItem(
      DEBUG_IP_REWRITE_PROXY_CONFIG_STORAGE_KEY,
      JSON.stringify({
        enabled: true,
        targetHost: "127.0.0.1",
        mode: "all",
        ports: [],
        pattern: "",
        baseUrls: {
          app: "/api/app",
          wms: "/api/wms",
          mes: "/api/mes",
          print: "/api/print",
        },
      }),
    );

    const loaded = loadDebugIpRewriteProxyConfigFromStorage();

    expect(loaded.enabled).toBe(false);
    expect(loaded.baseUrls).toEqual({
      app: "",
      wms: "",
      mes: "",
      print: "",
    });
  });

  it("uses the environment base URL in development", () => {
    saveDebugIpRewriteProxyConfigToStorage(buildConfig());

    expect(
      resolveDebugIpRewriteProxyBaseUrl("app", "/api/app", true),
    ).toBe("/api/app");
  });

  it("ignores stored base URLs in production while the proxy is disabled", () => {
    saveDebugIpRewriteProxyConfigToStorage(buildConfig({ enabled: false }));

    expect(
      resolveDebugIpRewriteProxyBaseUrl("mes", "/api/mes", false),
    ).toBe("/api/mes");
  });

  it("uses the stored absolute base URL in production while the proxy is enabled", () => {
    saveDebugIpRewriteProxyConfigToStorage(buildConfig());

    expect(
      resolveDebugIpRewriteProxyBaseUrl("mes", "/api/mes", false),
    ).toBe("http://192.168.0.135:8282");
  });

  it("save round-trips through load", () => {
    const config = buildConfig();
    const saved = saveDebugIpRewriteProxyConfigToStorage(config);

    expect(saved).toEqual(config);
    expect(
      window.localStorage.getItem(DEBUG_IP_REWRITE_PROXY_CONFIG_STORAGE_KEY),
    ).toBe(JSON.stringify(config));

    const reloaded = loadDebugIpRewriteProxyConfigFromStorage();
    expect(reloaded).toEqual(config);
  });

  it("save throws when the config is invalid", () => {
    expect(() =>
      saveDebugIpRewriteProxyConfigToStorage({
        ...defaultDebugIpRewriteProxyConfig,
        enabled: true,
        targetHost: "",
      }),
    ).toThrow("替换目标 IP/Host 不能为空");
  });
});
