import {
  createAxiosTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken } from "@/lib/auth/token-store";
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

let printTransport: Transport | undefined;

export function getPrintClient() {
  printTransport ??= createDefaultPrintTransport();

  return createHttpClient({
    transport: printTransport,
    handleUnauthorized: handleUnauthorizedSession,
  });
}

export function setPrintTransportForTests(nextTransport: Transport) {
  printTransport = nextTransport;
}

export function resetPrintTransportForTests() {
  printTransport = undefined;
}
