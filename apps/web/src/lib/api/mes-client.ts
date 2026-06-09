import {
  createFetchTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken } from "@/lib/auth/token-store";
import { loadDebugIpRewriteProxyConfigFromStorage } from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store";
import { isApiMockingEnabled } from "@/mocks/config";

const MES_API_BASE_URL_ENV_KEY = "VITE_MES_API_BASE_URL";

function getConfiguredMesApiBaseUrl() {
  return import.meta.env[MES_API_BASE_URL_ENV_KEY] as string | undefined;
}

function resolveMesBaseUrl(): string {
  // Dev mode: dev proxy is the single source of truth (env vars +
  // `DEV_API_PROXY_ENABLED` in `vite.config.ts`). The debug page's
  // localStorage config is intentionally ignored so that the two tracks
  // don't interfere. See `docs/plans/2026-06-08/debug-ip-rewrite-proxy.md`.
  if (import.meta.env.DEV) {
    return getConfiguredMesApiBaseUrl() ?? "";
  }

  const config = loadDebugIpRewriteProxyConfigFromStorage();
  const configured =
    config.baseUrls.mes.trim() || getConfiguredMesApiBaseUrl() || "";

  if (config.enabled && !configured) {
    throw new Error(
      "启用 IP 替换代理时，必须先在调试页面配置 MES API Base URL",
    );
  }

  return configured;
}

function createDefaultMesTransport() {
  if (isApiMockingEnabled()) {
    return createFetchTransport();
  }

  return createFetchTransport({
    baseUrl: resolveMesBaseUrl,
    getToken: getAccessToken,
  });
}

let mesTransport: Transport | undefined;

export function getMesClient() {
  mesTransport ??= createDefaultMesTransport();

  return createHttpClient({
    transport: mesTransport,
    handleUnauthorized: handleUnauthorizedSession,
  });
}

export function setMesTransportForTests(nextTransport: Transport) {
  mesTransport = nextTransport;
}

export function resetMesTransportForTests() {
  mesTransport = undefined;
}
