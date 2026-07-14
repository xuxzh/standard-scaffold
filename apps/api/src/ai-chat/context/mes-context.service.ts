import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse, stringify } from "yaml";

const STRUCTURED_FILES = [
  "assistant.yaml",
  "database-schema.yaml",
  "glossary.yaml",
  "metrics.yaml",
] as const;
const CONTEXT_FILES = [...STRUCTURED_FILES, "prompt.md"].sort();
const REQUIRED_METRICS = [
  "daily_output",
  "daily_completed_work_orders",
] as const;
const PRESENTATION_FIELD_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

type StructuredFileName = (typeof STRUCTURED_FILES)[number];

export type MesConversationScope = {
  companyCode: string;
  factoryCode: string;
  userKey: string;
  userName?: string;
  now: Date;
};

export type CompiledMesContext = {
  version: string;
  systemPrompt: string;
};

export type MesPresentationPolicy = {
  metrics: ReadonlyMap<
    string,
    {
      field: string;
      label: string;
      format: "integer" | "decimal" | "percent";
    }
  >;
  dimensions: ReadonlyMap<
    string,
    {
      label: string;
      type: "temporal" | "nominal";
    }
  >;
};

type LoadedMesContext = {
  assistant: Readonly<Record<string, unknown>>;
  databaseSchema: Readonly<Record<string, unknown>>;
  glossary: Readonly<Record<string, unknown>>;
  metrics: Readonly<Record<string, unknown>>;
  prompt: string;
};

export class MesContextService {
  private readonly context: LoadedMesContext;
  private readonly presentationPolicy: MesPresentationPolicy;
  private readonly version: string;

  constructor(
    configDirectory = fileURLToPath(
      new URL("../../../config/ai/mes", import.meta.url),
    ),
  ) {
    const contents = new Map(
      CONTEXT_FILES.map((fileName) => [
        fileName,
        readRequiredFile(configDirectory, fileName),
      ]),
    );
    const structured = Object.fromEntries(
      STRUCTURED_FILES.map((fileName) => [
        fileName,
        parseStructuredFile(fileName, requireMapValue(contents, fileName)),
      ]),
    ) as Record<StructuredFileName, Readonly<Record<string, unknown>>>;
    const prompt = requireMapValue(contents, "prompt.md").trim();
    if (!prompt) {
      throw new Error("Invalid MES context structure: prompt.md");
    }

    this.context = deepFreeze({
      assistant: structured["assistant.yaml"],
      databaseSchema: structured["database-schema.yaml"],
      glossary: structured["glossary.yaml"],
      metrics: structured["metrics.yaml"],
      prompt,
    });
    this.presentationPolicy = buildPresentationPolicy(
      structured["metrics.yaml"],
    );
    this.version = calculateVersion(contents);
  }

  compile(scope: MesConversationScope): CompiledMesContext {
    validateScope(scope);

    return {
      version: this.version,
      systemPrompt: [
        this.context.prompt,
        "## Mandatory runtime scope",
        `- companyCode: ${scope.companyCode}`,
        `- factoryCode: ${scope.factoryCode}`,
        `- userKey: ${scope.userKey}`,
        `- userName: ${scope.userName ?? "not provided"}`,
        `- timezone: ${String(this.context.assistant.timezone)}`,
        `- currentTime: ${scope.now.toISOString()}`,
        "- Every query must filter by both companyCode and factoryCode.",
        "- Database access is read-only; never write, alter schema, or execute procedures.",
        "## Assistant policy",
        stringify(this.context.assistant).trim(),
        "## Authorized database schema",
        stringify(this.context.databaseSchema).trim(),
        "## Metric definitions",
        stringify(this.context.metrics).trim(),
        "## Business glossary",
        stringify(this.context.glossary).trim(),
      ].join("\n\n"),
    };
  }

  getPresentationPolicy(): MesPresentationPolicy {
    return this.presentationPolicy;
  }
}

function readRequiredFile(directory: string, fileName: string): string {
  try {
    return readFileSync(join(directory, fileName), "utf8");
  } catch {
    throw new Error(`MES context file is required: ${fileName}`);
  }
}

function parseStructuredFile(
  fileName: StructuredFileName,
  content: string,
): Readonly<Record<string, unknown>> {
  let value: unknown;
  try {
    value = parse(content);
  } catch {
    throw new Error(`Invalid MES context file: ${fileName}`);
  }

  if (!isRecord(value) || !isValidStructure(fileName, value)) {
    throw new Error(`Invalid MES context structure: ${fileName}`);
  }
  return deepFreeze(value);
}

function isValidStructure(
  fileName: StructuredFileName,
  value: Record<string, unknown>,
): boolean {
  switch (fileName) {
    case "assistant.yaml":
      return isValidAssistant(value);
    case "database-schema.yaml":
      return isValidDatabaseSchema(value);
    case "metrics.yaml":
      return isValidMetrics(value);
    case "glossary.yaml":
      return isValidGlossary(value);
  }
}

function isValidAssistant(value: Record<string, unknown>): boolean {
  const constraints = value.queryConstraints;
  return (
    isNonEmptyString(value.role) &&
    value.timezone === "Asia/Shanghai" &&
    isNonEmptyStringArray(value.answerRequirements) &&
    isRecord(constraints) &&
    constraints.readOnly === true &&
    constraints.requireTenantFilters === true
  );
}

function isValidDatabaseSchema(value: Record<string, unknown>): boolean {
  return (
    isNonEmptyString(value.database) &&
    Array.isArray(value.schemas) &&
    value.schemas.length > 0 &&
    value.schemas.every(
      (schema) =>
        isRecord(schema) &&
        isNonEmptyString(schema.name) &&
        Array.isArray(schema.objects) &&
        schema.objects.length > 0 &&
        schema.objects.every(isValidDatabaseObject),
    )
  );
}

function isValidDatabaseObject(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    (value.type === "table" || value.type === "view") &&
    typeof value.sensitive === "boolean" &&
    Array.isArray(value.columns) &&
    value.columns.length > 0 &&
    value.columns.every(
      (column) =>
        isRecord(column) &&
        isNonEmptyString(column.name) &&
        isNonEmptyString(column.type) &&
        typeof column.sensitive === "boolean",
    )
  );
}

function isValidMetrics(value: Record<string, unknown>): boolean {
  if (!Array.isArray(value.metrics) || value.metrics.length < 2) {
    return false;
  }
  if (!value.metrics.every(isValidMetric)) {
    return false;
  }
  if (
    !Array.isArray(value.presentationDimensions) ||
    value.presentationDimensions.length === 0 ||
    !value.presentationDimensions.every(isValidPresentationDimension)
  ) {
    return false;
  }
  const metricIds = new Set(value.metrics.map((metric) => metric.id));
  const metricFields = value.metrics.map(
    (metric) => (metric.presentation as Record<string, unknown>).field,
  );
  const dimensionFields = value.presentationDimensions.map(
    (dimension) => dimension.field,
  );
  return (
    REQUIRED_METRICS.every((metricId) => metricIds.has(metricId)) &&
    new Set(metricFields).size === metricFields.length &&
    new Set(dimensionFields).size === dimensionFields.length
  );
}

function isValidMetric(value: unknown): value is Record<string, unknown> {
  const status = isRecord(value) ? value.status : undefined;
  const tenantFields = isRecord(value) ? value.tenantFields : undefined;
  const presentation = isRecord(value) ? value.presentation : undefined;
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.source) &&
    isNonEmptyString(value.timeField) &&
    isNonEmptyString(value.quantityField) &&
    (value.aggregation === "sum" || value.aggregation === "count_distinct") &&
    value.timezone === "Asia/Shanghai" &&
    Array.isArray(value.exclusions) &&
    value.exclusions.every(isNonEmptyString) &&
    isRecord(status) &&
    isNonEmptyString(status.field) &&
    isNonEmptyStringArray(status.include) &&
    isRecord(tenantFields) &&
    isNonEmptyString(tenantFields.company) &&
    isNonEmptyString(tenantFields.factory) &&
    isRecord(presentation) &&
    isPresentationField(presentation.field) &&
    isNonEmptyString(presentation.label) &&
    (presentation.format === "integer" ||
      presentation.format === "decimal" ||
      presentation.format === "percent")
  );
}

function isValidPresentationDimension(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    isPresentationField(value.field) &&
    isNonEmptyString(value.label) &&
    (value.type === "temporal" || value.type === "nominal")
  );
}

function buildPresentationPolicy(
  metricsConfig: Readonly<Record<string, unknown>>,
): MesPresentationPolicy {
  const metrics = metricsConfig.metrics as Array<Record<string, unknown>>;
  const dimensions = metricsConfig.presentationDimensions as Array<
    Record<string, unknown>
  >;

  return Object.freeze({
    metrics: immutableMap(
      metrics.map((metric) => {
        const presentation = metric.presentation as {
          field: string;
          label: string;
          format: "integer" | "decimal" | "percent";
        };
        return [String(metric.id), deepFreeze({ ...presentation })] as const;
      }),
    ),
    dimensions: immutableMap(
      dimensions.map((dimension) => [
        String(dimension.field),
        deepFreeze({
          label: String(dimension.label),
          type: dimension.type as "temporal" | "nominal",
        }),
      ]),
    ),
  });
}

function immutableMap<K, V>(entries: Iterable<readonly [K, V]>): ReadonlyMap<K, V> {
  return Object.freeze(new ImmutableMap(entries));
}

class ImmutableMap<K, V> implements ReadonlyMap<K, V> {
  readonly #values: Map<K, V>;

  constructor(entries: Iterable<readonly [K, V]>) {
    this.#values = new Map(entries);
  }

  get size(): number {
    return this.#values.size;
  }

  get(key: K): V | undefined {
    return this.#values.get(key);
  }

  has(key: K): boolean {
    return this.#values.has(key);
  }

  entries(): MapIterator<[K, V]> {
    return this.#values.entries();
  }

  keys(): MapIterator<K> {
    return this.#values.keys();
  }

  values(): MapIterator<V> {
    return this.#values.values();
  }

  forEach(
    callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
    thisArg?: unknown,
  ): void {
    this.#values.forEach((value, key) => {
      callbackfn.call(thisArg, value, key, this);
    });
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }
}

function isValidGlossary(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.terms) &&
    value.terms.length > 0 &&
    value.terms.every(
      (term) =>
        isRecord(term) &&
        isNonEmptyString(term.term) &&
        Array.isArray(term.synonyms) &&
        term.synonyms.every(isNonEmptyString) &&
        isNonEmptyString(term.description),
    )
  );
}

function calculateVersion(contents: ReadonlyMap<string, string>): string {
  const hash = createHash("sha256");
  for (const fileName of CONTEXT_FILES) {
    const content = requireMapValue(contents, fileName);
    hash.update(fileName);
    hash.update("\0");
    hash.update(String(Buffer.byteLength(content, "utf8")));
    hash.update("\0");
    hash.update(content);
  }
  return hash.digest("hex");
}

function validateScope(scope: MesConversationScope): void {
  if (
    !isNonEmptyString(scope.companyCode) ||
    !isNonEmptyString(scope.factoryCode) ||
    !isNonEmptyString(scope.userKey) ||
    Number.isNaN(scope.now.getTime())
  ) {
    throw new Error("Invalid MES conversation scope");
  }
}

function requireMapValue(map: ReadonlyMap<string, string>, key: string): string {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`MES context file is required: ${key}`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPresentationField(value: unknown): value is string {
  return isNonEmptyString(value) && PRESENTATION_FIELD_PATTERN.test(value);
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue, seen);
  }
  return Object.freeze(value);
}
