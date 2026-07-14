import type { AiVisualizationV1 } from "@repo/ai-visualization-contract";
import type { TopLevelSpec } from "vega-lite";

export function compileVegaLiteSpec(
  visualization: AiVisualizationV1,
): TopLevelSpec | undefined {
  const chart = visualization.chart;
  if (!chart) {
    return undefined;
  }
  const values = visualization.data.rows.flatMap((row) =>
    chart.y.map((metric) => ({
      x: row[chart.x.field],
      series: chart.series ? row[chart.series.field] : metric.label,
      value: row[metric.field],
    })),
  );

  return {
    description: visualization.title,
    width: "container",
    height: 220,
    autosize: { type: "fit", contains: "padding", resize: true },
    data: { values },
    mark: { type: chart.mark, tooltip: true },
    encoding: {
      x: {
        field: "x",
        type: chart.x.type,
        title: chart.x.label,
      },
      y: {
        field: "value",
        type: "quantitative",
        title: chart.y.length === 1 ? chart.y[0]?.label : undefined,
      },
      color: {
        field: "series",
        type: "nominal",
        title: chart.series?.label,
      },
      tooltip: [
        { field: "x", type: chart.x.type, title: chart.x.label },
        { field: "series", type: "nominal", title: chart.series?.label ?? "Series" },
        { field: "value", type: "quantitative", title: "Value" },
      ],
    },
  };
}
