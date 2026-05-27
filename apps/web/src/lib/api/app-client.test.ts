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
  it("throws a clear error when API mocking is disabled and the API base URL is missing", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");

    expect(() => {
      resetAppTransportForTests();
      getAppClient();
    }).toThrow("VITE_API_BASE_URL is not configured");
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
