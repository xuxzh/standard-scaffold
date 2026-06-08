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
