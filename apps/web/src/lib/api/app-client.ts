import {
  createFetchTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken } from "@/lib/auth/token-store";
import { isApiMockingEnabled } from "@/mocks/config";

const API_BASE_URL_ENV_KEY = "VITE_API_BASE_URL";

function getConfiguredApiBaseUrl() {
  return import.meta.env[API_BASE_URL_ENV_KEY] as string | undefined;
}

function createDefaultAppTransport() {
  const baseUrl = getConfiguredApiBaseUrl();

  if (isApiMockingEnabled()) {
    return createFetchTransport();
  }

  if (!baseUrl) {
    throw new Error(`${API_BASE_URL_ENV_KEY} is not configured`);
  }

  return createFetchTransport({
    baseUrl,
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
