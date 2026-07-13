import { describe, expect, it, vi } from "vitest";

import {
  createMesToolHandlers,
  describeMesSchemaInputSchema,
  queryMesDataInputSchema,
} from "./tools.js";

describe("MES MCP tool schemas", () => {
  it("accepts only an optional schema for describe_mes_schema", () => {
    expect(describeMesSchemaInputSchema.parse({ schema: "dbo" })).toEqual({
      schema: "dbo",
    });
    expect(() =>
      describeMesSchemaInputSchema.parse({ schema: "dbo", server: "attacker" }),
    ).toThrow();
  });

  it("accepts only SQL for query_mes_data", () => {
    expect(queryMesDataInputSchema.parse({ sql: "SELECT 1" })).toEqual({
      sql: "SELECT 1",
    });
    expect(() =>
      queryMesDataInputSchema.parse({
        sql: "SELECT 1",
        database: "master",
        user: "sa",
        password: "override",
      }),
    ).toThrow();
  });
});

describe("MES MCP tool handlers", () => {
  it("returns query results as JSON text content", async () => {
    const result = {
      columns: ["value"],
      rows: [{ value: 1 }],
      rowCount: 1,
      durationMs: 5,
      truncated: false,
    };
    const database = { query: vi.fn().mockResolvedValue(result) };
    const handlers = createMesToolHandlers(database);

    const response = await handlers.queryMesData({ sql: "SELECT 1" });

    expect(response).toEqual({
      content: [{ type: "text", text: JSON.stringify(result) }],
    });
  });

  it("describes tables, views, columns, and foreign keys in an authorized schema", async () => {
    const database = {
      query: vi.fn().mockResolvedValue({
        columns: [],
        rows: [],
        rowCount: 0,
        durationMs: 1,
        truncated: false,
      }),
    };
    const handlers = createMesToolHandlers(database);

    await handlers.describeMesSchema({ schema: "ops'floor" });

    const sql = database.query.mock.calls[0]?.[0] as string;
    expect(sql).toContain("INFORMATION_SCHEMA.TABLES");
    expect(sql).toContain("INFORMATION_SCHEMA.COLUMNS");
    expect(sql).toContain("REFERENTIAL_CONSTRAINTS");
    expect(sql).toContain("KEY_COLUMN_USAGE");
    expect(sql).toContain("ops''floor");
  });
});
