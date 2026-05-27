import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetAppTransportForTests,
  setAppTransportForTests,
} from "@/lib/api/app-client";
import type { DataResult, Transport } from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import {
  getAccessToken,
  getRefreshToken,
  setAuthToken,
} from "@/lib/auth/token-store";

function tokenResult(
  accessToken: string,
  refreshToken: string,
): DataResult<{
  TokenType: string;
  AccessToken: string;
  ExpiresIn: number;
  RefreshToken: string;
}> {
  return {
    Success: true,
    Code: null,
    Message: "ok",
    Record: 1,
    SkipCount: 0,
    TotalCount: 1,
    Attach: {
      TokenType: "Bearer",
      AccessToken: accessToken,
      ExpiresIn: 604800,
      RefreshToken: refreshToken,
    },
  };
}

afterEach(() => {
  localStorage.clear();
  resetAppTransportForTests();
});

describe("handleUnauthorizedSession", () => {
  it("refreshes the stored token and returns true when refresh succeeds", async () => {
    setAuthToken({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: tokenResult("access-2", "refresh-2"),
    }));
    setAppTransportForTests(transport);

    await expect(handleUnauthorizedSession()).resolves.toBe(true);

    expect(getAccessToken()).toBe("access-2");
    expect(getRefreshToken()).toBe("refresh-2");
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("shares one refresh request across concurrent 401 handlers", async () => {
    setAuthToken({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: tokenResult("access-2", "refresh-2"),
    }));
    setAppTransportForTests(transport);

    await expect(
      Promise.all([
        handleUnauthorizedSession(),
        handleUnauthorizedSession(),
        handleUnauthorizedSession(),
      ]),
    ).resolves.toEqual([true, true, true]);

    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("clears auth state and returns false when refresh fails", async () => {
    setAuthToken({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });
    setAppTransportForTests(async () => ({
      status: 401,
      data: { message: "refresh expired" },
    }));

    await expect(handleUnauthorizedSession()).resolves.toBe(false);

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
