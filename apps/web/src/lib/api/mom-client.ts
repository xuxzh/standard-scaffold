import {
  createFetchTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken } from "@/lib/auth/token-store";
import { isApiMockingEnabled } from "@/mocks/config";

const MOM_API_BASE_URL_ENV_KEY = "VITE_MOM_API_BASE_URL";

function getConfiguredMomApiBaseUrl() {
  return import.meta.env[MOM_API_BASE_URL_ENV_KEY] as string | undefined;
}

function createDefaultMomTransport() {
  const baseUrl = getConfiguredMomApiBaseUrl();

  if (isApiMockingEnabled()) {
    return createFetchTransport();
  }

  if (!baseUrl) {
    throw new Error(`${MOM_API_BASE_URL_ENV_KEY} is not configured`);
  }

  return createFetchTransport({
    baseUrl,
    getToken: getAccessToken,
  });
}

let momTransport: Transport | undefined;

export function getMomClient() {
  momTransport ??= createDefaultMomTransport();

  return createHttpClient({
    transport: momTransport,
    handleUnauthorized: handleUnauthorizedSession,
  });
}

export function setMomTransportForTests(nextTransport: Transport) {
  momTransport = nextTransport;
}

export function resetMomTransportForTests() {
  momTransport = undefined;
}
