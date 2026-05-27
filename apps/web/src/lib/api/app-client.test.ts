import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAppClient,
  resetAppTransportForTests,
} from "@/lib/api/app-client";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetAppTransportForTests();
});

describe("getAppClient", () => {
  it("sends the access token when the API base URL is configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
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
});
