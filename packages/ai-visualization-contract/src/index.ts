import { z } from "zod";

export const AI_VISUALIZATION_LIMITS = {
  kpis: 4,
  columns: 12,
  rows: 100,
  serializedBytes: 64 * 1024,
  charts: 1,
  numericSeries: 5,
  categories: 20,
  cellStringLength: 200,
} as const;

const fieldNameSchema = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);
const nonEmptyStringSchema = z.string().trim().min(1);

const mesFieldBindingSchema = z
  .object({
    field: fieldNameSchema,
    label: nonEmptyStringSchema,
  })
  .strict();

export const mesMetricBindingSchema = mesFieldBindingSchema
  .extend({
    format: z.enum(["integer", "decimal", "percent"]),
  })
  .strict();

export const mesDimensionBindingSchema = mesFieldBindingSchema
  .extend({
    type: z.enum(["temporal", "nominal"]),
  })
  .strict();

const tableSchema = z
  .object({
    columns: z
      .array(z.union([mesMetricBindingSchema, mesDimensionBindingSchema]))
      .min(1)
      .max(AI_VISUALIZATION_LIMITS.columns),
  })
  .strict();

const chartSchema = z
  .object({
    mark: z.enum(["line", "bar"]),
    x: mesDimensionBindingSchema,
    y: z
      .array(mesMetricBindingSchema)
      .min(1)
      .max(AI_VISUALIZATION_LIMITS.numericSeries),
    series: mesDimensionBindingSchema.optional(),
  })
  .strict()
  .refine((chart) => chart.series === undefined || chart.y.length === 1, {
    message: "A series binding requires exactly one numeric field.",
    path: ["series"],
  });

export const mesPresentationRequestV1Schema = z
  .object({
    specVersion: z.literal(1),
    sourceSql: nonEmptyStringSchema,
    metricIds: z.array(nonEmptyStringSchema).min(1),
    title: nonEmptyStringSchema,
    kpis: z.array(mesMetricBindingSchema).max(AI_VISUALIZATION_LIMITS.kpis),
    table: tableSchema,
    chart: chartSchema.optional(),
  })
  .strict();

export const mesScalarSchema = z.union([
  z.string().max(AI_VISUALIZATION_LIMITS.cellStringLength),
  z.number().finite(),
  z.null(),
]);

const visualizationDataSchema = z
  .object({
    rows: z
      .array(z.record(fieldNameSchema, mesScalarSchema))
      .max(AI_VISUALIZATION_LIMITS.rows),
    truncated: z.boolean(),
  })
  .strict();

export const aiVisualizationV1Schema = z
  .object({
    specVersion: z.literal(1),
    sourceEvidenceId: nonEmptyStringSchema,
    metricIds: z.array(nonEmptyStringSchema).min(1),
    title: nonEmptyStringSchema,
    kpis: z.array(mesMetricBindingSchema).max(AI_VISUALIZATION_LIMITS.kpis),
    table: tableSchema,
    chart: chartSchema.optional(),
    data: visualizationDataSchema,
  })
  .strict();

export type MesScalar = z.infer<typeof mesScalarSchema>;
export type MesValueFormat = "integer" | "decimal" | "percent";
export type MesFieldBinding = z.infer<typeof mesFieldBindingSchema>;
export type MesMetricBinding = z.infer<typeof mesMetricBindingSchema>;
export type MesDimensionBinding = z.infer<typeof mesDimensionBindingSchema>;
export type MesPresentationRequestV1 = z.infer<
  typeof mesPresentationRequestV1Schema
>;
export type AiVisualizationV1 = z.infer<typeof aiVisualizationV1Schema>;
