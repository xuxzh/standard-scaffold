import {
  createAxiosTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken } from "@/lib/auth/token-store";
import { resolveDebugIpRewriteProxyBaseUrl } from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store";
import { isApiMockingEnabled } from "@/mocks/config";

const API_BASE_URL_ENV_KEY = "VITE_API_BASE_URL";

function getConfiguredApiBaseUrl() {
  return import.meta.env[API_BASE_URL_ENV_KEY] as string | undefined;
}

function resolveAppBaseUrl(): string {
  return resolveDebugIpRewriteProxyBaseUrl(
    "app",
    getConfiguredApiBaseUrl(),
    import.meta.env.DEV,
  );
}

function createDefaultAppTransport() {
  if (isApiMockingEnabled()) {
    return createAxiosTransport();
  }

  return createAxiosTransport({
    baseUrl: resolveAppBaseUrl,
    getToken: getAccessToken,
  });
}

let appTransport: Transport | undefined;

export function getAppClient() {
  appTransport ??= createDefaultAppTransport();

  return createHttpClient({
    transport: appTransport,
    handleUnauthorized: handleUnauthorizedSession,
  });
}

export function setAppTransportForTests(nextTransport: Transport) {
  appTransport = nextTransport;
}

export function resetAppTransportForTests() {
  appTransport = undefined;
}
