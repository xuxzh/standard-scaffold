export type PackagingMethod = "auto" | "manual";

export type PackagingRuleDetailApiDto = {
  Id?: number;
  PackagingLevelCode: string;
  PackagingLevelName?: string | null;
  LevelSequence?: number | null;
  SpecCode: string;
  SpecName?: string | null;
  StandardQuantity: number;
  MaxQuantity: number;
  PackagingMethod: PackagingMethod;
  Unit?: string | null;
  PackagingTypeName?: string | null;
};

export type PackagingRuleApiDto = {
  Id: number;
  RuleCode: string;
  RuleName: string;
  IsEnabled: boolean;
  IsDefault: boolean;
  Details?: PackagingRuleDetailApiDto[] | null;
  Remark?: string | null;
  CreatorUserName?: string | null;
  CreationTime?: string | null;
  LastModificationTime?: string | null;
  CompanyCode?: string;
  FactoryCode?: string;
};

export type PackagingRuleRecord = {
  id: number;
  ruleCode: string;
  ruleName: string;
  isEnabled: boolean;
  isDefault: boolean;
  details: PackagingRuleDetailRecord[];
  remark: string;
  creatorUserName?: string | null;
  creationTime?: string | null;
  lastModificationTime?: string | null;
};

export type PackagingRuleDetailRecord = {
  id?: number;
  packagingLevelCode: string;
  packagingLevelName: string;
  levelSequence: number | null;
  specCode: string;
  specName: string;
  standardQuantity: number;
  maxQuantity: number;
  packagingMethod: PackagingMethod;
  unit: string;
  packagingTypeName: string;
};

export type PackagingRuleFilters = {
  ruleCode: string;
  ruleName: string;
  isDefault: "all" | "true" | "false";
  isEnabled: "all" | "true" | "false";
};

export type PackagingRuleListQuery = {
  RuleCode?: string;
  RuleName?: string;
  IsDefault?: boolean;
  IsEnabled?: boolean;
  IsPaged: true;
  PageIndex: number;
  PageSize: number;
};

export type PackagingRuleDetailFormValues = {
  id?: number;
  packagingLevelCode: string;
  specCode: string;
  standardQuantity: string;
  maxQuantity: string;
  packagingMethod: PackagingMethod;
};

export type PackagingRuleFormValues = {
  ruleCode: string;
  ruleName: string;
  isDefault: boolean;
  isEnabled: boolean;
  remark: string;
  details: PackagingRuleDetailFormValues[];
};

export type PackagingRuleDetailInput = {
  id?: number;
  packagingLevelCode: string;
  specCode: string;
  standardQuantity: string;
  maxQuantity: string;
  packagingMethod: PackagingMethod;
};

export type CreatePackagingRuleInput = {
  ruleCode: string;
  ruleName: string;
  isEnabled: boolean;
  isDefault: boolean;
  details: PackagingRuleDetailInput[];
  remark: string;
};

export type UpdatePackagingRuleInput = CreatePackagingRuleInput & {
  id: number;
};

export type PackagingRuleLevelOptionApiDto = {
  Id: number;
  LevelCode: string;
  LevelName: string;
  LevelSequence: number;
};

export type PackagingRuleLevelOption = {
  id: number;
  levelCode: string;
  levelName: string;
  levelSequence: number;
};

export type PackagingRuleSpecOptionApiDto = {
  Id: number;
  SpecCode: string;
  SpecName: string;
  Unit?: string | null;
  PackagingTypeName?: string | null;
};

export type PackagingRuleSpecOption = {
  id: number;
  specCode: string;
  specName: string;
  unit: string;
  packagingTypeName: string;
};

export type PackagingRuleConfigApiDto = {
  Id?: number;
  RuleCode: string;
  MixingRule?: {
    ForbidDifferentProduct?: boolean | null;
    ForbidDifferentBatch?: boolean | null;
    ForbidDifferentWorkOrder?: boolean | null;
    ForbidDifferentProductionTask?: boolean | null;
    ForbidCrossQualityStatus?: boolean | null;
  } | null;
  LabelPrintRule?: {
    ReprintLimit?: number | null;
    DefaultTemplate?: string | null;
  } | null;
  SealingRule?: {
    TimeoutAlert?: number | null;
    AutoSealOnWorkOrderComplete?: boolean | null;
    AutoSealOnTaskComplete?: boolean | null;
    AutoSealOnFullBox?: boolean | null;
  } | null;
  ExceptionRule?: {
    ForceClearOnCycleTool?: boolean | null;
  } | null;
};

export type PackagingRuleConfigFormValues = {
  ruleCode: string;
  mixingRule: {
    forbidDifferentProduct: boolean;
    forbidDifferentBatch: boolean;
    forbidDifferentWorkOrder: boolean;
    forbidDifferentProductionTask: boolean;
    forbidCrossQualityStatus: boolean;
  };
  labelPrintRule: {
    reprintLimit: string;
    defaultTemplate: string;
  };
  sealingRule: {
    timeoutAlert: string;
    autoSealOnWorkOrderComplete: boolean;
    autoSealOnTaskComplete: boolean;
    autoSealOnFullBox: boolean;
  };
  exceptionRule: {
    forceClearOnCycleTool: boolean;
  };
};

export type SavePackagingRuleConfigInput = PackagingRuleConfigFormValues;

export const packagingRulePageSize = 20;

export const packagingRuleDefaultFilters: PackagingRuleFilters = {
  ruleCode: "",
  ruleName: "",
  isDefault: "all",
  isEnabled: "all",
};

export const defaultPackagingRuleConfigValues: PackagingRuleConfigFormValues = {
  ruleCode: "",
  mixingRule: {
    forbidDifferentProduct: false,
    forbidDifferentBatch: false,
    forbidDifferentWorkOrder: false,
    forbidDifferentProductionTask: false,
    forbidCrossQualityStatus: false,
  },
  labelPrintRule: {
    reprintLimit: "0",
    defaultTemplate: "",
  },
  sealingRule: {
    timeoutAlert: "0",
    autoSealOnWorkOrderComplete: false,
    autoSealOnTaskComplete: false,
    autoSealOnFullBox: false,
  },
  exceptionRule: {
    forceClearOnCycleTool: false,
  },
};

function normalizeText(value: string | null | undefined) {
  return value ?? "";
}

export function mapPackagingRuleDtoToRecord(
  dto: PackagingRuleApiDto,
): PackagingRuleRecord {
  return {
    id: dto.Id,
    ruleCode: dto.RuleCode,
    ruleName: dto.RuleName,
    isEnabled: dto.IsEnabled,
    isDefault: dto.IsDefault,
    details: (dto.Details ?? []).map(mapPackagingRuleDetailDtoToRecord),
    remark: normalizeText(dto.Remark),
    creatorUserName: dto.CreatorUserName,
    creationTime: dto.CreationTime,
    lastModificationTime: dto.LastModificationTime,
  };
}

export function mapPackagingRuleDetailDtoToRecord(
  dto: PackagingRuleDetailApiDto,
): PackagingRuleDetailRecord {
  return {
    id: dto.Id,
    packagingLevelCode: dto.PackagingLevelCode,
    packagingLevelName: normalizeText(dto.PackagingLevelName),
    levelSequence: dto.LevelSequence ?? null,
    specCode: dto.SpecCode,
    specName: normalizeText(dto.SpecName),
    standardQuantity: dto.StandardQuantity,
    maxQuantity: dto.MaxQuantity,
    packagingMethod: dto.PackagingMethod,
    unit: normalizeText(dto.Unit),
    packagingTypeName: normalizeText(dto.PackagingTypeName),
  };
}

export function mapPackagingRuleFiltersToQuery(
  filters: PackagingRuleFilters,
  pageIndex: number,
  pageSize = packagingRulePageSize,
): PackagingRuleListQuery {
  return {
    RuleCode: filters.ruleCode.trim() || undefined,
    RuleName: filters.ruleName.trim() || undefined,
    IsDefault: mapTriStateBoolean(filters.isDefault),
    IsEnabled: mapTriStateBoolean(filters.isEnabled),
    IsPaged: true,
    PageIndex: pageIndex,
    PageSize: pageSize,
  };
}

export function mapPackagingRuleLevelOptionDto(
  dto: PackagingRuleLevelOptionApiDto,
): PackagingRuleLevelOption {
  return {
    id: dto.Id,
    levelCode: dto.LevelCode,
    levelName: dto.LevelName,
    levelSequence: dto.LevelSequence,
  };
}

export function mapPackagingRuleSpecOptionDto(
  dto: PackagingRuleSpecOptionApiDto,
): PackagingRuleSpecOption {
  return {
    id: dto.Id,
    specCode: dto.SpecCode,
    specName: dto.SpecName,
    unit: normalizeText(dto.Unit),
    packagingTypeName: normalizeText(dto.PackagingTypeName),
  };
}

export function mapPackagingRuleConfigDtoToFormValues(
  dto: PackagingRuleConfigApiDto | null | undefined,
): PackagingRuleConfigFormValues {
  if (!dto) {
    return { ...defaultPackagingRuleConfigValues };
  }

  return {
    ruleCode: dto.RuleCode,
    mixingRule: {
      forbidDifferentProduct: dto.MixingRule?.ForbidDifferentProduct ?? false,
      forbidDifferentBatch: dto.MixingRule?.ForbidDifferentBatch ?? false,
      forbidDifferentWorkOrder:
        dto.MixingRule?.ForbidDifferentWorkOrder ?? false,
      forbidDifferentProductionTask:
        dto.MixingRule?.ForbidDifferentProductionTask ?? false,
      forbidCrossQualityStatus:
        dto.MixingRule?.ForbidCrossQualityStatus ?? false,
    },
    labelPrintRule: {
      reprintLimit: String(dto.LabelPrintRule?.ReprintLimit ?? 0),
      defaultTemplate: normalizeText(dto.LabelPrintRule?.DefaultTemplate),
    },
    sealingRule: {
      timeoutAlert: String(dto.SealingRule?.TimeoutAlert ?? 0),
      autoSealOnWorkOrderComplete:
        dto.SealingRule?.AutoSealOnWorkOrderComplete ?? false,
      autoSealOnTaskComplete: dto.SealingRule?.AutoSealOnTaskComplete ?? false,
      autoSealOnFullBox: dto.SealingRule?.AutoSealOnFullBox ?? false,
    },
    exceptionRule: {
      forceClearOnCycleTool: dto.ExceptionRule?.ForceClearOnCycleTool ?? false,
    },
  };
}

export function parsePackagingRuleInteger(value: string) {
  return Number.parseInt(value, 10);
}

export function mapTriStateBoolean(value: PackagingRuleFilters["isDefault"]) {
  if (value === "all") {
    return undefined;
  }

  return value === "true";
}
