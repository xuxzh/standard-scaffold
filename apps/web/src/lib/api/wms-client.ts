import {
  createFetchTransport,
  createHttpClient,
  type Transport,
} from "@/lib/api/http-client";

const WMS_API_BASE_URL_ENV_KEY = "VITE_WMS_API_BASE_URL";

function getConfiguredWmsApiBaseUrl() {
  return import.meta.env[WMS_API_BASE_URL_ENV_KEY] as string | undefined;
}

function createDefaultWmsTransport() {
  const baseUrl = getConfiguredWmsApiBaseUrl();

  if (!baseUrl) {
    throw new Error(`${WMS_API_BASE_URL_ENV_KEY} is not configured`);
  }

  return createFetchTransport({
    baseUrl,
  });
}

let wmsTransport: Transport | undefined;

export function getWmsClient() {
  wmsTransport ??= createDefaultWmsTransport();

  return createHttpClient({
    transport: wmsTransport,
  });
}

export function setWmsTransportForTests(nextTransport: Transport) {
  wmsTransport = nextTransport;
}

export function resetWmsTransportForTests() {
  wmsTransport = undefined;
}
