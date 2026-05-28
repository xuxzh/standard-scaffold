import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMomClient,
  resetMomTransportForTests,
  setMomTransportForTests,
} from "@/lib/api/mom-client";
import type { Transport } from "@/lib/api/http-client";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetMomTransportForTests();
});

describe("getMomClient", () => {
  it("uses the configured MOM API base URL", async () => {
    vi.stubEnv("VITE_MOM_API_BASE_URL", "http://192.168.0.135:8282");
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
      getMomClient().postDataResult("/WorkOrderApi/GetWorkOrderAutoQueryDatas", {
        IsPaged: true,
        PageIndex: 1,
        PageSize: 10,
      }),
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

  it("throws a clear error when the MOM API base URL is missing", () => {
    vi.stubEnv("VITE_MOM_API_BASE_URL", "");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");

    expect(() => getMomClient()).toThrow(
      "VITE_MOM_API_BASE_URL is not configured",
    );
  });

  it("uses same-origin fetch when API mocking is enabled without a MOM base URL", async () => {
    vi.stubEnv("VITE_MOM_API_BASE_URL", "");
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
      getMomClient().postDataResult("/WorkOrderApi/GetWorkOrderAutoQueryDatas", {
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
      }),
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

  it("allows tests to inject a MOM transport", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: {
        ok: true,
      },
    }));

    setMomTransportForTests(transport);

    await expect(getMomClient().post("/Health/Check")).resolves.toEqual({
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
