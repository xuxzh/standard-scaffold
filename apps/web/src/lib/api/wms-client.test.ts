import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetWmsTransportForTests,
  setWmsTransportForTests,
  getWmsClient,
} from "@/lib/api/wms-client";
import type { Transport } from "@/lib/api/http-client";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetWmsTransportForTests();
});

describe("getWmsClient", () => {
  it("uses the configured WMS API base URL", async () => {
    vi.stubEnv("VITE_WMS_API_BASE_URL", "http://192.168.0.135:8283");
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

    expect(fetchMock).toHaveBeenCalledWith(
      "http://192.168.0.135:8283/InventoryVerificationStrategyApi/GetInventoryVerificationStrategyAutoQueryDatas",
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

  it("throws a clear error when the WMS API base URL is missing", () => {
    vi.stubEnv("VITE_WMS_API_BASE_URL", "");

    expect(() => getWmsClient()).toThrow(
      "VITE_WMS_API_BASE_URL is not configured",
    );
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

    expect(fetchMock).toHaveBeenCalledWith(
      "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas",
      expect.objectContaining({
        method: "POST",
      }),
    );
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
