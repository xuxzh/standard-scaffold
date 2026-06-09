import {
  createFetchTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken } from "@/lib/auth/token-store";
import { loadDebugIpRewriteProxyConfigFromStorage } from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store";
import { isApiMockingEnabled } from "@/mocks/config";

const API_BASE_URL_ENV_KEY = "VITE_API_BASE_URL";

function getConfiguredApiBaseUrl() {
  return import.meta.env[API_BASE_URL_ENV_KEY] as string | undefined;
}

function resolveAppBaseUrl(): string {
  const config = loadDebugIpRewriteProxyConfigFromStorage();
  const configured =
    config.baseUrls.app.trim() || getConfiguredApiBaseUrl() || "";

  if (config.enabled && !configured) {
    throw new Error(
      "启用 IP 替换代理时，必须先在调试页面配置 App API Base URL",
    );
  }

  return configured;
}

function createDefaultAppTransport() {
  if (isApiMockingEnabled()) {
    return createFetchTransport();
  }

  return createFetchTransport({
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
