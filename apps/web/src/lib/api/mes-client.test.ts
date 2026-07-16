import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMesClient,
  resetMesTransportForTests,
  setMesTransportForTests,
} from "@/lib/api/mes-client";
import type { Transport } from "@/lib/api/http-client";
import { getFetchRequest } from "@/test/fetch-request";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetMesTransportForTests();
});

describe("getMesClient", () => {
  it("uses the configured MES API base URL", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_MES_API_BASE_URL", "http://192.168.0.135:8282");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    localStorage.setItem("accessToken", "token-1");

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          Success: true,
          Code: "",
          Message: "ok",
          Attach: [],
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
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

    await expect(
      getMesClient().postDataResult(
        "/WorkOrderApi/GetWorkOrderAutoQueryDatas",
        {
          IsPaged: true,
          PageIndex: 1,
          PageSize: 10,
        },
      ),
    ).resolves.toMatchObject({
      Success: true,
      Attach: [],
    });

    const request = getFetchRequest(fetchMock);

    expect(request.url).toBe(
      "http://192.168.0.135:8282/WorkOrderApi/GetWorkOrderAutoQueryDatas",
    );
    expect(request.method).toBe("POST");
    expect(request.headers.get("Authorization")).toBe("Bearer token-1");
    await expect(request.json()).resolves.toEqual({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 10,
    });
  });

  it("ignores a stored base URL in production while the proxy is disabled", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_MES_API_BASE_URL", "/api/mes");
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
          app: "",
          wms: "",
          mes: "http://override:9999",
          print: "",
        },
      }),
    );

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          Success: true,
          Code: "",
          Message: "ok",
          Attach: [],
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await getMesClient().postDataResult("/WorkOrderApi/Query", {});

    const request = getFetchRequest(fetchMock);

    expect(request.url).toBe(
      `${window.location.origin}/api/mes/WorkOrderApi/Query`,
    );
    expect(request.method).toBe("POST");
  });

  it("uses and rewrites a stored absolute base URL in production while the proxy is enabled", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_MES_API_BASE_URL", "/api/mes");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    localStorage.setItem(
      "debug-ip-rewrite-proxy.config",
      JSON.stringify({
        enabled: true,
        targetHost: "127.0.0.1",
        mode: "ports",
        ports: [8282],
        pattern: "",
        baseUrls: {
          app: "http://192.168.0.135:8288",
          wms: "http://192.168.0.135:8283",
          mes: "http://192.168.0.135:8282",
          print: "http://192.168.0.135:3002",
        },
      }),
    );

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          Success: true,
          Code: "",
          Message: "ok",
          Attach: [],
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await getMesClient().postDataResult("/WorkOrderApi/Query?scope=all", {});

    expect(getFetchRequest(fetchMock).url).toBe(
      "http://127.0.0.1:8282/WorkOrderApi/Query?scope=all",
    );
  });

  it("ignores localStorage in dev and uses the env var", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_MES_API_BASE_URL", "http://192.168.0.135:8282");
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
          app: "",
          wms: "",
          mes: "http://override:9999",
          print: "",
        },
      }),
    );

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          Success: true,
          Code: "",
          Message: "ok",
          Attach: [],
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await getMesClient().postDataResult("/WorkOrderApi/Query", {});

    const request = getFetchRequest(fetchMock);

    expect(request.url).toBe(
      "http://192.168.0.135:8282/WorkOrderApi/Query",
    );
    expect(request.method).toBe("POST");
  });

  it("uses same-origin fetch when API mocking is enabled without a MES base URL", async () => {
    vi.stubEnv("VITE_MES_API_BASE_URL", "");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "true");

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          Success: true,
          Code: "",
          Message: "ok",
          Attach: [],
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
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

    await expect(
      getMesClient().postDataResult(
        "/WorkOrderApi/GetWorkOrderAutoQueryDatas",
        {
          IsPaged: true,
          PageIndex: 1,
          PageSize: 20,
        },
      ),
    ).resolves.toMatchObject({
      Success: true,
      Attach: [],
    });

    const request = getFetchRequest(fetchMock);

    expect(request.url).toBe(
      `${window.location.origin}/WorkOrderApi/GetWorkOrderAutoQueryDatas`,
    );
    expect(request.method).toBe("POST");
  });

  it("allows tests to inject a MES transport", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: {
        ok: true,
      },
    }));

    setMesTransportForTests(transport);

    await expect(getMesClient().post("/Health/Check")).resolves.toEqual({
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
