import type { DataResult } from "@/lib/api/http-client";

type AuthTokenResponse = {
  TokenType: string;
  AccessToken: string;
  ExpiresIn: number;
  RefreshToken: string;
};

type LoginPayload = {
  UserCode?: string;
  Password?: string;
};

type RefreshPayload = {
  RefreshToken?: string;
};

const mockLoginCredentials = {
  UserCode: "DemoAdmin",
  Password: "Icpt1357!!",
} as const;

function createAuthTokenResult(
  accessToken: string,
  refreshToken: string,
): DataResult<AuthTokenResponse> {
  return {
    Success: true,
    Code: null,
    Message: "[Platform]数据更新成功!",
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

export function createMockLoginResponse(body: unknown) {
  const payload = (body ?? {}) as LoginPayload;

  if (
    payload.UserCode !== mockLoginCredentials.UserCode ||
    payload.Password !== mockLoginCredentials.Password
  ) {
    return {
      status: 401,
      data: {
        message: "Invalid credentials",
      },
    };
  }

  return {
    status: 200,
    data: createAuthTokenResult("mock-access-token", "mock-refresh-token"),
  };
}

export function createMockRefreshResponse(body: unknown) {
  const payload = (body ?? {}) as RefreshPayload;

  if (!payload.RefreshToken) {
    return {
      status: 401,
      data: {
        message: "Refresh token is required",
      },
    };
  }

  return {
    status: 200,
    data: createAuthTokenResult("mock-access-token-refreshed", "mock-refresh-token-next"),
  };
}
