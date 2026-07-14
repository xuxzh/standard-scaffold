import { describe, expect, it } from "vitest";
import type { AiVisualizationV1 } from "@repo/ai-visualization-contract";

import { compileVegaLiteSpec } from "./vega-lite-spec";

describe("compileVegaLiteSpec", () => {
  it.each([
    ["line", "temporal"],
    ["bar", "nominal"],
  ] as const)("compiles a controlled %s chart", (mark, type) => {
    const spec = compileVegaLiteSpec(visualization(mark, type));

    expect(spec).toMatchObject({
      mark: { type: mark, tooltip: true },
      data: { values: expect.any(Array) },
      encoding: {
        x: { field: "x", type },
        y: { field: "value", type: "quantitative" },
        color: { field: "series", type: "nominal" },
      },
    });
    expectForbiddenKeys(spec);
  });

  it("normalizes multiple y fields into series rows", () => {
    const input = visualization("line", "temporal");
    input.metricIds.push("completed_orders");
    input.chart!.y.push({
      field: "completedOrders",
      label: "Completed orders",
      format: "integer",
    });
    input.data.rows = [
      { date: "2026-07-14", dailyOutput: 12, completedOrders: 3 },
    ];

    expect(compileVegaLiteSpec(input)).toMatchObject({
      data: {
        values: [
          { x: "2026-07-14", series: "Daily output", value: 12 },
          { x: "2026-07-14", series: "Completed orders", value: 3 },
        ],
      },
    });
  });

  it("uses the declared series field for a single y field", () => {
    const input = visualization("bar", "nominal");
    input.chart!.series = { field: "series", label: "Series", type: "nominal" };
    input.data.rows = [
      { category: "A", series: "Day", dailyOutput: 12 },
    ];

    expect(compileVegaLiteSpec(input)).toMatchObject({
      data: { values: [{ x: "A", series: "Day", value: 12 }] },
    });
  });

  it("returns undefined when there is no chart", () => {
    const input = visualization("line", "temporal");
    delete input.chart;

    expect(compileVegaLiteSpec(input)).toBeUndefined();
  });
});

function visualization(
  mark: "line" | "bar",
  type: "temporal" | "nominal",
): AiVisualizationV1 {
  const field = type === "temporal" ? "date" : "category";
  return {
    specVersion: 1,
    sourceEvidenceId: "evidence-1",
    metricIds: ["daily_output"],
    title: "User title must not become a field",
    kpis: [],
    table: {
      columns: [
        { field, label: "User label", type },
        { field: "dailyOutput", label: "Daily output", format: "integer" },
      ],
    },
    chart: {
      mark,
      x: { field, label: "User label", type },
      y: [{ field: "dailyOutput", label: "Daily output", format: "integer" }],
    },
    data: {
      rows: [
        { [field]: type === "temporal" ? "2026-07-14" : "A", dailyOutput: 12 },
      ],
      truncated: false,
    },
  };
}

function expectForbiddenKeys(value: unknown): void {
  if (typeof value === "string") {
    expect(value).not.toMatch(/^https?:\/\//);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    expect(["url", "href", "expr", "transform", "calculate", "signal"]).not.toContain(key);
    expectForbiddenKeys(nested);
  }
}
