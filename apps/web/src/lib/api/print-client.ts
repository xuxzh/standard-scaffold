import {
  createFetchTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken } from "@/lib/auth/token-store";
import { isApiMockingEnabled } from "@/mocks/config";

const PRINT_API_BASE_URL_ENV_KEY = "VITE_PRINT_API_BASE_URL";

function getConfiguredPrintApiBaseUrl() {
  return import.meta.env[PRINT_API_BASE_URL_ENV_KEY] as string | undefined;
}

function createDefaultPrintTransport() {
  const baseUrl = getConfiguredPrintApiBaseUrl();

  if (isApiMockingEnabled()) {
    return createFetchTransport();
  }

  if (!baseUrl) {
    throw new Error(`${PRINT_API_BASE_URL_ENV_KEY} is not configured`);
  }

  return createFetchTransport({
    baseUrl,
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
