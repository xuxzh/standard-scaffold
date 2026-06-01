import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFetchTransport,
  createHttpClient,
  HttpClientError,
  type DataResult,
  type Transport,
} from "./http-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createHttpClient", () => {
  it("returns transport data for successful requests", async () => {
    const transport: Transport = async () => ({
      status: 200,
      data: {
        stats: [{ key: "activeModules", value: "05" }],
      },
    });

    const client = createHttpClient({ transport });

    await expect(
      client.get<{ stats: Array<{ key: string; value: string }> }>(
        "/dashboard/stats",
      ),
    ).resolves.toEqual({
      stats: [{ key: "activeModules", value: "05" }],
    });
  });

  it("normalizes transport failures into HttpClientError instances", async () => {
    const transport: Transport = async () => ({
      status: 503,
      data: {
        message: "Dashboard service is temporarily unavailable",
      },
    });

    const client = createHttpClient({ transport });

    await expect(client.get("/dashboard/stats")).rejects.toEqual(
      new HttpClientError({
        message: "Dashboard service is temporarily unavailable",
        status: 503,
        code: "HTTP_ERROR",
      }),
    );
  });

  it("posts json bodies through the configured transport", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: {
        ok: true,
      },
    }));

    const client = createHttpClient({ transport });

    await expect(
      client.post<{ ok: boolean }>("/Material/GetMaterialAutoQueryDatas", {
        IsPaged: true,
        PageIndex: 1,
        PageSize: 10,
      }),
    ).resolves.toEqual({
      ok: true,
    });

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/Material/GetMaterialAutoQueryDatas",
      body: {
        IsPaged: true,
        PageIndex: 1,
        PageSize: 10,
      },
      signal: undefined,
    });
  });

  it("returns successful DataResult responses", async () => {
    type Material = {
      Id: number;
      MaterialCode: string;
    };

    const result: DataResult<Material[]> = {
      Success: true,
      Code: "",
      Message: "[MES] 获取数据成功！",
      Attach: [
        {
          Id: 1,
          MaterialCode: "M001",
        },
      ],
      SkipCount: 0,
      TotalCount: 1,
      Record: 1,
    };

    const client = createHttpClient({
      transport: async () => ({
        status: 200,
        data: result,
      }),
    });

    await expect(
      client.postDataResult<Material[]>(
        "/Material/GetMaterialAutoQueryDatas",
        {
          IsPaged: true,
          PageIndex: 1,
          PageSize: 10,
        },
      ),
    ).resolves.toEqual(result);
  });

  it("keeps empty query DataResult responses as non-throwing results", async () => {
    const result: DataResult<null> = {
      Success: false,
      Code: "100001",
      Message: "[MES] 未查询到数据！",
      Attach: null,
      SkipCount: 0,
      TotalCount: 0,
      Record: 0,
    };

    const client = createHttpClient({
      transport: async () => ({
        status: 200,
        data: result,
      }),
    });

    await expect(
      client.postDataResult<null>("/Material/GetMaterialAutoQueryDatas", {
        IsPaged: true,
      }),
    ).resolves.toEqual(result);
  });

  it("throws business errors for unsuccessful DataResult responses", async () => {
    const result: DataResult<null> = {
      Success: false,
      Code: "400001",
      Message: "物料编码已存在",
      Attach: null,
      SkipCount: 0,
      TotalCount: 0,
      Record: 0,
    };

    const client = createHttpClient({
      transport: async () => ({
        status: 200,
        data: result,
      }),
    });

    await expect(
      client.postDataResult<null>("/Material/StoreMaterialData", {
        MaterialCode: "M001",
      }),
    ).rejects.toEqual(
      new HttpClientError({
        message: "物料编码已存在",
        code: "BUSINESS_ERROR",
        apiCode: "400001",
        result,
      }),
    );
  });

  it("calls the unauthorized handler and retries the original request once", async () => {
    const transport = vi
      .fn<Transport>()
      .mockResolvedValueOnce({
        status: 401,
        data: { message: "expired" },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { ok: true },
      });
    const handleUnauthorized = vi.fn(async () => true);
    const client = createHttpClient({
      transport,
      handleUnauthorized,
    });

    await expect(client.get("/dashboard/stats")).resolves.toEqual({ ok: true });

    expect(handleUnauthorized).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("does not retry login or refresh requests after 401", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 401,
      data: { message: "invalid credentials" },
    }));
    const handleUnauthorized = vi.fn(async () => true);
    const client = createHttpClient({
      transport,
      handleUnauthorized,
    });

    await expect(client.post("/account/login", {})).rejects.toMatchObject({
      status: 401,
    });
    await expect(client.post("/account/refresh", {})).rejects.toMatchObject({
      status: 401,
    });

    expect(handleUnauthorized).not.toHaveBeenCalled();
    expect(transport).toHaveBeenCalledTimes(2);
  });
});

describe("createFetchTransport", () => {
  it("sends json requests with bearer authorization", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          Success: true,
          Code: "",
          Message: "ok",
          Attach: {
            Id: 1,
          },
          SkipCount: 0,
          TotalCount: 1,
          Record: 1,
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

    const transport = createFetchTransport({
      baseUrl: "https://localhost:7298",
      getToken: () => "token-1",
    });

    await expect(
      transport({
        method: "POST",
        path: "/Material/GetMaterialAutoQueryDatas",
        body: {
          IsPaged: true,
        },
      }),
    ).resolves.toEqual({
      status: 200,
      data: {
        Success: true,
        Code: "",
        Message: "ok",
        Attach: {
          Id: 1,
        },
        SkipCount: 0,
        TotalCount: 1,
        Record: 1,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://localhost:7298/Material/GetMaterialAutoQueryDatas",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer token-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          IsPaged: true,
        }),
        signal: undefined,
      },
    );
  });
});
