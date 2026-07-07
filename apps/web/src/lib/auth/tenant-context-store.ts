import { decodeJwtPayload } from "@/lib/auth/jwt-decode";

/**
 * Active tenant scope derived from the JWT currently held by the token
 * store. The values are populated whenever `setAuthToken` /
 * `setAccessToken*` runs (login, refresh, host-token bridge, tests) and
 * cleared whenever the token is cleared (logout, 401 retry failure,
 * tests). Read-side accessors return `null` when no token has been seen
 * yet, or when the latest token does not carry both required claims.
 *
 * Intentionally does NOT import `@/lib/auth/token-store` — the token
 * store is the only writer to this module, and a one-way dependency
 * avoids the cycle.
 */
export type ActiveTenantContext = {
  companyCode: string;
  factoryCode: string;
};

type Cached = ActiveTenantContext | null;

let cached: Cached = null;

const COMPANY_CLAIM = "CompanyCode";
const FACTORY_CLAIM = "FactoryCode";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Parses the given access token (a JWT) and updates the cached tenant
 * context. When the token is missing, malformed, or does not carry both
 * `CompanyCode` and `FactoryCode` claims, the cache is cleared.
 *
 * Called automatically by the token store; tests can also call this
 * directly to simulate login with a specific JWT.
 */
export function setTenantContextFromToken(token: string | null | undefined): void {
  if (!token) {
    cached = null;
    return;
  }

  const payload = decodeJwtPayload<Record<string, unknown>>(token);

  if (!payload) {
    cached = null;
    return;
  }

  const companyCode = payload[COMPANY_CLAIM];
  const factoryCode = payload[FACTORY_CLAIM];

  if (!isNonEmptyString(companyCode) || !isNonEmptyString(factoryCode)) {
    cached = null;
    return;
  }

  cached = { companyCode, factoryCode };
}

/** Clears any cached tenant context. Called on logout / token eviction. */
export function clearTenantContext(): void {
  cached = null;
}

export function getCompanyCode(): string | null {
  return cached?.companyCode ?? null;
}

export function getFactoryCode(): string | null {
  return cached?.factoryCode ?? null;
}

export function getActiveTenantContext(): ActiveTenantContext | null {
  return cached ? { ...cached } : null;
}