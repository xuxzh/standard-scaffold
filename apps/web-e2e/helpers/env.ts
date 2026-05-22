import { config as loadEnv } from "dotenv";

loadEnv();

export type E2EMode = "local" | "staging";

const DEFAULT_BASE_URL = "http://127.0.0.1:4173";

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
