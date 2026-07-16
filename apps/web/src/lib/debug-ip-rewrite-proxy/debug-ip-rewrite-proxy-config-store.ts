import {
  normalizeDebugIpRewriteProxyConfig,
  type DebugIpRewriteProxyBaseUrls,
  type DebugIpRewriteProxyConfig,
} from "./debug-ip-rewrite-proxy";

/**
 * localStorage key for the debug IP rewrite proxy config.
 *
 * Persists the user's per-browser debug config so the browser-side transport
 * wrapper can read it on every request. Env vars only act as the initial
 * seed (see `getDefaultDebugIpRewriteProxyBaseUrls`).
 */
export const DEBUG_IP_REWRITE_PROXY_CONFIG_STORAGE_KEY =
  "debug-ip-rewrite-proxy.config";

/**
 * Reads the current debug IP rewrite proxy config from localStorage, then
 * runs it through `normalizeDebugIpRewriteProxyConfig` to validate and fill
 * in any missing fields with the latest defaults. Base URL defaults keep only
 * absolute HTTP(S) environment values and must be re-evaluated at call time.
 *
 * If localStorage is unavailable, the stored JSON is malformed, or
 * normalization throws, falls back to a default config rather than crashing
 * the page or the request pipeline.
 */
export function loadDebugIpRewriteProxyConfigFromStorage(): DebugIpRewriteProxyConfig {
  if (typeof window === "undefined" || !window.localStorage) {
    return normalizeDebugIpRewriteProxyConfig({});
  }

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(DEBUG_IP_REWRITE_PROXY_CONFIG_STORAGE_KEY);
  } catch {
    return normalizeDebugIpRewriteProxyConfig({});
  }

  if (!raw) {
    return normalizeDebugIpRewriteProxyConfig({});
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeDebugIpRewriteProxyConfig(
      parsed as Partial<DebugIpRewriteProxyConfig>,
    );
  } catch {
    return normalizeDebugIpRewriteProxyConfig({});
  }
}

export function resolveDebugIpRewriteProxyBaseUrl(
  api: keyof DebugIpRewriteProxyBaseUrls,
  envBaseUrl: string | undefined,
  isDevelopment: boolean,
) {
  if (isDevelopment) {
    return envBaseUrl ?? "";
  }

  const config = loadDebugIpRewriteProxyConfigFromStorage();
  return config.enabled ? config.baseUrls[api] : (envBaseUrl ?? "");
}

/**
 * Validates `config` via `normalizeDebugIpRewriteProxyConfig` (rethrows on
 * validation failure) and persists the normalized result to localStorage.
 *
 * Best-effort: if localStorage is unavailable or `setItem` throws (private
 * mode, quota exceeded), swallows the error so the UI does not surface a
 * misleading toast — the in-memory form state is still updated.
 */
export function saveDebugIpRewriteProxyConfigToStorage(
  config: DebugIpRewriteProxyConfig,
): DebugIpRewriteProxyConfig {
  const normalized = normalizeDebugIpRewriteProxyConfig(config);

  if (typeof window === "undefined" || !window.localStorage) {
    return normalized;
  }

  try {
    window.localStorage.setItem(
      DEBUG_IP_REWRITE_PROXY_CONFIG_STORAGE_KEY,
      JSON.stringify(normalized),
    );
  } catch {
    // Swallow: storage is best-effort for this dev-only feature.
  }

  return normalized;
}
