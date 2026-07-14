import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { MesContextService } from "./mes-context.service.js";

const FILES = {
  "assistant.yaml": `
role: MES data analyst
timezone: Asia/Shanghai
answerRequirements:
  - State the metric scope and cutoff time
queryConstraints:
  readOnly: true
  requireTenantFilters: true
`,
  "database-schema.yaml": `
database: MES
schemas:
  - name: dbo
    objects:
      - name: ProductionOutput
        type: table
        sensitive: false
        columns:
          - name: CompanyCode
            type: nvarchar
            sensitive: false
`,
  "metrics.yaml": `
presentationDimensions:
  - field: date
    label: Date
    type: temporal
  - field: category
    label: Category
    type: nominal
  - field: series
    label: Series
    type: nominal
metrics:
  - id: daily_output
    source: dbo.ProductionOutput
    timeField: CompletedAt
    quantityField: Quantity
    aggregation: sum
    status:
      field: Status
      include: [completed]
    exclusions: []
    tenantFields:
      company: CompanyCode
      factory: FactoryCode
    timezone: Asia/Shanghai
    presentation:
      field: dailyOutput
      label: Daily output
      format: integer
  - id: daily_completed_work_orders
    source: dbo.WorkOrder
    timeField: CompletedAt
    quantityField: WorkOrderId
    aggregation: count_distinct
    status:
      field: Status
      include: [completed]
    exclusions: []
    tenantFields:
      company: CompanyCode
      factory: FactoryCode
    timezone: Asia/Shanghai
    presentation:
      field: completedWorkOrders
      label: Completed work orders
      format: integer
`,
  "glossary.yaml": `
terms:
  - term: work order
    synonyms: [production order]
    description: A unit of scheduled production work.
`,
  "prompt.md": `
You are a read-only MES data analyst.
Use only the provided schema and metric definitions.
`,
} as const;

const fixtureDirectories: string[] = [];

afterEach(() => {
  for (const directory of fixtureDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("MesContextService", () => {
  it("loads the approved RH_Mom production metrics", () => {
    const service = new MesContextService();
    const result = service.compile(createScope());
    const policy = service.getPresentationPolicy();

    expect(result.systemPrompt).toContain("database: RH_Mom");
    expect(result.systemPrompt).toContain(
      "source: dbo.ProPla_ProductionReportRecord",
    );
    expect(result.systemPrompt).toContain("timeField: ReportTime");
    expect(result.systemPrompt).toContain("quantityField: GoodQty");
    expect(result.systemPrompt).toContain(
      "source: dbo.ProPla_ProductionDispatchOrder",
    );
    expect(result.systemPrompt).toContain("timeField: ActualEndTime");
    expect(result.systemPrompt).toContain(
      "quantityField: ProductionDispatchCode",
    );
    expect(result.systemPrompt).toContain("include:\n        - Completed");
    expect(policy.metrics.get("daily_output")).toEqual({
      field: "dailyOutput",
      label: "Daily output",
      format: "integer",
    });
    expect(policy.dimensions.get("date")).toEqual({
      label: "Date",
      type: "temporal",
    });
    expect(Object.isFrozen(policy)).toBe(true);
    expect(Object.isFrozen(policy.metrics.get("daily_output"))).toBe(true);
    expect(() =>
      (policy.metrics as Map<string, unknown>).set("unapproved", {}),
    ).toThrow(TypeError);
    expect(policy.metrics.has("unapproved")).toBe(false);
  });

  it("fails fast when a required context file is missing", () => {
    const directory = createFixture();
    unlinkSync(join(directory, "metrics.yaml"));

    expect(() => new MesContextService(directory)).toThrow(
      "MES context file is required: metrics.yaml",
    );
  });

  it("rejects invalid YAML without exposing file contents", () => {
    const directory = createFixture({
      "metrics.yaml": "metrics: [unterminated",
    });

    expect(() => new MesContextService(directory)).toThrow(
      "Invalid MES context file: metrics.yaml",
    );
  });

  it("rejects structurally incomplete metric definitions", () => {
    const directory = createFixture({
      "metrics.yaml": `
metrics:
  - id: daily_output
    source: dbo.ProductionOutput
`,
    });

    expect(() => new MesContextService(directory)).toThrow(
      "Invalid MES context structure: metrics.yaml",
    );
  });

  it("rejects metrics without an aggregation or tenant fields", () => {
    const directory = createFixture({
      "metrics.yaml": `
metrics:
  - id: daily_output
    source: dbo.ProductionOutput
    timeField: CompletedAt
    quantityField: Quantity
    status:
      field: Status
      include: [completed]
    exclusions: []
    timezone: Asia/Shanghai
  - id: daily_completed_work_orders
    source: dbo.WorkOrder
    timeField: CompletedAt
    quantityField: WorkOrderId
    status:
      field: Status
      include: [completed]
    exclusions: []
    timezone: Asia/Shanghai
`,
    });

    expect(() => new MesContextService(directory)).toThrow(
      "Invalid MES context structure: metrics.yaml",
    );
  });

  it.each([
    [
      "duplicate metric presentation fields",
      FILES["metrics.yaml"].replace(
        "field: completedWorkOrders",
        "field: dailyOutput",
      ),
    ],
    [
      "empty metric presentation labels",
      FILES["metrics.yaml"].replace("label: Daily output", 'label: ""'),
    ],
    [
      "unsupported metric presentation formats",
      FILES["metrics.yaml"].replace("format: integer", "format: currency"),
    ],
    [
      "duplicate presentation dimensions",
      FILES["metrics.yaml"].replace("field: category", "field: date"),
    ],
    [
      "unsupported presentation dimension types",
      FILES["metrics.yaml"].replace("type: nominal", "type: ordinal"),
    ],
  ])("rejects %s", (_name, metrics) => {
    const directory = createFixture({ "metrics.yaml": metrics });

    expect(() => new MesContextService(directory)).toThrow(
      "Invalid MES context structure: metrics.yaml",
    );
  });

  it("computes the same SHA-256 version regardless of file creation order", () => {
    const firstDirectory = createFixture();
    const secondDirectory = createFixture({}, [...Object.keys(FILES)].reverse());

    const first = new MesContextService(firstDirectory).compile(createScope());
    const second = new MesContextService(secondDirectory).compile(createScope());

    expect(first.version).toMatch(/^[a-f0-9]{64}$/);
    expect(first.version).toBe(second.version);
  });

  it("changes the version when any source content changes", () => {
    const first = new MesContextService(createFixture()).compile(createScope());
    const changed = new MesContextService(
      createFixture({
        "glossary.yaml": `${FILES["glossary.yaml"]}\n# release change\n`,
      }),
    ).compile(createScope());

    expect(changed.version).not.toBe(first.version);
  });

  it("compiles tenant, user, time, metrics, timezone, and read-only constraints", () => {
    const result = new MesContextService(createFixture()).compile(createScope());

    expect(result.systemPrompt).toContain("RUIHUI");
    expect(result.systemPrompt).toContain("FACTORY-01");
    expect(result.systemPrompt).toContain("user-42");
    expect(result.systemPrompt).toContain("Alice");
    expect(result.systemPrompt).toContain("Asia/Shanghai");
    expect(result.systemPrompt).toContain("2026-07-13T02:03:04.000Z");
    expect(result.systemPrompt).toContain("daily_output");
    expect(result.systemPrompt).toContain("daily_completed_work_orders");
    expect(result.systemPrompt).toContain("read-only");
    expect(result.systemPrompt).toContain("companyCode and factoryCode");
  });

  it("keeps the release version stable while changing the runtime scope", () => {
    const service = new MesContextService(createFixture());
    const first = service.compile(createScope());
    const second = service.compile({
      ...createScope(),
      companyCode: "OTHER",
      factoryCode: "FACTORY-02",
      userKey: "user-99",
      userName: "Bob",
    });

    expect(second.version).toBe(first.version);
    expect(second.systemPrompt).not.toBe(first.systemPrompt);
    expect(second.systemPrompt).toContain("OTHER");
    expect(second.systemPrompt).toContain("FACTORY-02");
  });
});

function createScope() {
  return {
    companyCode: "RUIHUI",
    factoryCode: "FACTORY-01",
    userKey: "user-42",
    userName: "Alice",
    now: new Date("2026-07-13T02:03:04.000Z"),
  };
}

function createFixture(
  overrides: Partial<Record<keyof typeof FILES, string>> = {},
  creationOrder: string[] = Object.keys(FILES),
): string {
  const directory = mkdtempSync(join(tmpdir(), "mes-context-"));
  fixtureDirectories.push(directory);

  for (const fileName of creationOrder) {
    const typedFileName = fileName as keyof typeof FILES;
    writeFileSync(
      join(directory, typedFileName),
      overrides[typedFileName] ?? FILES[typedFileName],
      "utf8",
    );
  }

  return directory;
}
