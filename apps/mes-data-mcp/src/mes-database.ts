import sql from "mssql";

export type MesDatabaseConfig = {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  queryTimeoutMs: 30_000;
  maxRows: 1_000;
  maxResultBytes: 2_097_152;
};

export type MesQueryResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
  truncated: boolean;
};

type MesRecordset = Record<string, unknown>[] & {
  columns: Record<string, unknown>;
};

type MesSqlResult = {
  recordset: MesRecordset;
};

type MesSqlRequest = {
  cancel(): void;
  query(command: string): Promise<MesSqlResult>;
};

type MesSqlPool = {
  connect(): Promise<unknown>;
  request(): MesSqlRequest;
};

export type MesPoolFactory = (config: sql.config) => MesSqlPool;

export class MesDatabase {
  private readonly pool: MesSqlPool;

  constructor(
    private readonly config: MesDatabaseConfig,
    poolFactory: MesPoolFactory = (connectionConfig) =>
      new sql.ConnectionPool(connectionConfig),
  ) {
    this.pool = poolFactory({
      server: config.server,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      requestTimeout: config.queryTimeoutMs,
      options: {
        encrypt: config.encrypt,
        readOnlyIntent: true,
        trustServerCertificate: config.trustServerCertificate,
      },
    });
  }

  async query(sqlText: string, signal?: AbortSignal): Promise<MesQueryResult> {
    throwIfAborted(signal);
    const startedAt = performance.now();
    const request = await this.createRequest();
    const cancelRequest = () => request.cancel();
    signal?.addEventListener("abort", cancelRequest, { once: true });

    try {
      const result = await request.query(withRowLimit(sqlText, this.config.maxRows));
      throwIfAborted(signal);
      return constrainResult(
        result.recordset,
        Math.round(performance.now() - startedAt),
        this.config,
      );
    } catch {
      throwIfAborted(signal);
      throw new Error("MES query failed");
    } finally {
      signal?.removeEventListener("abort", cancelRequest);
    }
  }

  private async createRequest(): Promise<MesSqlRequest> {
    try {
      await this.pool.connect();
      return this.pool.request();
    } catch {
      throw new Error("MES query failed");
    }
  }
}

function withRowLimit(sqlText: string, maxRows: number): string {
  return `BEGIN TRY
  SET ROWCOUNT ${maxRows + 1};
  ${sqlText}
  SET ROWCOUNT 0;
END TRY
BEGIN CATCH
  SET ROWCOUNT 0;
  THROW;
END CATCH;`;
}

function constrainResult(
  recordset: MesRecordset,
  durationMs: number,
  config: MesDatabaseConfig,
): MesQueryResult {
  const columns = Object.keys(recordset.columns);
  const rows = recordset.slice(0, config.maxRows);
  let truncated = recordset.length > rows.length;
  let result = createResult(columns, rows, durationMs, truncated);

  while (
    result.rows.length > 0 &&
    Buffer.byteLength(JSON.stringify(result), "utf8") > config.maxResultBytes
  ) {
    rows.pop();
    truncated = true;
    result = createResult(columns, rows, durationMs, truncated);
  }

  return result;
}

function createResult(
  columns: string[],
  rows: Record<string, unknown>[],
  durationMs: number,
  truncated: boolean,
): MesQueryResult {
  return {
    columns,
    rows: [...rows],
    rowCount: rows.length,
    durationMs,
    truncated,
  };
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted", "AbortError");
  }
}
