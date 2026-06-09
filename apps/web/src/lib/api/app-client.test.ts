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
  it("throws a clear error when IP rewrite is enabled but the App base URL is empty", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    localStorage.setItem(
      "debug-ip-rewrite-proxy.config",
      JSON.stringify({
        enabled: true,
        targetHost: "127.0.0.1",
        mode: "ports",
        ports: [8288],
        pattern: "",
        baseUrls: { app: "", wms: "", mes: "", print: "" },
      }),
    );

    await expect(getAppClient().get("/dashboard/stats")).rejects.toThrow(
      "启用 IP 替换代理时，必须先在调试页面配置 App API Base URL",
    );
  });

  it("uses a localStorage-overridden baseUrl in prod when present", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    localStorage.setItem("accessToken", "token-1");
    localStorage.setItem(
      "debug-ip-rewrite-proxy.config",
      JSON.stringify({
        enabled: false,
        targetHost: "127.0.0.1",
        mode: "ports",
        ports: [],
        pattern: "",
        baseUrls: {
          app: "https://override.test",
          wms: "",
          mes: "",
          print: "",
        },
      }),
    );

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    resetAppTransportForTests();

    await getAppClient().get("/dashboard/stats");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://override.test/dashboard/stats",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("ignores localStorage in dev and uses the env var", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    localStorage.setItem("accessToken", "token-1");
    localStorage.setItem(
      "debug-ip-rewrite-proxy.config",
      JSON.stringify({
        enabled: false,
        targetHost: "127.0.0.1",
        mode: "ports",
        ports: [],
        pattern: "",
        baseUrls: {
          app: "https://override.test",
          wms: "",
          mes: "",
          print: "",
        },
      }),
    );

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    resetAppTransportForTests();

    await getAppClient().get("/dashboard/stats");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/dashboard/stats",
      expect.objectContaining({ method: "GET" }),
    );
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
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    localStorage.setItem("accessToken", "token-1");

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          ok: true,
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
