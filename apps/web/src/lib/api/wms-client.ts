import {
  createFetchTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken } from "@/lib/auth/token-store";
import { loadDebugIpRewriteProxyConfigFromStorage } from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store";
import { isApiMockingEnabled } from "@/mocks/config";

const WMS_API_BASE_URL_ENV_KEY = "VITE_WMS_API_BASE_URL";

function getConfiguredWmsApiBaseUrl() {
  return import.meta.env[WMS_API_BASE_URL_ENV_KEY] as string | undefined;
}

function resolveWmsBaseUrl(): string {
  // Dev mode: dev proxy is the single source of truth (env vars +
  // `DEV_API_PROXY_ENABLED` in `vite.config.ts`). The debug page's
  // localStorage config is intentionally ignored so that the two tracks
  // don't interfere. See `docs/plans/2026-06-08/debug-ip-rewrite-proxy.md`.
  if (import.meta.env.DEV) {
    return getConfiguredWmsApiBaseUrl() ?? "";
  }

  const config = loadDebugIpRewriteProxyConfigFromStorage();
  const configured =
    config.baseUrls.wms.trim() || getConfiguredWmsApiBaseUrl() || "";

  if (config.enabled && !configured) {
    throw new Error(
      "启用 IP 替换代理时，必须先在调试页面配置 WMS API Base URL",
    );
  }

  return configured;
}

function createDefaultWmsTransport() {
  if (isApiMockingEnabled()) {
    return createFetchTransport();
  }

  return createFetchTransport({
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
