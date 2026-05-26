import {
  createFetchTransport,
  createHttpClient,
  createMockTransport,
  type Transport,
  type TransportRequest,
} from "@/lib/api/http-client";
import { dashboardStatsResponse } from "@/features/dashboard/dashboard-contract";

function delay(durationMs: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      resolve();
    }, durationMs);

    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeoutId);
        reject(new DOMException("The operation was aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

async function handleDashboardStats(request: TransportRequest) {
  await delay(120, request.signal);

  return {
    status: 200,
    data: dashboardStatsResponse,
  };
}

const defaultTransport = createMockTransport({
  "GET /dashboard/stats": handleDashboardStats,
});

function getConfiguredApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL as string | undefined;
}

function createDefaultAppTransport() {
  const apiBaseUrl = getConfiguredApiBaseUrl();

  if (apiBaseUrl) {
    return createFetchTransport({
      baseUrl: apiBaseUrl,
    });
  }

  return defaultTransport;
}

let appTransport: Transport = createDefaultAppTransport();

export function getAppClient() {
  return createHttpClient({ transport: appTransport });
}

export function setAppTransportForTests(nextTransport: Transport) {
  appTransport = nextTransport;
}

export function resetAppTransportForTests() {
  appTransport = createDefaultAppTransport();
}
