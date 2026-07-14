import { describe, expect, it } from "vitest";
import type { MesPresentationPolicy } from "../context/mes-context.service.js";
import type { ExtractedPresentation } from "../hermes/presentation-transcript.js";

import { materializeVisualization } from "./ai-visualization-materializer.js";

const sql = "SELECT ReportDate AS date, SUM(GoodQty) AS dailyOutput";

const policy: MesPresentationPolicy = {
  metrics: new Map([
    [
      "daily_output",
      { field: "dailyOutput", label: "Daily output", format: "integer" },
    ],
  ]),
  dimensions: new Map([
    ["date", { label: "Date", type: "temporal" }],
    ["category", { label: "Category", type: "nominal" }],
  ]),
};

describe("materializeVisualization", () => {
  it("keeps KPI and table but removes a chart for one row", () => {
    const result = materializeVisualization(
      createInput({
        rows: [{ date: "2026-07-14", dailyOutput: 12 }],
      }),
    );

    expect(result).toMatchObject({
      sourceEvidenceId: "evidence-1",
      kpis: [expect.objectContaining({ field: "dailyOutput" })],
      data: { rows: [{ date: "2026-07-14", dailyOutput: 12 }], truncated: false },
    });
    expect(result).not.toHaveProperty("chart");
  });

  it("keeps a temporal line chart for two to one hundred rows", () => {
    const result = materializeVisualization(createInput());

    expect(result?.chart).toMatchObject({ mark: "line", x: { type: "temporal" } });
  });

  it("keeps a nominal bar chart with at most twenty categories", () => {
    const result = materializeVisualization(
      createInput({
        dimension: "category",
        dimensionType: "nominal",
        mark: "bar",
        rows: [
          { category: "A", dailyOutput: 10 },
          { category: "B", dailyOutput: 12 },
        ],
      }),
    );

    expect(result?.chart).toMatchObject({ mark: "bar", x: { type: "nominal" } });
  });

  it.each([
    ["line with nominal x", { dimension: "category", dimensionType: "nominal", mark: "line" }],
    ["bar with temporal x", { dimension: "date", dimensionType: "temporal", mark: "bar" }],
    [
      "more than twenty categories",
      {
        dimension: "category",
        dimensionType: "nominal",
        mark: "bar",
        rows: Array.from({ length: 21 }, (_, index) => ({
          category: `Category ${index}`,
          dailyOutput: index,
        })),
      },
    ],
    ["empty rows", { rows: [] }],
  ])("drops the chart for %s", (_name, overrides) => {
    expect(materializeVisualization(createInput(overrides))?.chart).toBeUndefined();
  });

  it("limits rows and cell strings while marking the result truncated", () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      category: index === 0 ? "x".repeat(201) : `Category ${index}`,
      dailyOutput: index,
    }));
    const result = materializeVisualization(
      createInput({
        dimension: "category",
        dimensionType: "nominal",
        mark: "bar",
        rows,
      }),
    );

    expect(result?.data.rows).toHaveLength(100);
    expect(result?.data.rows[0]?.category).toBe("x".repeat(200));
    expect(result?.data.truncated).toBe(true);
    expect(result?.chart).toBeUndefined();
  });

  it("always removes the chart from a truncated query", () => {
    const result = materializeVisualization(createInput({ truncated: true }));

    expect(result?.data.truncated).toBe(true);
    expect(result?.chart).toBeUndefined();
  });

  it.each([
    ["unknown metric", { metricIds: ["unknown_metric"] }],
    ["unknown field", { metricField: "unknownField" }],
    ["wrong metric value type", { rows: [{ date: "2026-07-14", dailyOutput: "12" }] }],
    ["missing completed evidence", { evidenceStatus: "running" }],
    ["evidence SQL mismatch", { evidenceSql: `${sql} ` }],
  ])("returns undefined for %s", (_name, overrides) => {
    expect(materializeVisualization(createInput(overrides))).toBeUndefined();
  });

  it("shrinks rows from the tail to stay below 64 KiB", () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({
      category: `${index}-${"x".repeat(190)}`,
      dailyOutput: index,
    }));
    const result = materializeVisualization(
      createInput({
        dimension: "category",
        dimensionType: "nominal",
        mark: "bar",
        rows,
        title: "x".repeat(60_000),
      }),
    );

    expect(result).toBeDefined();
    expect(Buffer.byteLength(JSON.stringify(result), "utf8")).toBeLessThanOrEqual(
      64 * 1024,
    );
    expect(result?.data.rows.length).toBeLessThan(100);
    expect(result?.data.truncated).toBe(true);
  });

  it("selects the last fully valid request without mutating input", () => {
    const input = createInput();
    input.extracted.push(structuredClone(input.extracted[0] as ExtractedPresentation));
    input.extracted[0]!.request.metricIds = ["unknown_metric"];
    const snapshot = structuredClone(input.extracted);

    const result = materializeVisualization(input);

    expect(result).toBeDefined();
    expect(input.extracted).toEqual(snapshot);
  });
});

function createInput(overrides: Record<string, unknown> = {}) {
  const dimension = String(overrides.dimension ?? "date");
  const dimensionType = (overrides.dimensionType ?? "temporal") as
    | "temporal"
    | "nominal";
  const metricField = String(overrides.metricField ?? "dailyOutput");
  const rows = (overrides.rows ?? [
    { [dimension]: "2026-07-13", [metricField]: 10 },
    { [dimension]: "2026-07-14", [metricField]: 12 },
  ]) as Array<Record<string, unknown>>;
  const extracted: ExtractedPresentation[] = [
    {
      request: {
        specVersion: 1,
        sourceSql: sql,
        metricIds: (overrides.metricIds ?? ["daily_output"]) as string[],
        title: String(overrides.title ?? "Daily output trend"),
        kpis: [
          { field: metricField, label: "Daily output", format: "integer" },
        ],
        table: {
          columns: [
            { field: dimension, label: dimension === "date" ? "Date" : "Category", type: dimensionType },
            { field: metricField, label: "Daily output", format: "integer" },
          ],
        },
        chart: {
          mark: (overrides.mark ?? "line") as "line" | "bar",
          x: {
            field: dimension,
            label: dimension === "date" ? "Date" : "Category",
            type: dimensionType,
          },
          y: [{ field: metricField, label: "Daily output", format: "integer" }],
        },
      },
      query: {
        sql,
        columns: [dimension, metricField],
        rows,
        rowCount: rows.length,
        truncated: Boolean(overrides.truncated),
      },
    },
  ];
  return {
    extracted,
    evidence: [
      {
        id: "evidence-1",
        runId: "run-1",
        toolName: "mcp_mes_data_query_mes_data",
        sql: String(overrides.evidenceSql ?? sql),
        companyCode: "RUIHUI",
        factoryCode: "FACTORY-01",
        timeRangeStart: null,
        timeRangeEnd: null,
        dataCutoffAt: null,
        status: String(overrides.evidenceStatus ?? "completed") as "completed",
        startedAt: "2026-07-14T00:00:00.000Z",
        endedAt: "2026-07-14T00:00:01.000Z",
        durationMs: 1,
        rowCount: rows.length,
        truncated: Boolean(overrides.truncated),
        errorCode: null,
      },
    ],
    policy,
  };
}
