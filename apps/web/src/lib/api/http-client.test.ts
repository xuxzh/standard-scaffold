import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAxiosTransport,
  createHttpClient,
  HttpClientError,
  type DataResult,
  type Transport,
} from "./http-client";

afterEach(() => {
  window.localStorage.clear();
  document.cookie = "XSRF-TOKEN=; Max-Age=0";
  vi.unstubAllEnvs();
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
      client.post<{ ok: boolean }>("/MaterialInfoApi/GetMaterialInfoAutoQueryDatas", {
        IsPaged: true,
        PageIndex: 1,
        PageSize: 10,
      }),
    ).resolves.toEqual({
      ok: true,
    });

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas",
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
        "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas",
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
      client.postDataResult<null>("/MaterialInfoApi/GetMaterialInfoAutoQueryDatas", {
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

  it("replays unauthorized requests with the refreshed token", async () => {
    let token = "token-1";
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "expired" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const client = createHttpClient({
      transport: createAxiosTransport({
        baseUrl: "https://api.example.test",
        getToken: () => token,
      }),
      handleUnauthorized: async () => {
        token = "token-2";
        return true;
      },
    });

    await expect(client.get("/protected")).resolves.toEqual({ ok: true });
    expect(getFetchRequest(fetchMock, 0).headers.get("Authorization")).toBe(
      "Bearer token-1",
    );
    expect(getFetchRequest(fetchMock, 1).headers.get("Authorization")).toBe(
      "Bearer token-2",
    );
  });

  it("invokes enrichBody and forwards the returned body to the transport", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: { ok: true },
    }));
    const enrichBody = vi.fn((body: unknown) => ({
      ...(body as Record<string, unknown>),
      CompanyCode: "RUIHUI",
    }));
    const client = createHttpClient({ transport, enrichBody });

    await expect(
      client.post("/Print/Query", { TypeCode: "PT001" }),
    ).resolves.toEqual({ ok: true });

    expect(enrichBody).toHaveBeenCalledWith({ TypeCode: "PT001" });
    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/Print/Query",
      body: { TypeCode: "PT001", CompanyCode: "RUIHUI" },
      signal: undefined,
    });
  });

  it("leaves the body unchanged when enrichBody returns it as-is", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: { ok: true },
    }));
    const enrichBody = vi.fn((body: unknown) => body);
    const client = createHttpClient({ transport, enrichBody });

    await expect(client.post("/Print/Query", { a: 1 })).resolves.toEqual({
      ok: true,
    });

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/Print/Query",
      body: { a: 1 },
      signal: undefined,
    });
  });

  it("invokes enrichBody again when the 401 retry replays the request", async () => {
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
    const enrichBody = vi.fn((body: unknown) => body);
    const client = createHttpClient({
      transport,
      enrichBody,
      handleUnauthorized: async () => true,
    });

    await expect(client.post("/Print/Query", { a: 1 })).resolves.toEqual({
      ok: true,
    });

    expect(enrichBody).toHaveBeenCalledTimes(2);
    expect(transport).toHaveBeenCalledTimes(2);
  });
});

function getFetchRequest(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, call = 0) {
  const [input, init] = fetchMock.mock.calls[call];

  return input instanceof Request ? input : new Request(input, init);
}

describe("createAxiosTransport", () => {
  it("rewrites matching request hosts before calling fetch", async () => {
    vi.stubEnv("DEV", false);
    window.localStorage.setItem(
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
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const transport = createAxiosTransport({
      baseUrl: () => "http://192.168.0.135:8282",
    });

    await transport({
      method: "GET",
      path: "/MaterialInfoApi/Get?id=1",
    });

    expect(getFetchRequest(fetchMock).url).toBe(
      "http://127.0.0.1:8282/MaterialInfoApi/Get?id=1",
    );
  });

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

    const transport = createAxiosTransport({
      baseUrl: "https://localhost:7298",
      getToken: () => "token-1",
    });

    await expect(
      transport({
        method: "POST",
        path: "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas",
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

    const request = getFetchRequest(fetchMock);

    expect(request.url).toBe(
      "https://localhost:7298/MaterialInfoApi/GetMaterialInfoAutoQueryDatas",
    );
    expect(request.method).toBe("POST");
    expect(request.headers.get("Accept")).toBe("application/json");
    expect(request.headers.get("Authorization")).toBe("Bearer token-1");
    expect(request.headers.get("Content-Type")).toBe("application/json");
    await expect(request.json()).resolves.toEqual({ IsPaged: true });
  });

  it("reads the latest token for every request", async () => {
    let token = "token-1";
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const transport = createAxiosTransport({
      baseUrl: "https://api.example.test",
      getToken: () => token,
    });

    await transport({ method: "GET", path: "/first" });
    token = "token-2";
    await transport({ method: "GET", path: "/second" });

    expect(getFetchRequest(fetchMock, 0).headers.get("Authorization")).toBe(
      "Bearer token-1",
    );
    expect(getFetchRequest(fetchMock, 1).headers.get("Authorization")).toBe(
      "Bearer token-2",
    );
  });

  it("returns non-successful http responses to the HttpClient layer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        return new Response(JSON.stringify({ message: "unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    const transport = createAxiosTransport();

    await expect(
      transport({ method: "GET", path: "/protected" }),
    ).resolves.toEqual({
      status: 401,
      data: { message: "unauthorized" },
    });
  });

  it("returns text and empty response bodies", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("service unavailable", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const transport = createAxiosTransport();

    await expect(
      transport({ method: "GET", path: "/text" }),
    ).resolves.toEqual({
      status: 503,
      data: "service unavailable",
    });
    await expect(
      transport({ method: "GET", path: "/empty" }),
    ).resolves.toEqual({
      status: 204,
      data: "",
    });
  });

  it("does not parse json-looking text without a json content type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        return new Response('{"ok":true}', {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }),
    );
    const transport = createAxiosTransport();

    await expect(
      transport({ method: "GET", path: "/text-json" }),
    ).resolves.toEqual({
      status: 200,
      data: '{"ok":true}',
    });
  });

  it("does not add Axios XSRF headers to same-origin requests", async () => {
    document.cookie = "XSRF-TOKEN=cookie-token";
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const transport = createAxiosTransport();

    await transport({ method: "GET", path: "/same-origin" });

    expect(getFetchRequest(fetchMock).headers.has("X-XSRF-TOKEN")).toBe(false);
  });

  it("passes AbortSignal cancellation to the fetch adapter", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const transport = createAxiosTransport();

    await expect(
      transport({
        method: "GET",
        path: "/slow",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      code: "ERR_CANCELED",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
