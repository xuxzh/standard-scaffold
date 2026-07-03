import type { AuthToken } from "./token-store";

/**
 * Normalises the token payload pushed by the micro host into the camelCase
 * `AuthToken` shape that `token-store` expects.
 *
 * The host serialises its `RhUserSessionDto.Token` (`RhUserAuthorizationDto`)
 * across the qiankun props boundary. After JSON round-tripping
 * the fields are PascalCase plain objects — `acquireTime` (a `Date` on the
 * host) becomes a string, which we ignore on purpose. The four scalar
 * fields we care about survive intact.
 *
 * Returns `null` whenever the payload is missing, malformed, or carries
 * wrong-type fields. The caller is expected to treat `null` as "no token
 * available" and avoid writing to localStorage.
 */
export function mapHostSessionTokenToAuthToken(
  userSession: unknown,
): AuthToken | null {
  if (!userSession || typeof userSession !== "object") {
    return null;
  }

  const token = (userSession as { Token?: unknown }).Token;
  if (!token || typeof token !== "object") {
    return null;
  }

  const { TokenType, AccessToken, ExpiresIn, RefreshToken } =
    token as Record<string, unknown>;

  if (typeof TokenType !== "string" || TokenType.length === 0) {
    return null;
  }
  if (typeof AccessToken !== "string" || AccessToken.length === 0) {
    return null;
  }
  if (typeof RefreshToken !== "string" || RefreshToken.length === 0) {
    return null;
  }

  // The host stores `ExpiresIn` as a number (seconds). Be defensive against
  // a numeric string sneaking through a future serialiser change.
  const expiresIn =
    typeof ExpiresIn === "number"
      ? ExpiresIn
      : typeof ExpiresIn === "string" && ExpiresIn.trim() !== ""
        ? Number(ExpiresIn)
        : Number.NaN;

  if (!Number.isFinite(expiresIn)) {
    return null;
  }

  return {
    tokenType: TokenType,
    accessToken: AccessToken,
    refreshToken: RefreshToken,
    expiresIn,
  };
}
