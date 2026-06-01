import type { DataResult } from "@/lib/api/http-client";
import type {
  PackagingRuleApiDto,
  PackagingRuleConfigApiDto,
  PackagingRuleLevelOptionApiDto,
  PackagingRuleListQuery,
  PackagingRuleSpecOptionApiDto,
} from "@/features/mes/packaging/packaging-rule/packaging-rule-contract";

type PackagingRuleMockRecord = Omit<PackagingRuleApiDto, "Details"> & {
  Details: NonNullable<PackagingRuleApiDto["Details"]>;
  CompanyCode?: string;
  FactoryCode?: string;
};

type PackagingRuleStoredConfig = {
  Id?: number;
  RuleCode: string;
  MixingRule: PackagingRuleConfigApiDto["MixingRule"];
  LabelPrintRule: PackagingRuleConfigApiDto["LabelPrintRule"];
  SealingRule: PackagingRuleConfigApiDto["SealingRule"];
  ExceptionRule: PackagingRuleConfigApiDto["ExceptionRule"];
};

export type CreatePackagingRulePayload = {
  RuleCode: string;
  RuleName: string;
  IsEnabled: boolean;
  IsDefault: boolean;
  Details: NonNullable<PackagingRuleApiDto["Details"]>;
  Remark?: string | null;
};

export type UpdatePackagingRulePayload = CreatePackagingRulePayload & {
  Id: number;
};

export type PackagingRuleConfigQueryPayload = {
  RuleCode: string;
};

export const packagingRuleLevelOptionRows: PackagingRuleLevelOptionApiDto[] = [
  {
    Id: 1,
    LevelCode: "LV001",
    LevelName: "Unit",
    LevelSequence: 1,
  },
  {
    Id: 2,
    LevelCode: "LV002",
    LevelName: "Box",
    LevelSequence: 2,
  },
  {
    Id: 3,
    LevelCode: "LV003",
    LevelName: "Carton",
    LevelSequence: 3,
  },
];

export const packagingRuleSpecOptionRows: PackagingRuleSpecOptionApiDto[] = [
  {
    Id: 1,
    SpecCode: "SP001",
    SpecName: "Standard spec",
    Unit: "pcs",
    PackagingTypeName: "Carton",
  },
  {
    Id: 2,
    SpecCode: "SP002",
    SpecName: "Large spec",
    Unit: "pcs",
    PackagingTypeName: "Tray",
  },
  {
    Id: 3,
    SpecCode: "SP003",
    SpecName: "Bulk spec",
    Unit: "kg",
    PackagingTypeName: "Bag",
  },
];

export const packagingRuleMockRecords: PackagingRuleMockRecord[] = [
  {
    Id: 1,
    RuleCode: "RULE_001",
    RuleName: "Default packaging rule",
    IsEnabled: true,
    IsDefault: true,
    Details: [
      {
        Id: 11,
        PackagingLevelCode: "LV001",
        PackagingLevelName: "Unit",
        LevelSequence: 1,
        SpecCode: "SP001",
        SpecName: "Standard spec",
        StandardQuantity: 10,
        MaxQuantity: 12,
        PackagingMethod: "auto",
        Unit: "pcs",
        PackagingTypeName: "Carton",
      },
    ],
    Remark: "default",
    CreatorUserName: "admin",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-29T10:00:00Z",
    LastModificationTime: "2026-05-29T10:00:00Z",
  },
  {
    Id: 2,
    RuleCode: "RULE_002",
    RuleName: "Manual packaging rule",
    IsEnabled: false,
    IsDefault: false,
    Details: [
      {
        Id: 12,
        PackagingLevelCode: "LV002",
        PackagingLevelName: "Box",
        LevelSequence: 2,
        SpecCode: "SP002",
        SpecName: "Large spec",
        StandardQuantity: 20,
        MaxQuantity: 24,
        PackagingMethod: "manual",
        Unit: "pcs",
        PackagingTypeName: "Tray",
      },
    ],
    Remark: "manual",
    CreatorUserName: "planner",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-29T11:00:00Z",
    LastModificationTime: "2026-05-29T11:00:00Z",
  },
  {
    Id: 3,
    RuleCode: "RULE_003",
    RuleName: "Fallback packaging rule",
    IsEnabled: true,
    IsDefault: false,
    Details: [],
    Remark: "",
    CreatorUserName: "planner",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-29T12:00:00Z",
    LastModificationTime: "2026-05-29T12:00:00Z",
  },
];

export const packagingRuleConfigRows: PackagingRuleConfigApiDto[] = [
  {
    Id: 1,
    RuleCode: "RULE_001",
    MixingRule: {
      ForbidDifferentProduct: true,
      ForbidDifferentBatch: false,
      ForbidDifferentWorkOrder: true,
      ForbidDifferentProductionTask: false,
      ForbidCrossQualityStatus: true,
    },
    LabelPrintRule: {
      ReprintLimit: 3,
      DefaultTemplate: "TPL-A",
    },
    SealingRule: {
      TimeoutAlert: 15,
      AutoSealOnWorkOrderComplete: true,
      AutoSealOnTaskComplete: false,
      AutoSealOnFullBox: true,
    },
    ExceptionRule: {
      ForceClearOnCycleTool: true,
    },
  },
  {
    Id: 2,
    RuleCode: "RULE_002",
    MixingRule: {
      ForbidDifferentProduct: false,
      ForbidDifferentBatch: true,
      ForbidDifferentWorkOrder: false,
      ForbidDifferentProductionTask: true,
      ForbidCrossQualityStatus: false,
    },
    LabelPrintRule: {
      ReprintLimit: 1,
      DefaultTemplate: "TPL-B",
    },
    SealingRule: {
      TimeoutAlert: 30,
      AutoSealOnWorkOrderComplete: false,
      AutoSealOnTaskComplete: true,
      AutoSealOnFullBox: false,
    },
    ExceptionRule: {
      ForceClearOnCycleTool: false,
    },
  },
];

function createDataResult<T>(attach: T, totalCount: number): DataResult<T> {
  return {
    Success: true,
    Code: "",
    Message: "[MES] Query success",
    Attach: attach,
    SkipCount: 0,
    TotalCount: totalCount,
    Record: Array.isArray(attach) ? attach.length : totalCount,
  };
}

function includesText(
  value: string | null | undefined,
  query: string | undefined,
) {
  if (!query) {
    return true;
  }

  return (value ?? "").toLowerCase().includes(query.toLowerCase());
}

function cloneRuleRecords(records: PackagingRuleMockRecord[]) {
  return records.map((record) => ({
    ...record,
    Details: (record.Details ?? []).map((detail) => ({ ...detail })),
  }));
}

function normalizeConfigRow(
  row: PackagingRuleConfigApiDto,
): PackagingRuleStoredConfig {
  return {
    Id: row.Id,
    RuleCode: row.RuleCode,
    MixingRule: row.MixingRule ? { ...row.MixingRule } : row.MixingRule,
    LabelPrintRule: row.LabelPrintRule
      ? { ...row.LabelPrintRule }
      : row.LabelPrintRule,
    SealingRule: row.SealingRule ? { ...row.SealingRule } : row.SealingRule,
    ExceptionRule: row.ExceptionRule
      ? { ...row.ExceptionRule }
      : row.ExceptionRule,
  };
}

function cloneConfigRows(rows: PackagingRuleConfigApiDto[]) {
  return rows.map(normalizeConfigRow);
}

function enrichDetail(
  detail: NonNullable<PackagingRuleMockRecord["Details"]>[number],
) {
  const level = packagingRuleLevelOptionRows.find(
    (option) => option.LevelCode === detail.PackagingLevelCode,
  );
  const spec = packagingRuleSpecOptionRows.find(
    (option) => option.SpecCode === detail.SpecCode,
  );

  return {
    ...detail,
    PackagingLevelName: level?.LevelName ?? detail.PackagingLevelName ?? "",
    LevelSequence: level?.LevelSequence ?? detail.LevelSequence ?? null,
    SpecName: spec?.SpecName ?? detail.SpecName ?? "",
    Unit: spec?.Unit ?? detail.Unit ?? "",
    PackagingTypeName:
      spec?.PackagingTypeName ?? detail.PackagingTypeName ?? "",
  };
}

export function createPackagingRuleMockStore(
  initialRecords: PackagingRuleMockRecord[] = packagingRuleMockRecords,
  initialConfigs: PackagingRuleConfigApiDto[] = packagingRuleConfigRows,
) {
  const seedRecords = cloneRuleRecords(initialRecords);
  const seedConfigs = cloneConfigRows(initialConfigs);
  let records = cloneRuleRecords(seedRecords);
  let configs = cloneConfigRows(seedConfigs);
  let nextId = Math.max(...records.map((record) => record.Id), 0) + 1;
  let nextDetailId =
    Math.max(
      ...records.flatMap((record) =>
        (record.Details ?? []).map((detail) => detail.Id ?? 0),
      ),
      0,
    ) + 1;

  function reset() {
    records = cloneRuleRecords(seedRecords);
    configs = cloneConfigRows(seedConfigs);
    nextId = Math.max(...records.map((record) => record.Id), 0) + 1;
    nextDetailId =
      Math.max(
        ...records.flatMap((record) =>
          (record.Details ?? []).map((detail) => detail.Id ?? 0),
        ),
        0,
      ) + 1;
  }

  return {
    query(query: Partial<PackagingRuleListQuery>) {
      const filteredRecords = records.filter(
        (record) =>
          includesText(record.RuleCode, query.RuleCode) &&
          includesText(record.RuleName, query.RuleName) &&
          (query.IsDefault === undefined ||
            record.IsDefault === query.IsDefault) &&
          (query.IsEnabled === undefined ||
            record.IsEnabled === query.IsEnabled),
      );

      if (!query.IsPaged) {
        return createDataResult(filteredRecords, filteredRecords.length);
      }

      const pageIndex = Math.max(query.PageIndex ?? 1, 1);
      const pageSize = Math.max(query.PageSize ?? filteredRecords.length, 1);
      const startIndex = (pageIndex - 1) * pageSize;
      const pageRecords = filteredRecords.slice(
        startIndex,
        startIndex + pageSize,
      );

      return createDataResult(pageRecords, filteredRecords.length);
    },

    levelOptions() {
      return createDataResult(
        packagingRuleLevelOptionRows,
        packagingRuleLevelOptionRows.length,
      );
    },

    specOptions() {
      return createDataResult(
        packagingRuleSpecOptionRows,
        packagingRuleSpecOptionRows.length,
      );
    },

    create(payload: CreatePackagingRulePayload) {
      const now = new Date().toISOString();
      const record: PackagingRuleMockRecord = {
        Id: nextId,
        RuleCode: payload.RuleCode,
        RuleName: payload.RuleName,
        IsEnabled: payload.IsEnabled,
        IsDefault: payload.IsDefault,
        Details: (payload.Details ?? []).map((detail) =>
          enrichDetail({
            ...detail,
            Id: detail.Id ?? nextDetailId++,
          }),
        ),
        Remark: payload.Remark ?? "",
        CreatorUserName: "admin",
        CompanyCode: "RUIHUI",
        FactoryCode: "DEFAULT",
        CreationTime: now,
        LastModificationTime: now,
      };

      nextId += 1;
      records = [record, ...records];

      return createDataResult(record, 1);
    },

    update(payload: UpdatePackagingRulePayload) {
      records = records.map((record) =>
        record.Id === payload.Id
          ? {
              ...record,
              RuleName: payload.RuleName,
              IsEnabled: payload.IsEnabled,
              IsDefault: payload.IsDefault,
              Details: (payload.Details ?? []).map((detail) =>
                enrichDetail({
                  ...detail,
                  Id: detail.Id ?? nextDetailId++,
                }),
              ),
              Remark: payload.Remark ?? "",
              LastModificationTime: new Date().toISOString(),
            }
          : record,
      );

      return createDataResult(null, 0);
    },

    remove(dto: Pick<PackagingRuleApiDto, "Id">) {
      records = records.filter((record) => record.Id !== dto.Id);

      return createDataResult(null, 0);
    },

    removeBatch(dtos: Array<Pick<PackagingRuleApiDto, "Id">>) {
      const ids = new Set(dtos.map((dto) => dto.Id));
      records = records.filter((record) => !ids.has(record.Id));

      return createDataResult(null, 0);
    },

    getConfig(payload: PackagingRuleConfigQueryPayload) {
      const config = configs.find((item) => item.RuleCode === payload.RuleCode);

      return createDataResult(config ? [config] : [], config ? 1 : 0);
    },

    saveConfig(payload: PackagingRuleConfigApiDto) {
      const normalizedPayload = normalizeConfigRow(payload);
      const existingIndex = configs.findIndex(
        (item) => item.RuleCode === payload.RuleCode,
      );

      if (existingIndex >= 0) {
        configs[existingIndex] = normalizedPayload;
      } else {
        configs = [...configs, normalizedPayload];
      }

      return createDataResult(null, 0);
    },

    reset,
  };
}
