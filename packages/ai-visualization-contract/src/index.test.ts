import { describe, expect, it } from "vitest";

import {
  aiVisualizationV1Schema,
  mesPresentationRequestV1Schema,
} from "./index";

const tableOnlyRequest = {
  specVersion: 1,
  sourceSql: "SELECT SUM(GoodQty) AS dailyOutput",
  metricIds: ["daily_output"],
  title: "Daily output",
  kpis: [
    { field: "dailyOutput", label: "Daily output", format: "integer" },
  ],
  table: {
    columns: [
      { field: "dailyOutput", label: "Daily output", format: "integer" },
    ],
  },
} as const;

const lineRequest = {
  specVersion: 1,
  sourceSql:
    "SELECT ReportDate AS date, SUM(GoodQty) AS dailyOutput FROM Report GROUP BY ReportDate",
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
} as const;

const barRequest = {
  ...lineRequest,
  title: "Output by category",
  table: {
    columns: [
      { field: "category", label: "Category", type: "nominal" },
      { field: "dailyOutput", label: "Daily output", format: "integer" },
    ],
  },
  chart: {
    mark: "bar",
    x: { field: "category", label: "Category", type: "nominal" },
    y: [
      { field: "dailyOutput", label: "Daily output", format: "integer" },
    ],
  },
} as const;

describe("mesPresentationRequestV1Schema", () => {
  it.each([
    ["table-only request", tableOnlyRequest],
    ["line request", lineRequest],
    ["bar request", barRequest],
  ])("accepts a valid %s", (_name, request) => {
    expect(mesPresentationRequestV1Schema.safeParse(request).success).toBe(true);
  });

  it.each([
    [
      "unsupported chart mark",
      { ...barRequest, chart: { ...barRequest.chart, mark: "pie" } },
    ],
    ["unknown property", { ...tableOnlyRequest, color: "red" }],
    [
      "more than five numeric series",
      {
        ...lineRequest,
        chart: {
          ...lineRequest.chart,
          y: Array.from({ length: 6 }, (_, index) => ({
            field: `value${index}`,
            label: `Value ${index}`,
            format: "integer",
          })),
        },
      },
    ],
    [
      "series with multiple numeric fields",
      {
        ...lineRequest,
        chart: {
          ...lineRequest.chart,
          y: [
            ...lineRequest.chart.y,
            { field: "scrapQty", label: "Scrap quantity", format: "integer" },
          ],
          series: { field: "series", label: "Series", type: "nominal" },
        },
      },
    ],
    [
      "more than four KPIs",
      {
        ...tableOnlyRequest,
        kpis: Array.from({ length: 5 }, (_, index) => ({
          field: `value${index}`,
          label: `Value ${index}`,
          format: "integer",
        })),
      },
    ],
    [
      "more than twelve columns",
      {
        ...tableOnlyRequest,
        table: {
          columns: Array.from({ length: 13 }, (_, index) => ({
            field: `value${index}`,
            label: `Value ${index}`,
            format: "integer",
          })),
        },
      },
    ],
    ["empty metric IDs", { ...tableOnlyRequest, metricIds: [] }],
    [
      "invalid field name",
      {
        ...tableOnlyRequest,
        kpis: [{ field: "daily-output", label: "Daily output", format: "integer" }],
      },
    ],
  ])("rejects %s", (_name, request) => {
    expect(mesPresentationRequestV1Schema.safeParse(request).success).toBe(false);
  });
});

describe("aiVisualizationV1Schema", () => {
  const visualization = {
    specVersion: 1,
    sourceEvidenceId: "evidence-1",
    metricIds: tableOnlyRequest.metricIds,
    title: tableOnlyRequest.title,
    kpis: tableOnlyRequest.kpis,
    table: tableOnlyRequest.table,
    data: {
      rows: [{ dailyOutput: 42, note: null }],
      truncated: false,
    },
  } as const;

  it("accepts finite scalar row values", () => {
    expect(aiVisualizationV1Schema.safeParse(visualization).success).toBe(true);
  });

  it.each([
    ["a string longer than 200 characters", "x".repeat(201)],
    ["NaN", Number.NaN],
    ["positive infinity", Number.POSITIVE_INFINITY],
    ["negative infinity", Number.NEGATIVE_INFINITY],
  ])("rejects %s in a data cell", (_name, value) => {
    expect(
      aiVisualizationV1Schema.safeParse({
        ...visualization,
        data: { ...visualization.data, rows: [{ dailyOutput: value }] },
      }).success,
    ).toBe(false);
  });
});
