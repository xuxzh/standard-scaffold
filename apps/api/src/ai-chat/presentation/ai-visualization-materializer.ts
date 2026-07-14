import {
  AI_VISUALIZATION_LIMITS,
  aiVisualizationV1Schema,
  type AiVisualizationV1,
  type MesDimensionBinding,
  type MesMetricBinding,
  type MesScalar,
} from "@repo/ai-visualization-contract";

import type { AiQueryEvidenceDto } from "../ai-chat.types.js";
import type { MesPresentationPolicy } from "../context/mes-context.service.js";
import type { ExtractedPresentation } from "../hermes/presentation-transcript.js";

export type MaterializeVisualizationInput = {
  extracted: ExtractedPresentation[];
  evidence: AiQueryEvidenceDto[];
  policy: MesPresentationPolicy;
};

export function materializeVisualization(
  input: MaterializeVisualizationInput,
): AiVisualizationV1 | undefined {
  for (let index = input.extracted.length - 1; index >= 0; index -= 1) {
    const extracted = input.extracted[index];
    if (extracted === undefined) {
      continue;
    }
    const visualization = materializeOne(extracted, input.evidence, input.policy);
    if (visualization) {
      return visualization;
    }
  }
  return undefined;
}

function materializeOne(
  extracted: ExtractedPresentation,
  evidence: readonly AiQueryEvidenceDto[],
  policy: MesPresentationPolicy,
): AiVisualizationV1 | undefined {
  const sourceEvidence = findCompletedEvidence(
    evidence,
    extracted.request.sourceSql,
  );
  if (!sourceEvidence || extracted.query.sql !== extracted.request.sourceSql) {
    return undefined;
  }

  const metrics = new Map<string, MesMetricBinding>();
  for (const metricId of extracted.request.metricIds) {
    const configured = policy.metrics.get(metricId);
    if (!configured) {
      return undefined;
    }
    metrics.set(configured.field, configured);
  }
  if (
    !extracted.request.kpis.every((binding) => matchesMetric(binding, metrics)) ||
    !extracted.request.table.columns.every((binding) =>
      "format" in binding
        ? matchesMetric(binding, metrics)
        : matchesDimension(binding, policy),
    ) ||
    (extracted.request.chart !== undefined &&
      (!matchesDimension(extracted.request.chart.x, policy) ||
        !extracted.request.chart.y.every((binding) =>
          matchesMetric(binding, metrics),
        ) ||
        (extracted.request.chart.series !== undefined &&
          !matchesDimension(extracted.request.chart.series, policy))))
  ) {
    return undefined;
  }

  const fields = new Set(extracted.request.table.columns.map((column) => column.field));
  for (const binding of extracted.request.kpis) {
    fields.add(binding.field);
  }
  if (extracted.request.chart) {
    fields.add(extracted.request.chart.x.field);
    extracted.request.chart.y.forEach((binding) => fields.add(binding.field));
    if (extracted.request.chart.series) {
      fields.add(extracted.request.chart.series.field);
    }
  }
  if (
    fields.size > AI_VISUALIZATION_LIMITS.columns ||
    [...fields].some((field) => !extracted.query.columns.includes(field))
  ) {
    return undefined;
  }

  let truncated = extracted.query.truncated ||
    extracted.query.rows.length > AI_VISUALIZATION_LIMITS.rows;
  const rows: Array<Record<string, MesScalar>> = [];
  for (const sourceRow of extracted.query.rows.slice(0, AI_VISUALIZATION_LIMITS.rows)) {
    const row: Record<string, MesScalar> = {};
    for (const field of fields) {
      const value = sourceRow[field];
      if (metrics.has(field)) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          return undefined;
        }
        row[field] = value;
        continue;
      }
      if (typeof value === "string") {
        if (value.length > AI_VISUALIZATION_LIMITS.cellStringLength) {
          truncated = true;
        }
        row[field] = value.slice(0, AI_VISUALIZATION_LIMITS.cellStringLength);
      } else if (typeof value === "number" && Number.isFinite(value)) {
        row[field] = value;
      } else if (value === null) {
        row[field] = null;
      } else {
        return undefined;
      }
    }
    rows.push(row);
  }

  const chart = shouldKeepChart(extracted, rows, policy, truncated)
    ? structuredClone(extracted.request.chart)
    : undefined;
  const visualization: AiVisualizationV1 = {
    specVersion: 1,
    sourceEvidenceId: sourceEvidence.id,
    metricIds: [...extracted.request.metricIds],
    title: extracted.request.title,
    kpis: structuredClone(extracted.request.kpis),
    table: structuredClone(extracted.request.table),
    ...(chart ? { chart } : {}),
    data: { rows, truncated },
  };

  while (
    visualization.data.rows.length > 0 &&
    serializedBytes(visualization) > AI_VISUALIZATION_LIMITS.serializedBytes
  ) {
    visualization.data.rows.pop();
    visualization.data.truncated = true;
    delete visualization.chart;
  }
  return serializedBytes(visualization) <= AI_VISUALIZATION_LIMITS.serializedBytes &&
    aiVisualizationV1Schema.safeParse(visualization).success
    ? visualization
    : undefined;
}

function shouldKeepChart(
  extracted: ExtractedPresentation,
  rows: readonly Record<string, MesScalar>[],
  policy: MesPresentationPolicy,
  truncated: boolean,
): boolean {
  const chart = extracted.request.chart;
  if (!chart || truncated || rows.length < 2) {
    return false;
  }
  if (
    (chart.mark === "line" && chart.x.type !== "temporal") ||
    (chart.mark === "bar" && chart.x.type !== "nominal") ||
    (chart.series !== undefined && chart.series.type !== "nominal")
  ) {
    return false;
  }
  const dimension = policy.dimensions.get(chart.x.field);
  if (!dimension || dimension.type !== chart.x.type) {
    return false;
  }
  if (
    chart.x.type === "nominal" &&
    distinctValues(rows, chart.x.field) > AI_VISUALIZATION_LIMITS.categories
  ) {
    return false;
  }
  return chart.series === undefined ||
    distinctValues(rows, chart.series.field) <= AI_VISUALIZATION_LIMITS.categories;
}

function distinctValues(
  rows: readonly Record<string, MesScalar>[],
  field: string,
): number {
  return new Set(rows.map((row) => row[field])).size;
}

function matchesMetric(
  binding: MesMetricBinding,
  metrics: ReadonlyMap<string, MesMetricBinding>,
): boolean {
  const configured = metrics.get(binding.field);
  return configured !== undefined &&
    configured.label === binding.label &&
    configured.format === binding.format;
}

function matchesDimension(
  binding: MesDimensionBinding,
  policy: MesPresentationPolicy,
): boolean {
  const configured = policy.dimensions.get(binding.field);
  return configured !== undefined &&
    configured.label === binding.label &&
    configured.type === binding.type;
}

function findCompletedEvidence(
  evidence: readonly AiQueryEvidenceDto[],
  sql: string,
): AiQueryEvidenceDto | undefined {
  for (let index = evidence.length - 1; index >= 0; index -= 1) {
    const item = evidence[index];
    if (
      item?.status === "completed" &&
      isQueryTool(item.toolName) &&
      item.sql === sql
    ) {
      return item;
    }
  }
  return undefined;
}

function isQueryTool(toolName: string): boolean {
  return toolName === "mcp__mes_data__query_mes_data" ||
    toolName === "mcp_mes_data_query_mes_data";
}

function serializedBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}
