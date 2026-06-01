import {
  createFetchTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";
import { handleUnauthorizedSession } from "@/lib/auth/auth-session";
import { getAccessToken } from "@/lib/auth/token-store";
import { isApiMockingEnabled } from "@/mocks/config";

const MES_API_BASE_URL_ENV_KEY = "VITE_MES_API_BASE_URL";

function getConfiguredMesApiBaseUrl() {
  return import.meta.env[MES_API_BASE_URL_ENV_KEY] as string | undefined;
}

function createDefaultMesTransport() {
  const baseUrl = getConfiguredMesApiBaseUrl();

  if (isApiMockingEnabled()) {
    return createFetchTransport();
  }

  if (!baseUrl) {
    throw new Error(`${MES_API_BASE_URL_ENV_KEY} is not configured`);
  }

  return createFetchTransport({
    baseUrl,
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
