import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetWmsTransportForTests,
  setWmsTransportForTests,
  getWmsClient,
} from "@/lib/api/wms-client";
import type { Transport } from "@/lib/api/http-client";
import { getFetchRequest } from "@/test/fetch-request";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetWmsTransportForTests();
});

describe("getWmsClient", () => {
  it("uses the configured WMS API base URL", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_WMS_API_BASE_URL", "http://192.168.0.135:8283");
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
      getWmsClient().postDataResult(
        "/InventoryVerificationStrategyApi/GetInventoryVerificationStrategyAutoQueryDatas",
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
      "http://192.168.0.135:8283/InventoryVerificationStrategyApi/GetInventoryVerificationStrategyAutoQueryDatas",
    );
    expect(request.method).toBe("POST");
    expect(request.headers.get("Authorization")).toBe("Bearer token-1");
    await expect(request.json()).resolves.toEqual({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 10,
    });
  });

  it("throws a clear error when IP rewrite is enabled but the WMS base URL is empty", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_WMS_API_BASE_URL", "");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    localStorage.setItem(
      "debug-ip-rewrite-proxy.config",
      JSON.stringify({
        enabled: true,
        targetHost: "127.0.0.1",
        mode: "ports",
        ports: [8283],
        pattern: "",
        baseUrls: { app: "", wms: "", mes: "", print: "" },
      }),
    );

    await expect(
      getWmsClient().postDataResult(
        "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas",
        {},
      ),
    ).rejects.toThrow("启用 IP 替换代理时，必须先在调试页面配置 WMS API Base URL");
  });

  it("uses a localStorage-overridden baseUrl in prod when present", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_WMS_API_BASE_URL", "http://192.168.0.135:8283");
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
          wms: "http://override:9999",
          mes: "",
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

    await getWmsClient().postDataResult("/PackagingTypeApi/Query", {});

    const request = getFetchRequest(fetchMock);

    expect(request.url).toBe("http://override:9999/PackagingTypeApi/Query");
    expect(request.method).toBe("POST");
  });

  it("ignores localStorage in dev and uses the env var", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_WMS_API_BASE_URL", "http://192.168.0.135:8283");
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
          wms: "http://override:9999",
          mes: "",
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

    await getWmsClient().postDataResult("/PackagingTypeApi/Query", {});

    const request = getFetchRequest(fetchMock);

    expect(request.url).toBe(
      "http://192.168.0.135:8283/PackagingTypeApi/Query",
    );
    expect(request.method).toBe("POST");
  });

  it("uses same-origin fetch when API mocking is enabled without a WMS base URL", async () => {
    vi.stubEnv("VITE_WMS_API_BASE_URL", "");
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
      getWmsClient().postDataResult("/PackagingTypeApi/GetPackagingTypeAutoQueryDatas", {
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
      }),
    ).resolves.toMatchObject({
      Success: true,
      Attach: [],
    });

    const request = getFetchRequest(fetchMock);

    expect(request.url).toBe(
      `${window.location.origin}/PackagingTypeApi/GetPackagingTypeAutoQueryDatas`,
    );
    expect(request.method).toBe("POST");
  });

  it("allows tests to inject a WMS transport", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: {
        ok: true,
      },
    }));

    setWmsTransportForTests(transport);

    await expect(getWmsClient().post("/Health/Check")).resolves.toEqual({
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
