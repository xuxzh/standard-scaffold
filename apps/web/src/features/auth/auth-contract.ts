import type { AuthToken } from "@/lib/auth/token-store";

export type LoginCredentials = {
  userCode: string;
  password: string;
};

export type AuthTokenResponse = {
  TokenType: string;
  AccessToken: string;
  ExpiresIn: number;
  RefreshToken: string;
};

export function mapAuthTokenResponse(response: AuthTokenResponse): AuthToken {
  return {
    tokenType: response.TokenType,
    accessToken: response.AccessToken,
    expiresIn: response.ExpiresIn,
    refreshToken: response.RefreshToken,
  };
}
