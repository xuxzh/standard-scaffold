import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMesClient,
  resetMesTransportForTests,
  setMesTransportForTests,
} from "@/lib/api/mes-client";
import type { Transport } from "@/lib/api/http-client";

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

    expect(fetchMock).toHaveBeenCalledWith(
      "http://192.168.0.135:8282/WorkOrderApi/GetWorkOrderAutoQueryDatas",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
        }),
        body: JSON.stringify({
          IsPaged: true,
          PageIndex: 1,
          PageSize: 10,
        }),
      }),
    );
  });

  it("throws a clear error when the IP rewrite is enabled but MES base URL is empty", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_MES_API_BASE_URL", "");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    localStorage.setItem(
      "debug-ip-rewrite-proxy.config",
      JSON.stringify({
        enabled: true,
        targetHost: "127.0.0.1",
        mode: "ports",
        ports: [8282],
        pattern: "",
        baseUrls: { app: "", wms: "", mes: "", print: "" },
      }),
    );

    await expect(
      getMesClient().postDataResult("/WorkOrderApi/GetWorkOrderAutoQueryDatas", {}),
    ).rejects.toThrow("启用 IP 替换代理时，必须先在调试页面配置 MES API Base URL");
  });

  it("uses a localStorage-overridden baseUrl in prod when present", async () => {
    vi.stubEnv("DEV", false);
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

    expect(fetchMock).toHaveBeenCalledWith(
      "http://override:9999/WorkOrderApi/Query",
      expect.objectContaining({ method: "POST" }),
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

    expect(fetchMock).toHaveBeenCalledWith(
      "http://192.168.0.135:8282/WorkOrderApi/Query",
      expect.objectContaining({ method: "POST" }),
    );
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

    expect(fetchMock).toHaveBeenCalledWith(
      "/WorkOrderApi/GetWorkOrderAutoQueryDatas",
      expect.objectContaining({
        method: "POST",
      }),
    );
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
