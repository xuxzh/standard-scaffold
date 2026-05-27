import { afterEach, describe, expect, it, vi } from "vitest";
import { login, refreshAuthToken } from "@/features/auth/auth-service";
import {
  resetAppTransportForTests,
  setAppTransportForTests,
} from "@/lib/api/app-client";
import type { DataResult, Transport } from "@/lib/api/http-client";

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
  resetAppTransportForTests();
});

describe("auth-service", () => {
  it("posts login credentials with the exact backend field names", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: tokenResult("access-1", "refresh-1"),
    }));
    setAppTransportForTests(transport);

    await expect(
      login({
        userCode: "DemoAdmin",
        password: "Icpt1357!!",
      }),
    ).resolves.toEqual({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/account/login",
      body: {
        UserCode: "DemoAdmin",
        Password: "Icpt1357!!",
      },
      signal: undefined,
    });
  });

  it("posts only RefreshToken when refreshing the session", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: tokenResult("access-2", "refresh-2"),
    }));
    setAppTransportForTests(transport);

    await expect(refreshAuthToken("refresh-1")).resolves.toEqual({
      tokenType: "Bearer",
      accessToken: "access-2",
      refreshToken: "refresh-2",
      expiresIn: 604800,
    });

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/account/refresh",
      body: {
        RefreshToken: "refresh-1",
      },
      signal: undefined,
    });
  });
});
