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
        ports: [8288],
        pattern: "",
      }),
    ).rejects.toThrow("端口必须是 1-65535 的整数");
  });
});
