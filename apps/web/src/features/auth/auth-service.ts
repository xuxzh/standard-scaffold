import {
  mapAuthTokenResponse,
  type AuthTokenResponse,
  type LoginCredentials,
} from "@/features/auth/auth-contract";
import { getAppClient } from "@/lib/api/app-client";
import type { AuthToken } from "@/lib/auth/token-store";

export async function login(
  credentials: LoginCredentials,
  options: { signal?: AbortSignal } = {},
): Promise<AuthToken> {
  const result = await getAppClient().postDataResult<AuthTokenResponse>(
    "/account/login",
    {
      UserCode: credentials.userCode,
      Password: credentials.password,
    },
    options,
  );

  return mapAuthTokenResponse(result.Attach);
}

export async function refreshAuthToken(
  refreshToken: string,
  options: { signal?: AbortSignal } = {},
): Promise<AuthToken> {
  const result = await getAppClient().postDataResult<AuthTokenResponse>(
    "/account/refresh",
    {
      RefreshToken: refreshToken,
    },
    options,
  );

  return mapAuthTokenResponse(result.Attach);
}
