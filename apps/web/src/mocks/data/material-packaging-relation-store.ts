import type {
  MaterialOptionApiDto,
  MaterialPackagingRelationApiDto,
  PackagingRuleOptionApiDto,
} from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";
import { getMockRecordCount } from "@/mocks/config";
import {
  buildRecords,
  cloneRecords,
  createDataResult,
  includesText,
  padNumber,
  paginateRecords,
} from "@/mocks/data/mock-store-utils";

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

const materialOptionSeedRows: MaterialOptionApiDto[] = [
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

function createMaterialOption(index: number): MaterialOptionApiDto {
  return {
    MaterialCode: `MAT-GEN-${padNumber(index)}`,
    MaterialName: `Generated Material ${padNumber(index)}`,
    Unit: index % 2 === 0 ? "pcs" : "kg",
    MaterialTypeName: index % 3 === 0 ? "Packaging Material" : "Raw Material",
  };
}

export const materialOptionMockRows: MaterialOptionApiDto[] = buildRecords(
  materialOptionSeedRows,
  getMockRecordCount(),
  createMaterialOption,
);

const packagingRuleOptionSeedRows: PackagingRuleOptionApiDto[] = [
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

function createPackagingRuleOption(index: number): PackagingRuleOptionApiDto {
  return {
    RuleCode: `RULE_OPT_GEN_${padNumber(index)}`,
    RuleName: `Generated rule option ${padNumber(index)}`,
    Details: [
      {
        PackagingLevelCode: `LV-GEN-${padNumber(index)}`,
        PackagingLevelName: `Generated Level ${padNumber(index)}`,
        LevelSequence: (index % 4) + 1,
        SpecCode: `SP-GEN-${padNumber(index)}`,
        SpecName: `Generated Spec ${padNumber(index)}`,
        StandardQuantity: 5 + index,
        Unit: index % 2 === 0 ? "pcs" : "kg",
        PackagingTypeName: `Generated Type ${padNumber(index)}`,
      },
    ],
  };
}

export const packagingRuleOptionMockRows: PackagingRuleOptionApiDto[] =
  buildRecords(
    packagingRuleOptionSeedRows,
    getMockRecordCount(),
    createPackagingRuleOption,
  );

const materialPackagingRelationSeedRecords: MaterialPackagingRelationMockRecord[] =
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

function createMaterialPackagingRelationRecord(
  index: number,
): MaterialPackagingRelationMockRecord {
  const day = padNumber(((index - 1) % 28) + 1, 2);
  const material = materialOptionMockRows[(index - 1) % materialOptionMockRows.length];
  const rule =
    packagingRuleOptionMockRows[(index - 1) % packagingRuleOptionMockRows.length];

  return {
    Id: index,
    MaterialCode: material?.MaterialCode ?? `MAT-GEN-${padNumber(index)}`,
    MaterialName: material?.MaterialName ?? `Generated Material ${padNumber(index)}`,
    PackagingRuleCode: rule?.RuleCode ?? `RULE_OPT_GEN_${padNumber(index)}`,
    PackagingRuleName: rule?.RuleName ?? `Generated rule option ${padNumber(index)}`,
    Details: (rule?.Details ?? []).map((detail) => ({
      LevelSequence: detail.LevelSequence,
      PackagingLevelCode: detail.PackagingLevelCode,
      PackagingLevelName: detail.PackagingLevelName,
      SpecCode: detail.SpecCode,
      SpecName: detail.SpecName,
      Quantity: detail.StandardQuantity,
      Unit: detail.Unit,
      PackagingTypeName: detail.PackagingTypeName,
      BoxLabelPrintTemplate: `TPL_${padNumber(index)}`,
      PackingListPrintTemplate: "",
    })),
    Remark: "",
    CreatorUserName: "planner",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: `2026-05-${day}T08:00:00Z`,
    LastModificationTime: `2026-05-${day}T08:00:00Z`,
  };
}

export const materialPackagingRelationMockRecords: MaterialPackagingRelationMockRecord[] =
  buildRecords(
    materialPackagingRelationSeedRecords,
    getMockRecordCount(),
    createMaterialPackagingRelationRecord,
  );

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
        return createDataResult(
          filteredRecords,
          filteredRecords.length,
          "[WMS] Query success",
        );
      }

      const pageRecords = paginateRecords(filteredRecords, query);

      return createDataResult(
        pageRecords,
        filteredRecords.length,
        "[WMS] Query success",
      );
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
        return createDataResult(filtered, filtered.length, "[WMS] Query success");
      }

      const pageRecords = paginateRecords(filtered, query);

      return createDataResult(pageRecords, filtered.length, "[WMS] Query success");
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
        return createDataResult(filtered, filtered.length, "[WMS] Query success");
      }

      const pageRecords = paginateRecords(filtered, query);

      return createDataResult(pageRecords, filtered.length, "[WMS] Query success");
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

      return createDataResult(record, 1, "[WMS] Query success");
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

      return createDataResult(null, 0, "[WMS] Query success");
    },

    remove(dto: { Id: number }) {
      records = records.filter((record) => record.Id !== dto.Id);

      return createDataResult(null, 0, "[WMS] Query success");
    },

    removeBatch(dtos: Array<{ Id: number }>) {
      const ids = new Set(dtos.map((dto) => dto.Id));
      records = records.filter((record) => !ids.has(record.Id));

      return createDataResult(null, 0, "[WMS] Query success");
    },

    reset,
  };
}
