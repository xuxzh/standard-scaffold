import {
  createAxiosTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken } from "@/lib/auth/token-store";
import { getActiveTenantContext } from "@/lib/auth/tenant-context-store";
import { loadDebugIpRewriteProxyConfigFromStorage } from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store";
import { isApiMockingEnabled } from "@/mocks/config";

const PRINT_API_BASE_URL_ENV_KEY = "VITE_PRINT_API_BASE_URL";

function getConfiguredPrintApiBaseUrl() {
  return import.meta.env[PRINT_API_BASE_URL_ENV_KEY] as string | undefined;
}

function resolvePrintBaseUrl(): string {
  // Dev mode: dev proxy is the single source of truth (env vars +
  // `DEV_API_PROXY_ENABLED` in `vite.config.ts`). The debug page's
  // localStorage config is intentionally ignored so that the two tracks
  // don't interfere. See `docs/plans/2026-06-08/debug-ip-rewrite-proxy.md`.
  if (import.meta.env.DEV) {
    return getConfiguredPrintApiBaseUrl() ?? "";
  }

  const config = loadDebugIpRewriteProxyConfigFromStorage();
  const configured =
    config.baseUrls.print.trim() || getConfiguredPrintApiBaseUrl() || "";

  if (config.enabled && !configured) {
    throw new Error(
      "启用 IP 替换代理时，必须先在调试页面配置 Print API Base URL",
    );
  }

  return configured;
}

function createDefaultPrintTransport() {
  if (isApiMockingEnabled()) {
    return createAxiosTransport();
  }

  return createAxiosTransport({
    baseUrl: resolvePrintBaseUrl,
    getToken: getAccessToken,
  });
}

/**
 * Print backend expects `CompanyCode` / `FactoryCode` in the POST body
 * (unlike the other clients, whose backends derive tenant from the
 * bearer token). We extract the values from the active JWT and overlay
 * them onto the outgoing body. Non-object bodies (strings, arrays,
 * null) are returned as-is to avoid corrupting edge cases.
 */
function enrichBodyWithTenant(body: unknown): unknown {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }

  const tenant = getActiveTenantContext();
  if (!tenant) {
    return body;
  }

  return {
    ...(body as Record<string, unknown>),
    CompanyCode: tenant.companyCode,
    FactoryCode: tenant.factoryCode,
  };
}

let printTransport: Transport | undefined;

export function getPrintClient() {
  printTransport ??= createDefaultPrintTransport();

  return createHttpClient({
    transport: printTransport,
    handleUnauthorized: handleUnauthorizedSession,
    enrichBody: enrichBodyWithTenant,
  });
}

export function setPrintTransportForTests(nextTransport: Transport) {
  printTransport = nextTransport;
}

export function resetPrintTransportForTests() {
  printTransport = undefined;
}
