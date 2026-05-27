import { config as loadEnv } from "dotenv";

loadEnv();

export type E2EMode = "local" | "staging";

const DEFAULT_BASE_URL = "http://127.0.0.1:4173";
const LOCAL_NO_PROXY_ENTRIES = ["127.0.0.1", "localhost"];

function mergeNoProxyEntries(existingValue: string | undefined) {
  const entries = (existingValue ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of LOCAL_NO_PROXY_ENTRIES) {
    if (!entries.includes(entry)) {
      entries.push(entry);
    }
  }

  return entries.join(",");
}

function ensureLocalNoProxy() {
  process.env.NO_PROXY = mergeNoProxyEntries(process.env.NO_PROXY);
  process.env.no_proxy = mergeNoProxyEntries(process.env.no_proxy);
}

export function getE2EMode(): E2EMode {
  return process.env.E2E_MODE === "staging" ? "staging" : "local";
}

export function getBaseURL(): string {
  if (getE2EMode() === "staging") {
    const stagingBaseURL = process.env.E2E_BASE_URL;

    if (!stagingBaseURL) {
      throw new Error("E2E_BASE_URL is required when E2E_MODE=staging");
    }

    return stagingBaseURL;
  }

  return process.env.E2E_BASE_URL ?? DEFAULT_BASE_URL;
}

export function isLocalMode() {
  return getE2EMode() === "local";
}

export function shouldUseApiMocks() {
  return isLocalMode() && process.env.E2E_USE_API_MOCKS === "true";
}

if (isLocalMode()) {
  ensureLocalNoProxy();
}
