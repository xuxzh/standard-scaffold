import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPrintClient,
  resetPrintTransportForTests,
  setPrintTransportForTests,
} from "@/lib/api/print-client";
import type { Transport } from "@/lib/api/http-client";
import { clearAccessTokenForTests, setAccessTokenForTests } from "@/lib/auth/token-store";
import { getFetchRequest } from "@/test/fetch-request";

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadSegment = btoa(JSON.stringify(payload));
  return `${header}.${payloadSegment}.signature`;
}

afterEach(() => {
  // clearAccessTokenForTests both removes the localStorage entry AND
  // empties the tenant-context cache, so the next test starts from a
  // clean slate regardless of which token the previous test installed.
  clearAccessTokenForTests();
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetPrintTransportForTests();
});

describe("getPrintClient", () => {
  it("ignores a stored base URL in production while the proxy is disabled", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_PRINT_API_BASE_URL", "/api/print");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
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
          mes: "",
          print: "http://stale.example.test:3002",
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

    await getPrintClient().post("/PrintTemplateApi/Query", {});

    expect(getFetchRequest(fetchMock).url).toBe(
      `${window.location.origin}/api/print/PrintTemplateApi/Query`,
    );
  });

  it("uses and rewrites a stored absolute base URL in production while the proxy is enabled", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_PRINT_API_BASE_URL", "/api/print");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    localStorage.setItem(
      "debug-ip-rewrite-proxy.config",
      JSON.stringify({
        enabled: true,
        targetHost: "127.0.0.1",
        mode: "ports",
        ports: [3002],
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
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await getPrintClient().post("/PrintTemplateApi/Query?scope=all", {});

    expect(getFetchRequest(fetchMock).url).toBe(
      "http://127.0.0.1:3002/PrintTemplateApi/Query?scope=all",
    );
  });

  it("uses the configured Print API base URL and access token", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_PRINT_API_BASE_URL", "http://192.168.0.135:3002");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    localStorage.setItem("accessToken", "token-1");

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPrintClient().post("/PrintTemplateApi/Query", {})).resolves.toEqual({
      ok: true,
    });

    const request = getFetchRequest(fetchMock);

    expect(request.url).toBe(
      "http://192.168.0.135:3002/PrintTemplateApi/Query",
    );
    expect(request.method).toBe("POST");
    expect(request.headers.get("Authorization")).toBe("Bearer token-1");
    await expect(request.json()).resolves.toEqual({});
  });

  it("injects CompanyCode and FactoryCode into the POST body when the access token carries them", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_PRINT_API_BASE_URL", "http://192.168.0.135:3002");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    const token = makeJwt({
      CompanyCode: "RUIHUI",
      FactoryCode: "DEFAULT",
    });
    // setAccessTokenForTests both writes localStorage AND primes the
    // tenant-context cache via the token-store sync path.
    setAccessTokenForTests(token);

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getPrintClient().post("/PrintTemplateApi/Query", {
        TypeCode: "PT001",
        PageIndex: 1,
      }),
    ).resolves.toEqual({ ok: true });

    await expect(getFetchRequest(fetchMock).json()).resolves.toEqual({
      TypeCode: "PT001",
      PageIndex: 1,
      CompanyCode: "RUIHUI",
      FactoryCode: "DEFAULT",
    });
  });

  it("does not inject tenant fields when the access token is opaque", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_PRINT_API_BASE_URL", "http://192.168.0.135:3002");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    localStorage.setItem("accessToken", "opaque-token-without-claims");

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getPrintClient().post("/PrintTemplateApi/Query", { TypeCode: "PT001" }),
    ).resolves.toEqual({ ok: true });

    await expect(getFetchRequest(fetchMock).json()).resolves.toEqual({
      TypeCode: "PT001",
    });
  });

  it("does not inject tenant fields when no access token is present", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_PRINT_API_BASE_URL", "http://192.168.0.135:3002");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getPrintClient().post("/PrintTemplateApi/Query", { TypeCode: "PT001" }),
    ).resolves.toEqual({ ok: true });

    await expect(getFetchRequest(fetchMock).json()).resolves.toEqual({
      TypeCode: "PT001",
    });
  });

  it("allows tests to inject a Print transport", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: { ok: true },
    }));

    setPrintTransportForTests(transport);

    await expect(getPrintClient().post("/Health/Check")).resolves.toEqual({
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
