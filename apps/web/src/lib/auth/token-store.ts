import {
  clearTenantContext,
  setTenantContextFromToken,
} from "@/lib/auth/tenant-context-store";

const accessTokenStorageKey = "accessToken";
const refreshTokenStorageKey = "refreshToken";
const tokenTypeStorageKey = "tokenType";
const expiresInStorageKey = "expiresIn";

export type AuthToken = {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export function getAccessToken() {
  return localStorage.getItem(accessTokenStorageKey);
}

export function getRefreshToken() {
  return localStorage.getItem(refreshTokenStorageKey);
}

export function getAuthToken(): AuthToken | null {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  const tokenType = localStorage.getItem(tokenTypeStorageKey);
  const expiresInValue = localStorage.getItem(expiresInStorageKey);
  const expiresIn = expiresInValue ? Number(expiresInValue) : Number.NaN;

  if (!accessToken || !refreshToken || !tokenType || !Number.isFinite(expiresIn)) {
    return null;
  }

  return {
    tokenType,
    accessToken,
    refreshToken,
    expiresIn,
  };
}

export function hasAuthToken() {
  return Boolean(getAccessToken());
}

export function setAuthToken(token: AuthToken) {
  localStorage.setItem(tokenTypeStorageKey, token.tokenType);
  localStorage.setItem(accessTokenStorageKey, token.accessToken);
  localStorage.setItem(refreshTokenStorageKey, token.refreshToken);
  localStorage.setItem(expiresInStorageKey, String(token.expiresIn));
  // Keep the in-memory tenant cache in sync with the latest access
  // token so downstream HTTP clients can read `CompanyCode` /
  // `FactoryCode` without re-decoding on every request.
  setTenantContextFromToken(token.accessToken);
}

export function clearAuthToken() {
  localStorage.removeItem(tokenTypeStorageKey);
  localStorage.removeItem(accessTokenStorageKey);
  localStorage.removeItem(refreshTokenStorageKey);
  localStorage.removeItem(expiresInStorageKey);
  clearTenantContext();
}

export function setAccessToken(token: string) {
  localStorage.setItem(accessTokenStorageKey, token);
  setTenantContextFromToken(token);
}

// Retained for callers (notably unit tests) that already imported the
// `*ForTests` alias. Production code should prefer `setAccessToken`.
export function setAccessTokenForTests(token: string) {
  setAccessToken(token);
}

export function clearAccessTokenForTests() {
  localStorage.removeItem(accessTokenStorageKey);
  clearTenantContext();
}
