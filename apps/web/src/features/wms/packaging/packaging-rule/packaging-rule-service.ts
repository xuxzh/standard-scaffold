import type { ApiQueryParams, DataResult } from "@/lib/api/http-client";
import { getWmsClient } from "@/lib/api/wms-client";
import {
  defaultPackagingRuleConfigValues,
  mapPackagingRuleConfigDtoToFormValues,
  parsePackagingRuleInteger,
  type CreatePackagingRuleInput,
  type PackagingMethod,
  type PackagingRuleApiDto,
  type PackagingRuleConfigApiDto,
  type PackagingRuleConfigFormValues,
  type PackagingRuleDetailApiDto,
  type PackagingRuleLevelOptionApiDto,
  type PackagingRuleSpecOptionApiDto,
  type SavePackagingRuleConfigInput,
  type UpdatePackagingRuleInput,
} from "@/features/wms/packaging/packaging-rule/packaging-rule-contract";

const PACKAGING_RULE_QUERY_PATH =
  "/PackagingRuleApi/GetPackagingRuleAutoQueryDatas";
const PACKAGING_RULE_CREATE_PATH = "/PackagingRuleApi/StorePackagingRuleData";
const PACKAGING_RULE_UPDATE_PATH = "/PackagingRuleApi/UpdatePackagingRuleData";
const PACKAGING_RULE_DELETE_PATH = "/PackagingRuleApi/RemovePackagingRuleData";
const PACKAGING_RULE_BATCH_DELETE_PATH =
  "/PackagingRuleApi/RemoveBatchPackagingRuleDatas";
const PACKAGING_RULE_CONFIG_QUERY_PATH =
  "/PackagingRuleApi/GetPackagingRuleConfigByRuleCode";
const PACKAGING_RULE_CONFIG_SAVE_PATH =
  "/PackagingRuleApi/StorePackagingRuleConfig";
const PACKAGING_RULE_LEVEL_OPTIONS_PATH =
  "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas";
const PACKAGING_RULE_SPEC_OPTIONS_PATH =
  "/PackagingSpecApi/GetPackagingSpecAutoQueryDatas";

const PACKAGING_METHOD_PROTOCOL_VALUE: Record<PackagingMethod, string> = {
  auto: "\u81ea\u52a8",
  manual: "\u624b\u52a8",
};

type PackagingRuleDeletePayloadSource = PackagingRuleApiDto & {
  CompanyCode?: string;
  FactoryCode?: string;
};

export type PackagingRuleQueryDto = ApiQueryParams & {
  RuleCode?: string;
  RuleName?: string;
  IsDefault?: boolean;
  IsEnabled?: boolean;
};

export type PackagingRuleConfigQueryDto = ApiQueryParams & {
  RuleCode: string;
};

function normalizePackagingMethod(value: string): PackagingMethod {
  if (value === PACKAGING_METHOD_PROTOCOL_VALUE.manual || value === "manual") {
    return "manual";
  }

  return "auto";
}

function normalizePackagingRuleDetailDto(
  dto: Omit<PackagingRuleDetailApiDto, "PackagingMethod"> & {
    PackagingMethod: string;
  },
): PackagingRuleDetailApiDto {
  return {
    ...dto,
    PackagingMethod: normalizePackagingMethod(dto.PackagingMethod),
  };
}

function normalizePackagingRuleDto(
  dto: Omit<PackagingRuleApiDto, "Details"> & {
    Details?: Array<
      Omit<PackagingRuleDetailApiDto, "PackagingMethod"> & {
        PackagingMethod: string;
      }
    > | null;
  },
): PackagingRuleApiDto {
  return {
    ...dto,
    Details: (dto.Details ?? []).map(normalizePackagingRuleDetailDto),
  };
}

function normalizePackagingRuleListResult(
  result: DataResult<PackagingRuleApiDto[]>,
): DataResult<PackagingRuleApiDto[]> {
  return {
    ...result,
    Attach: result.Attach.map(normalizePackagingRuleDto),
  };
}

function toDetailPayload(input: CreatePackagingRuleInput["details"][number]) {
  return {
    Id: input.id,
    PackagingLevelCode: input.packagingLevelCode,
    SpecCode: input.specCode,
    StandardQuantity: parsePackagingRuleInteger(input.standardQuantity),
    MaxQuantity: parsePackagingRuleInteger(input.maxQuantity),
    PackagingMethod: PACKAGING_METHOD_PROTOCOL_VALUE[input.packagingMethod],
  };
}

function toCreatePayload(input: CreatePackagingRuleInput) {
  return {
    RuleCode: input.ruleCode,
    RuleName: input.ruleName,
    IsEnabled: input.isEnabled,
    IsDefault: input.isDefault,
    Details: input.details.map(toDetailPayload),
    Remark: input.remark,
  };
}

function toUpdatePayload(input: UpdatePackagingRuleInput) {
  return {
    Id: input.id,
    RuleCode: input.ruleCode,
    RuleName: input.ruleName,
    IsEnabled: input.isEnabled,
    IsDefault: input.isDefault,
    Details: input.details.map(toDetailPayload),
    Remark: input.remark,
  };
}

function toDeletePayload(dto: PackagingRuleDeletePayloadSource) {
  const payload = { ...dto };

  delete payload.CompanyCode;
  delete payload.FactoryCode;

  return payload;
}

function toConfigPayload(
  input: SavePackagingRuleConfigInput,
): PackagingRuleConfigApiDto {
  return {
    RuleCode: input.ruleCode,
    MixingRule: {
      ForbidDifferentProduct: input.mixingRule.forbidDifferentProduct,
      ForbidDifferentBatch: input.mixingRule.forbidDifferentBatch,
      ForbidDifferentWorkOrder: input.mixingRule.forbidDifferentWorkOrder,
      ForbidDifferentProductionTask:
        input.mixingRule.forbidDifferentProductionTask,
      ForbidCrossQualityStatus: input.mixingRule.forbidCrossQualityStatus,
    },
    LabelPrintRule: {
      ReprintLimit: parsePackagingRuleInteger(
        input.labelPrintRule.reprintLimit,
      ),
      DefaultTemplate: input.labelPrintRule.defaultTemplate,
    },
    SealingRule: {
      TimeoutAlert: parsePackagingRuleInteger(input.sealingRule.timeoutAlert),
      AutoSealOnWorkOrderComplete:
        input.sealingRule.autoSealOnWorkOrderComplete,
      AutoSealOnTaskComplete: input.sealingRule.autoSealOnTaskComplete,
      AutoSealOnFullBox: input.sealingRule.autoSealOnFullBox,
    },
    ExceptionRule: {
      ForceClearOnCycleTool: input.exceptionRule.forceClearOnCycleTool,
    },
  };
}

export async function getPackagingRules(
  query: PackagingRuleQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingRuleApiDto[]>> {
  const result = await getWmsClient().postDataResult<PackagingRuleApiDto[]>(
    PACKAGING_RULE_QUERY_PATH,
    query,
    options,
  );

  return normalizePackagingRuleListResult(result);
}

export function getPackagingRuleLevelOptions(
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingRuleLevelOptionApiDto[]>> {
  return getWmsClient().postDataResult<PackagingRuleLevelOptionApiDto[]>(
    PACKAGING_RULE_LEVEL_OPTIONS_PATH,
    {
      IsPaged: false,
      PageIndex: 1,
      PageSize: 1000,
    },
    options,
  );
}

export function getPackagingRuleSpecOptions(
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingRuleSpecOptionApiDto[]>> {
  return getWmsClient().postDataResult<PackagingRuleSpecOptionApiDto[]>(
    PACKAGING_RULE_SPEC_OPTIONS_PATH,
    {
      IsPaged: false,
      PageIndex: 1,
      PageSize: 1000,
    },
    options,
  );
}

export async function createPackagingRule(
  input: CreatePackagingRuleInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingRuleApiDto>> {
  const result = await getWmsClient().postDataResult<PackagingRuleApiDto>(
    PACKAGING_RULE_CREATE_PATH,
    toCreatePayload(input),
    options,
  );

  return {
    ...result,
    Attach: normalizePackagingRuleDto(result.Attach),
  };
}

export function updatePackagingRule(
  input: UpdatePackagingRuleInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getWmsClient().postDataResult<null>(
    PACKAGING_RULE_UPDATE_PATH,
    toUpdatePayload(input),
    options,
  );
}

export function deletePackagingRule(
  dto: PackagingRuleDeletePayloadSource,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getWmsClient().postDataResult<null>(
    PACKAGING_RULE_DELETE_PATH,
    toDeletePayload(dto),
    options,
  );
}

export function deletePackagingRules(
  dtos: PackagingRuleDeletePayloadSource[],
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getWmsClient().postDataResult<null>(
    PACKAGING_RULE_BATCH_DELETE_PATH,
    dtos.map(toDeletePayload),
    options,
  );
}

export async function getPackagingRuleConfig(
  query: PackagingRuleConfigQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<PackagingRuleConfigFormValues> {
  const result = await getWmsClient().postDataResult<
    PackagingRuleConfigApiDto[]
  >(PACKAGING_RULE_CONFIG_QUERY_PATH, query, options);

  if (!result.Attach.length) {
    return {
      ...defaultPackagingRuleConfigValues,
      ruleCode: query.RuleCode,
    };
  }

  return mapPackagingRuleConfigDtoToFormValues(result.Attach[0]);
}

export function savePackagingRuleConfig(
  input: SavePackagingRuleConfigInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getWmsClient().postDataResult<null>(
    PACKAGING_RULE_CONFIG_SAVE_PATH,
    toConfigPayload(input),
    options,
  );
}

export type {
  PackagingRuleApiDto,
  PackagingRuleConfigApiDto,
  PackagingRuleConfigFormValues,
  PackagingRuleLevelOptionApiDto,
  PackagingRuleSpecOptionApiDto,
};
