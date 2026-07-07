import { decodeJwtPayload } from "@/lib/auth/jwt-decode";

/**
 * Active tenant scope derived from the JWT currently held by the token
 * store. The values are populated whenever `setAuthToken` /
 * `setAccessToken*` runs (login, refresh, host-token bridge, tests),
 * cleared whenever the token is cleared (logout, 401 retry failure,
 * tests), and re-populated lazily on first read when the module is
 * fresh after a page reload (in which case the in-memory cache is
 * empty but localStorage still holds the access token).
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
// `hydrated` flips to true after the first read attempt at a fresh
// page load. Subsequent reads skip the localStorage probe so the
// cache stays in sync with whatever the token store most recently
// wrote (login, refresh, logout).
let hydrated = false;

const COMPANY_CLAIM = "CompanyCode";
const FACTORY_CLAIM = "FactoryCode";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function readAccessTokenFromStorage(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage.getItem("accessToken");
}

/**
 * First-read lazy hydration: on a freshly loaded page the in-memory
 * cache is empty (module-level `let cached` resets on JS reload) even
 * though localStorage still carries the access token from the previous
 * session. Without this probe, the print-client's body-enrichment
 * hook would silently send the un-enriched default payload because
 * `getActiveTenantContext()` returns `null`.
 *
 * Idempotent: after the first call the flag stays true and the
 * cache is owned exclusively by `setTenantContextFromToken` /
 * `clearTenantContext`.
 */
function ensureHydrated(): void {
  if (hydrated) {
    return;
  }

  hydrated = true;
  setTenantContextFromToken(readAccessTokenFromStorage());
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
  // An explicit writer (token store, tests) is always more recent than
  // whatever localStorage might still hold from a previous session, so
  // mark the cache as authoritative and skip future hydration probes.
  hydrated = true;

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
  // Reset the hydration flag so a subsequent read on the same module
  // instance re-probes localStorage. Useful for tests that want to
  // simulate a fresh page load after a clear.
  hydrated = false;
}

export function getCompanyCode(): string | null {
  ensureHydrated();
  return cached?.companyCode ?? null;
}

export function getFactoryCode(): string | null {
  ensureHydrated();
  return cached?.factoryCode ?? null;
}

export function getActiveTenantContext(): ActiveTenantContext | null {
  ensureHydrated();
  return cached ? { ...cached } : null;
}