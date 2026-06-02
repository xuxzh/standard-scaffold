import type { DataResult } from "@/lib/api/http-client";
import type {
  MaterialOptionApiDto,
  MaterialPackagingRelationApiDto,
  PackagingRuleOptionApiDto,
} from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";

type MaterialPackagingRelationMockRecord = Omit<
  MaterialPackagingRelationApiDto,
  "Details"
> & {
  Details: NonNullable<MaterialPackagingRelationApiDto["Details"]>;
  CompanyCode?: string;
  FactoryCode?: string;
};

export type CreateMaterialPackagingRelationPayload = {
  MaterialCode: string;
  MaterialName: string;
  PackagingRuleCode: string;
  PackagingRuleName: string;
  Details: NonNullable<MaterialPackagingRelationApiDto["Details"]>;
  Remark?: string | null;
};

export type UpdateMaterialPackagingRelationPayload = {
  NeedUpdateFields: CreateMaterialPackagingRelationPayload & { Id: number };
};

export const materialOptionMockRows: MaterialOptionApiDto[] = [
  {
    MaterialCode: "MAT_001",
    MaterialName: "Raw Material A",
    Unit: "kg",
    MaterialTypeName: "Raw Material",
  },
  {
    MaterialCode: "MAT_002",
    MaterialName: "Finished Product B",
    Unit: "pcs",
    MaterialTypeName: "Finished Product",
  },
  {
    MaterialCode: "MAT_003",
    MaterialName: "Semi-finished C",
    Unit: "pcs",
    MaterialTypeName: "Semi-finished",
  },
  {
    MaterialCode: "MAT_004",
    MaterialName: "Packaging Material D",
    Unit: "roll",
    MaterialTypeName: "Packaging Material",
  },
  {
    MaterialCode: "MAT_005",
    MaterialName: "Chemical E",
    Unit: "L",
    MaterialTypeName: "Raw Material",
  },
];

export const packagingRuleOptionMockRows: PackagingRuleOptionApiDto[] = [
  {
    RuleCode: "RULE_001",
    RuleName: "Default packaging rule",
    Details: [
      {
        PackagingLevelCode: "LV001",
        PackagingLevelName: "Unit",
        LevelSequence: 1,
        SpecCode: "SP001",
        SpecName: "Standard spec",
        StandardQuantity: 10,
        Unit: "pcs",
        PackagingTypeName: "Carton",
      },
    ],
  },
  {
    RuleCode: "RULE_002",
    RuleName: "Manual packaging rule",
    Details: [
      {
        PackagingLevelCode: "LV002",
        PackagingLevelName: "Box",
        LevelSequence: 2,
        SpecCode: "SP002",
        SpecName: "Large spec",
        StandardQuantity: 20,
        Unit: "pcs",
        PackagingTypeName: "Tray",
      },
    ],
  },
  {
    RuleCode: "RULE_003",
    RuleName: "Multi-level rule",
    Details: [
      {
        PackagingLevelCode: "LV001",
        PackagingLevelName: "Unit",
        LevelSequence: 1,
        SpecCode: "SP001",
        SpecName: "Standard spec",
        StandardQuantity: 5,
        Unit: "pcs",
        PackagingTypeName: "Carton",
      },
      {
        PackagingLevelCode: "LV002",
        PackagingLevelName: "Box",
        LevelSequence: 2,
        SpecCode: "SP003",
        SpecName: "Bulk spec",
        StandardQuantity: 50,
        Unit: "kg",
        PackagingTypeName: "Bag",
      },
    ],
  },
];

export const materialPackagingRelationMockRecords: MaterialPackagingRelationMockRecord[] =
  [
    {
      Id: 1,
      MaterialCode: "MAT_001",
      MaterialName: "Raw Material A",
      PackagingRuleCode: "RULE_001",
      PackagingRuleName: "Default packaging rule",
      Details: [
        {
          LevelSequence: 1,
          PackagingLevelCode: "LV001",
          PackagingLevelName: "Unit",
          SpecCode: "SP001",
          SpecName: "Standard spec",
          Quantity: 10,
          Unit: "pcs",
          PackagingTypeName: "Carton",
          BoxLabelPrintTemplate: "TPL_A",
          PackingListPrintTemplate: "",
        },
      ],
      Remark: "Primary relation",
      CreatorUserName: "admin",
      CompanyCode: "RUIHUI",
      FactoryCode: "DEFAULT",
      CreationTime: "2026-05-29T10:00:00Z",
      LastModificationTime: "2026-05-29T10:00:00Z",
    },
    {
      Id: 2,
      MaterialCode: "MAT_002",
      MaterialName: "Finished Product B",
      PackagingRuleCode: "RULE_002",
      PackagingRuleName: "Manual packaging rule",
      Details: [
        {
          LevelSequence: 2,
          PackagingLevelCode: "LV002",
          PackagingLevelName: "Box",
          SpecCode: "SP002",
          SpecName: "Large spec",
          Quantity: 20,
          Unit: "pcs",
          PackagingTypeName: "Tray",
          BoxLabelPrintTemplate: "TPL_B",
          PackingListPrintTemplate: "TPL_PACK",
        },
      ],
      Remark: "",
      CreatorUserName: "planner",
      CompanyCode: "RUIHUI",
      FactoryCode: "DEFAULT",
      CreationTime: "2026-05-29T11:00:00Z",
      LastModificationTime: "2026-05-29T11:00:00Z",
    },
    {
      Id: 3,
      MaterialCode: "MAT_001",
      MaterialName: "Raw Material A",
      PackagingRuleCode: "RULE_003",
      PackagingRuleName: "Multi-level rule",
      Details: [
        {
          LevelSequence: 1,
          PackagingLevelCode: "LV001",
          PackagingLevelName: "Unit",
          SpecCode: "SP001",
          SpecName: "Standard spec",
          Quantity: 5,
          Unit: "pcs",
          PackagingTypeName: "Carton",
          BoxLabelPrintTemplate: "",
          PackingListPrintTemplate: "",
        },
        {
          LevelSequence: 2,
          PackagingLevelCode: "LV002",
          PackagingLevelName: "Box",
          SpecCode: "SP003",
          SpecName: "Bulk spec",
          Quantity: 50,
          Unit: "kg",
          PackagingTypeName: "Bag",
          BoxLabelPrintTemplate: "TPL_C",
          PackingListPrintTemplate: "",
        },
      ],
      Remark: "Multi-level packaging",
      CreatorUserName: "admin",
      CompanyCode: "RUIHUI",
      FactoryCode: "DEFAULT",
      CreationTime: "2026-05-29T12:00:00Z",
      LastModificationTime: "2026-05-29T12:00:00Z",
    },
    {
      Id: 4,
      MaterialCode: "MAT_003",
      MaterialName: "Semi-finished C",
      PackagingRuleCode: "RULE_001",
      PackagingRuleName: "Default packaging rule",
      Details: [],
      Remark: "No details yet",
      CreatorUserName: "planner",
      CompanyCode: "RUIHUI",
      FactoryCode: "DEFAULT",
      CreationTime: "2026-05-29T13:00:00Z",
      LastModificationTime: "2026-05-29T13:00:00Z",
    },
  ];

function createDataResult<T>(attach: T, totalCount: number): DataResult<T> {
  return {
    Success: true,
    Code: "",
    Message: "[WMS] Query success",
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

function cloneRecords(records: MaterialPackagingRelationMockRecord[]) {
  return records.map((record) => ({
    ...record,
    Details: (record.Details ?? []).map((detail) => ({ ...detail })),
  }));
}

export function createMaterialPackagingRelationMockStore(
  initialRecords: MaterialPackagingRelationMockRecord[] = materialPackagingRelationMockRecords,
) {
  const seedRecords = cloneRecords(initialRecords);
  let records = cloneRecords(seedRecords);
  let nextId = Math.max(...records.map((record) => record.Id), 0) + 1;

  function reset() {
    records = cloneRecords(seedRecords);
    nextId = Math.max(...records.map((record) => record.Id), 0) + 1;
  }

  return {
    query(query: {
      MaterialCode?: string;
      MaterialName?: string;
      PackagingRuleCode?: string;
      PackagingRuleName?: string;
      IsPaged?: boolean;
      PageIndex?: number;
      PageSize?: number;
    }) {
      const filteredRecords = records.filter(
        (record) =>
          includesText(record.MaterialCode, query.MaterialCode) &&
          includesText(record.MaterialName, query.MaterialName) &&
          includesText(record.PackagingRuleCode, query.PackagingRuleCode) &&
          includesText(record.PackagingRuleName, query.PackagingRuleName),
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

    queryMaterials(query: {
      MaterialCode?: string;
      MaterialName?: string;
      IsPaged?: boolean;
      PageIndex?: number;
      PageSize?: number;
    }) {
      const filtered = materialOptionMockRows.filter(
        (item) =>
          includesText(item.MaterialCode, query.MaterialCode) &&
          includesText(item.MaterialName, query.MaterialName),
      );

      if (!query.IsPaged) {
        return createDataResult(filtered, filtered.length);
      }

      const pageIndex = Math.max(query.PageIndex ?? 1, 1);
      const pageSize = Math.max(query.PageSize ?? filtered.length, 1);
      const startIndex = (pageIndex - 1) * pageSize;
      const pageRecords = filtered.slice(startIndex, startIndex + pageSize);

      return createDataResult(pageRecords, filtered.length);
    },

    queryPackagingRules(query: {
      RuleCode?: string;
      RuleName?: string;
      IsPaged?: boolean;
      PageIndex?: number;
      PageSize?: number;
    }) {
      const filtered = packagingRuleOptionMockRows.filter(
        (item) =>
          includesText(item.RuleCode, query.RuleCode) &&
          includesText(item.RuleName, query.RuleName),
      );

      if (!query.IsPaged) {
        return createDataResult(filtered, filtered.length);
      }

      const pageIndex = Math.max(query.PageIndex ?? 1, 1);
      const pageSize = Math.max(query.PageSize ?? filtered.length, 1);
      const startIndex = (pageIndex - 1) * pageSize;
      const pageRecords = filtered.slice(startIndex, startIndex + pageSize);

      return createDataResult(pageRecords, filtered.length);
    },

    create(payload: CreateMaterialPackagingRelationPayload) {
      const now = new Date().toISOString();
      const record: MaterialPackagingRelationMockRecord = {
        Id: nextId,
        MaterialCode: payload.MaterialCode,
        MaterialName: payload.MaterialName,
        PackagingRuleCode: payload.PackagingRuleCode,
        PackagingRuleName: payload.PackagingRuleName,
        Details: payload.Details ?? [],
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

    update(payload: UpdateMaterialPackagingRelationPayload) {
      const fields = payload.NeedUpdateFields;

      records = records.map((record) =>
        record.Id === fields.Id
          ? {
              ...record,
              MaterialCode: fields.MaterialCode,
              MaterialName: fields.MaterialName,
              PackagingRuleCode: fields.PackagingRuleCode,
              PackagingRuleName: fields.PackagingRuleName,
              Details: fields.Details ?? [],
              Remark: fields.Remark ?? "",
              LastModificationTime: new Date().toISOString(),
            }
          : record,
      );

      return createDataResult(null, 0);
    },

    remove(dto: { Id: number }) {
      records = records.filter((record) => record.Id !== dto.Id);

      return createDataResult(null, 0);
    },

    removeBatch(dtos: Array<{ Id: number }>) {
      const ids = new Set(dtos.map((dto) => dto.Id));
      records = records.filter((record) => !ids.has(record.Id));

      return createDataResult(null, 0);
    },

    reset,
  };
}
