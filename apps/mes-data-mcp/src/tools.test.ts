import { describe, expect, it, vi } from "vitest";
import type { MesPresentationRequestV1 } from "@repo/ai-visualization-contract";

import {
  createMesToolHandlers,
  describeMesSchemaInputSchema,
  presentMesResultInputSchema,
  queryMesDataInputSchema,
} from "./tools.js";

const validPresentationRequest = {
  specVersion: 1,
  sourceSql: "SELECT ReportDate AS date, SUM(GoodQty) AS dailyOutput",
  metricIds: ["daily_output"],
  title: "Daily output trend",
  kpis: [],
  table: {
    columns: [
      { field: "date", label: "Date", type: "temporal" },
      { field: "dailyOutput", label: "Daily output", format: "integer" },
    ],
  },
  chart: {
    mark: "line",
    x: { field: "date", label: "Date", type: "temporal" },
    y: [
      { field: "dailyOutput", label: "Daily output", format: "integer" },
    ],
  },
} satisfies MesPresentationRequestV1;

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

  it("accepts only a controlled present_mes_result request", () => {
    expect(presentMesResultInputSchema.parse(validPresentationRequest)).toEqual(
      validPresentationRequest,
    );
    expect(() =>
      presentMesResultInputSchema.parse({
        ...validPresentationRequest,
        chart: { ...validPresentationRequest.chart, mark: "pie" },
      }),
    ).toThrow();
    expect(() =>
      presentMesResultInputSchema.parse({
        ...validPresentationRequest,
        data: { rows: [] },
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

  it("accepts a presentation without querying the database", async () => {
    const database = { query: vi.fn() };
    const handlers = createMesToolHandlers(database);

    await expect(
      handlers.presentMesResult(validPresentationRequest),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            accepted: true,
            request: validPresentationRequest,
          }),
        },
      ],
    });
    expect(database.query).not.toHaveBeenCalled();
  });
});
