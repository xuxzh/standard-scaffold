import {
  createAxiosTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken } from "@/lib/auth/token-store";
import { getActiveTenantContext } from "@/lib/auth/tenant-context-store";
import { resolveDebugIpRewriteProxyBaseUrl } from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store";
import { isApiMockingEnabled } from "@/mocks/config";

const PRINT_API_BASE_URL_ENV_KEY = "VITE_PRINT_API_BASE_URL";

function getConfiguredPrintApiBaseUrl() {
  return import.meta.env[PRINT_API_BASE_URL_ENV_KEY] as string | undefined;
}

function resolvePrintBaseUrl(): string {
  return resolveDebugIpRewriteProxyBaseUrl(
    "print",
    getConfiguredPrintApiBaseUrl(),
    import.meta.env.DEV,
  );
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
