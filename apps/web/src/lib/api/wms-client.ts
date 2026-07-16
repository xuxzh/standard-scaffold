import {
  createAxiosTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken } from "@/lib/auth/token-store";
import { resolveDebugIpRewriteProxyBaseUrl } from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store";
import { isApiMockingEnabled } from "@/mocks/config";

const WMS_API_BASE_URL_ENV_KEY = "VITE_WMS_API_BASE_URL";

function getConfiguredWmsApiBaseUrl() {
  return import.meta.env[WMS_API_BASE_URL_ENV_KEY] as string | undefined;
}

function resolveWmsBaseUrl(): string {
  return resolveDebugIpRewriteProxyBaseUrl(
    "wms",
    getConfiguredWmsApiBaseUrl(),
    import.meta.env.DEV,
  );
}

function createDefaultWmsTransport() {
  if (isApiMockingEnabled()) {
    return createAxiosTransport();
  }

  return createAxiosTransport({
    baseUrl: resolveWmsBaseUrl,
    getToken: getAccessToken,
  });
}

let wmsTransport: Transport | undefined;

export function getWmsClient() {
  wmsTransport ??= createDefaultWmsTransport();

  return createHttpClient({
    transport: wmsTransport,
    handleUnauthorized: handleUnauthorizedSession,
  });
}

export function setWmsTransportForTests(nextTransport: Transport) {
  wmsTransport = nextTransport;
}

export function resetWmsTransportForTests() {
  wmsTransport = undefined;
}
