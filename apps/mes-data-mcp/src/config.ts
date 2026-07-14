import type { MesDatabaseConfig } from "./mes-database.js";

const REQUIRED_ENV_KEYS = [
  "MES_DB_SERVER",
  "MES_DB_PORT",
  "MES_DB_DATABASE",
  "MES_DB_USER",
  "MES_DB_PASSWORD",
  "MES_DB_ENCRYPT",
  "MES_DB_TRUST_SERVER_CERTIFICATE",
] as const;

type MesDatabaseEnvKey = (typeof REQUIRED_ENV_KEYS)[number];

export function loadMesDatabaseConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): MesDatabaseConfig {
  const values = Object.fromEntries(
    REQUIRED_ENV_KEYS.map((key) => [key, requireValue(env, key)]),
  ) as Record<MesDatabaseEnvKey, string>;

  return {
    server: values.MES_DB_SERVER,
    port: parsePort(values.MES_DB_PORT),
    database: values.MES_DB_DATABASE,
    user: values.MES_DB_USER,
    password: values.MES_DB_PASSWORD,
    encrypt: parseBoolean(values.MES_DB_ENCRYPT, "MES_DB_ENCRYPT"),
    trustServerCertificate: parseBoolean(
      values.MES_DB_TRUST_SERVER_CERTIFICATE,
      "MES_DB_TRUST_SERVER_CERTIFICATE",
    ),
    queryTimeoutMs: 30_000,
    maxRows: 1_000,
    maxResultBytes: 2_097_152,
  };
}

function requireValue(
  env: Readonly<Record<string, string | undefined>>,
  key: MesDatabaseEnvKey,
): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("MES_DB_PORT must be an integer between 1 and 65535");
  }
  return port;
}

function parseBoolean(value: string, key: MesDatabaseEnvKey): boolean {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`${key} must be true or false`);
}
