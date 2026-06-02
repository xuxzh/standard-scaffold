// === API DTOs (PascalCase, matching backend wire format) ===

export type MaterialPackagingRelationDetailApiDto = {
  LevelSequence?: number | null;
  PackagingLevelCode: string;
  PackagingLevelName?: string | null;
  SpecCode: string;
  SpecName?: string | null;
  Quantity: number;
  Unit?: string | null;
  PackagingTypeName?: string | null;
  BoxLabelPrintTemplate?: string | null;
  PackingListPrintTemplate?: string | null;
};

export type MaterialPackagingRelationApiDto = {
  Id: number;
  MaterialCode: string;
  MaterialName: string;
  PackagingRuleCode: string;
  PackagingRuleName: string;
  Details?: MaterialPackagingRelationDetailApiDto[] | null;
  Remark?: string | null;
  CreatorUserName?: string | null;
  CreationTime?: string | null;
  LastModificationTime?: string | null;
  CompanyCode?: string;
  FactoryCode?: string;
};

// === Material candidate DTOs ===

export type MaterialOptionApiDto = {
  MaterialCode: string;
  MaterialName: string;
  Unit?: string | null;
  MaterialTypeName?: string | null;
};

// === Packaging rule candidate DTOs (reuse from packaging-rule) ===

export type PackagingRuleOptionDetailApiDto = {
  PackagingLevelCode: string;
  PackagingLevelName?: string | null;
  LevelSequence?: number | null;
  SpecCode: string;
  SpecName?: string | null;
  StandardQuantity: number;
  Unit?: string | null;
  PackagingTypeName?: string | null;
};

export type PackagingRuleOptionApiDto = {
  RuleCode: string;
  RuleName: string;
  Details?: PackagingRuleOptionDetailApiDto[] | null;
};

// === Frontend record models (camelCase) ===

export type MaterialPackagingRelationDetail = {
  levelSequence: number | null;
  packagingLevelCode: string;
  packagingLevelName: string;
  specCode: string;
  specName: string;
  quantity: number;
  unit: string;
  packagingTypeName: string;
  boxLabelPrintTemplate: string;
  packingListPrintTemplate: string;
};

export type MaterialPackagingRelationRecord = {
  id: number;
  materialCode: string;
  materialName: string;
  packagingRuleCode: string;
  packagingRuleName: string;
  details: MaterialPackagingRelationDetail[];
  remark: string;
  creatorUserName?: string | null;
  creationTime?: string | null;
  lastModificationTime?: string | null;
  rawDto: MaterialPackagingRelationApiDto;
};

// === Table row model (flattened details) ===

export type MaterialPackagingRelationTableRow = {
  rowId: string;
  relationId: number;
  detailIndex: number | null;
  record: MaterialPackagingRelationRecord;
  detail: MaterialPackagingRelationDetail | null;
};

// === Filter model ===

export type MaterialPackagingRelationFilters = {
  materialCode: string;
  materialName: string;
  packagingRuleCode: string;
  packagingRuleName: string;
};

// === Form models ===

export type MaterialPackagingRelationDetailFormValues = {
  levelSequence: string;
  packagingLevelCode: string;
  packagingLevelName: string;
  specCode: string;
  specName: string;
  quantity: string;
  unit: string;
  packagingTypeName: string;
  boxLabelPrintTemplate: string;
  packingListPrintTemplate: string;
};

export type MaterialPackagingRelationFormValues = {
  materialCode: string;
  materialName: string;
  packagingRuleCode: string;
  packagingRuleName: string;
  remark: string;
  details: MaterialPackagingRelationDetailFormValues[];
};

// === Candidate option models ===

export type MaterialOption = {
  materialCode: string;
  materialName: string;
  unit: string;
  materialTypeName: string;
};

export type PackagingRuleOption = {
  ruleCode: string;
  ruleName: string;
  details: PackagingRuleOptionDetailApiDto[];
};

// === Query models ===

export type MaterialPackagingRelationListQuery = {
  MaterialCode?: string;
  MaterialName?: string;
  PackagingRuleCode?: string;
  PackagingRuleName?: string;
  IsPaged: true;
  PageIndex: number;
  PageSize: number;
};

export type MaterialOptionQuery = {
  MaterialCode?: string;
  MaterialName?: string;
  IsPaged: true;
  PageIndex: number;
  PageSize: number;
};

export type PackagingRuleOptionQuery = {
  RuleCode?: string;
  RuleName?: string;
  IsPaged: true;
  PageIndex: number;
  PageSize: number;
};

// === Create / Update input models ===

export type CreateMaterialPackagingRelationInput = {
  materialCode: string;
  materialName: string;
  packagingRuleCode: string;
  packagingRuleName: string;
  details: MaterialPackagingRelationDetailFormValues[];
  remark: string;
};

export type UpdateMaterialPackagingRelationInput =
  CreateMaterialPackagingRelationInput & {
    id: number;
  };

// === Constants ===

export const materialPackagingRelationPageSize = 20;
export const materialOptionPageSize = 50;
export const packagingRuleOptionPageSize = 20;

export const materialPackagingRelationDefaultFilters: MaterialPackagingRelationFilters =
  {
    materialCode: "",
    materialName: "",
    packagingRuleCode: "",
    packagingRuleName: "",
  };

// === Mapping functions ===

function normalizeText(value: string | null | undefined) {
  return value ?? "";
}

export function mapMaterialPackagingRelationDetailDtoToDetail(
  dto: MaterialPackagingRelationDetailApiDto,
): MaterialPackagingRelationDetail {
  return {
    levelSequence: dto.LevelSequence ?? null,
    packagingLevelCode: dto.PackagingLevelCode,
    packagingLevelName: normalizeText(dto.PackagingLevelName),
    specCode: dto.SpecCode,
    specName: normalizeText(dto.SpecName),
    quantity: dto.Quantity,
    unit: normalizeText(dto.Unit),
    packagingTypeName: normalizeText(dto.PackagingTypeName),
    boxLabelPrintTemplate: normalizeText(dto.BoxLabelPrintTemplate),
    packingListPrintTemplate: normalizeText(dto.PackingListPrintTemplate),
  };
}

export function mapMaterialPackagingRelationDtoToRecord(
  dto: MaterialPackagingRelationApiDto,
): MaterialPackagingRelationRecord {
  return {
    id: dto.Id,
    materialCode: dto.MaterialCode,
    materialName: dto.MaterialName,
    packagingRuleCode: dto.PackagingRuleCode,
    packagingRuleName: dto.PackagingRuleName,
    details: (dto.Details ?? []).map(
      mapMaterialPackagingRelationDetailDtoToDetail,
    ),
    remark: normalizeText(dto.Remark),
    creatorUserName: dto.CreatorUserName,
    creationTime: dto.CreationTime,
    lastModificationTime: dto.LastModificationTime,
    rawDto: dto,
  };
}

export function flattenMaterialPackagingRelationRows(
  records: MaterialPackagingRelationRecord[],
): MaterialPackagingRelationTableRow[] {
  const rows: MaterialPackagingRelationTableRow[] = [];

  for (const record of records) {
    if (record.details.length === 0) {
      rows.push({
        rowId: `${record.id}:empty`,
        relationId: record.id,
        detailIndex: null,
        record,
        detail: null,
      });
    } else {
      for (let i = 0; i < record.details.length; i++) {
        rows.push({
          rowId: `${record.id}:${i}`,
          relationId: record.id,
          detailIndex: i,
          record,
          detail: record.details[i],
        });
      }
    }
  }

  return rows;
}

export function mapMaterialOptionDtoToOption(
  dto: MaterialOptionApiDto,
): MaterialOption {
  return {
    materialCode: dto.MaterialCode,
    materialName: dto.MaterialName,
    unit: normalizeText(dto.Unit),
    materialTypeName: normalizeText(dto.MaterialTypeName),
  };
}

export function mapPackagingRuleOptionDtoToOption(
  dto: PackagingRuleOptionApiDto,
): PackagingRuleOption {
  return {
    ruleCode: dto.RuleCode,
    ruleName: dto.RuleName,
    details: dto.Details ?? [],
  };
}

export function mapMaterialPackagingRelationFiltersToQuery(
  filters: MaterialPackagingRelationFilters,
  pageIndex: number,
  pageSize = materialPackagingRelationPageSize,
): MaterialPackagingRelationListQuery {
  return {
    MaterialCode: filters.materialCode.trim() || undefined,
    MaterialName: filters.materialName.trim() || undefined,
    PackagingRuleCode: filters.packagingRuleCode.trim() || undefined,
    PackagingRuleName: filters.packagingRuleName.trim() || undefined,
    IsPaged: true,
    PageIndex: pageIndex,
    PageSize: pageSize,
  };
}

export function parseMaterialPackagingRelationInteger(value: string) {
  return Number.parseInt(value, 10);
}
