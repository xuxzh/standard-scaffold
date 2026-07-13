import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it, vi } from "vitest";

import { loadMesDatabaseConfig } from "./config.js";
import {
  MesDatabase,
  type MesDatabaseConfig,
  type MesPoolFactory,
} from "./mes-database.js";

const VALID_ENV = {
  MES_DB_SERVER: "192.168.0.20",
  MES_DB_PORT: "1433",
  MES_DB_DATABASE: "MES",
  MES_DB_USER: "mes_ai_reader",
  MES_DB_PASSWORD: "secret-password",
  MES_DB_ENCRYPT: "true",
  MES_DB_TRUST_SERVER_CERTIFICATE: "false",
} as const;

const CONFIG: MesDatabaseConfig = {
  server: "192.168.0.20",
  port: 1433,
  database: "MES",
  user: "mes_ai_reader",
  password: "secret-password",
  encrypt: true,
  trustServerCertificate: false,
  queryTimeoutMs: 30_000,
  maxRows: 1_000,
  maxResultBytes: 2_097_152,
};

const execFileAsync = promisify(execFile);

describe("loadMesDatabaseConfig", () => {
  it.each(Object.keys(VALID_ENV))("rejects a missing %s value", (key) => {
    const env = { ...VALID_ENV };
    delete env[key as keyof typeof env];

    expect(() => loadMesDatabaseConfig(env)).toThrow(`${key} is required`);
  });

  it("loads connection settings and applies fixed resource limits", () => {
    expect(loadMesDatabaseConfig({ ...VALID_ENV, UNRELATED_SECRET: "ignored" })).toEqual(
      CONFIG,
    );
  });
});

describe("MesDatabase", () => {
  it("constructs the default MSSQL connection pool in a native ESM runtime", async () => {
    const script = `
      import { MesDatabase } from "./src/mes-database.ts";
      new MesDatabase(${JSON.stringify(CONFIG)});
    `;

    await expect(
      execFileAsync(
        process.execPath,
        ["--import", "tsx", "--input-type=module", "--eval", script],
        { cwd: new URL("..", import.meta.url) },
      ),
    ).resolves.toMatchObject({ stderr: "" });
  });

  it("enables read-only intent and the 30 second request timeout", async () => {
    let receivedConfig: unknown;
    const { database, request } = createDatabase([], (config) => {
      receivedConfig = config;
    });

    await database.query("SELECT 1");

    expect(receivedConfig).toMatchObject({
      server: CONFIG.server,
      database: CONFIG.database,
      requestTimeout: 30_000,
      options: {
        readOnlyIntent: true,
        encrypt: true,
        trustServerCertificate: false,
      },
    });
    expect(request.query).toHaveBeenCalledWith(
      expect.stringContaining("SET ROWCOUNT 1001"),
    );
  });

  it("returns at most 1,000 rows and marks the result truncated", async () => {
    const rows = Array.from({ length: 1_001 }, (_, index) => ({ value: index }));
    const { database } = createDatabase(rows);

    const result = await database.query("SELECT value FROM dbo.Measurements");

    expect(result.rows).toHaveLength(1_000);
    expect(result.rowCount).toBe(1_000);
    expect(result.truncated).toBe(true);
  });

  it("keeps the serialized result within 2 MiB", async () => {
    const rows = [
      { value: "a".repeat(1_100_000) },
      { value: "b".repeat(1_100_000) },
    ];
    const { database } = createDatabase(rows);

    const result = await database.query("SELECT value FROM dbo.LargeRows");

    expect(Buffer.byteLength(JSON.stringify(result), "utf8")).toBeLessThanOrEqual(
      CONFIG.maxResultBytes,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.truncated).toBe(true);
  });

  it("removes MSSQL connection details from query failures", async () => {
    const { database } = createDatabase([], undefined, {
      queryError: new Error(
        "Login failed for mes_ai_reader with secret-password at 192.168.0.20",
      ),
    });

    const error = await database.query("SELECT 1").catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("MES query failed");
    expect(JSON.stringify(error)).not.toContain("secret-password");
    expect(JSON.stringify(error)).not.toContain("192.168.0.20");
  });

  it("cancels the active request when the signal aborts", async () => {
    const controller = new AbortController();
    const { database, request } = createDatabase([], undefined, { pending: true });

    const query = database.query("SELECT 1", controller.signal);
    await vi.waitFor(() => expect(request.query).toHaveBeenCalledOnce());
    controller.abort();

    await expect(query).rejects.toMatchObject({ name: "AbortError" });
    expect(request.cancel).toHaveBeenCalledOnce();
  });
});

function createDatabase(
  rows: Record<string, unknown>[],
  onConfig?: (config: unknown) => void,
  options: { pending?: boolean; queryError?: Error } = {},
) {
  const recordset = Object.assign(rows, {
    columns: Object.fromEntries(
      Object.keys(rows[0] ?? { value: null }).map((name) => [name, {}]),
    ),
  });
  const request = {
    cancel: vi.fn(),
    query: vi.fn(() => {
      if (options.queryError) {
        return Promise.reject(options.queryError);
      }
      if (options.pending) {
        return new Promise<never>((_resolve, reject) => {
          request.cancel.mockImplementation(() => {
            reject(new Error("cancelled"));
          });
        });
      }
      return Promise.resolve({
        recordsets: [recordset],
        recordset,
        rowsAffected: [rows.length],
        output: {},
      });
    }),
  };
  const pool = {
    connect: vi.fn().mockResolvedValue(undefined),
    request: vi.fn(() => request),
  };
  const poolFactory: MesPoolFactory = (config) => {
    onConfig?.(config);
    return pool;
  };

  return { database: new MesDatabase(CONFIG, poolFactory), request };
}
