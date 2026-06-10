import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPrintClient,
  resetPrintTransportForTests,
  setPrintTransportForTests,
} from "@/lib/api/print-client";
import type { Transport } from "@/lib/api/http-client";
import { getFetchRequest } from "@/test/fetch-request";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetPrintTransportForTests();
});

describe("getPrintClient", () => {
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
