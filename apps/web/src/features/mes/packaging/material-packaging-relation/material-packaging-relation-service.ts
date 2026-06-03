import type { ApiQueryParams, DataResult } from "@/lib/api/http-client";
import { getMesClient } from "@/lib/api/mes-client";
import {
  parseMaterialPackagingRelationInteger,
  type CreateMaterialPackagingRelationInput,
  type MaterialOptionApiDto,
  type MaterialPackagingRelationApiDto,
  type MaterialPackagingRelationDetailFormValues,
  type PackagingRuleOptionApiDto,
  type UpdateMaterialPackagingRelationInput,
} from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";

const MATERIAL_PACKAGING_RELATION_QUERY_PATH =
  "/MaterialPackagingRelationApi/GetMaterialPackagingRelationAutoQueryDatas";
const MATERIAL_PACKAGING_RELATION_CREATE_PATH =
  "/MaterialPackagingRelationApi/StoreMaterialPackagingRelationData";
const MATERIAL_PACKAGING_RELATION_UPDATE_PATH =
  "/MaterialPackagingRelationApi/UpdateMaterialPackagingRelationData";
const MATERIAL_PACKAGING_RELATION_DELETE_PATH =
  "/MaterialPackagingRelationApi/RemoveMaterialPackagingRelationData";
const MATERIAL_PACKAGING_RELATION_BATCH_DELETE_PATH =
  "/MaterialPackagingRelationApi/RemoveBatchMaterialPackagingRelationDatas";
const MATERIAL_OPTIONS_PATH = "/Material/GetMaterialAutoQueryDatas";
const PACKAGING_RULE_OPTIONS_PATH =
  "/PackagingRuleApi/GetPackagingRuleAutoQueryDatas";

type MaterialPackagingRelationDeletePayloadSource =
  MaterialPackagingRelationApiDto & {
    CompanyCode?: string;
    FactoryCode?: string;
  };

export type MaterialPackagingRelationQueryDto = ApiQueryParams & {
  MaterialCode?: string;
  MaterialName?: string;
  PackagingRuleCode?: string;
  PackagingRuleName?: string;
};

export type MaterialOptionQueryDto = ApiQueryParams & {
  MaterialCode?: string;
  MaterialName?: string;
};

export type PackagingRuleOptionQueryDto = ApiQueryParams & {
  RuleCode?: string;
  RuleName?: string;
};

function toDetailPayload(
  input: MaterialPackagingRelationDetailFormValues,
) {
  return {
    LevelSequence: parseMaterialPackagingRelationInteger(input.levelSequence),
    PackagingLevelCode: input.packagingLevelCode,
    PackagingLevelName: input.packagingLevelName,
    SpecCode: input.specCode,
    SpecName: input.specName,
    Quantity: parseMaterialPackagingRelationInteger(input.quantity),
    Unit: input.unit.trim(),
    PackagingTypeName: input.packagingTypeName,
    BoxLabelPrintTemplate: input.boxLabelPrintTemplate.trim(),
    PackingListPrintTemplate: input.packingListPrintTemplate.trim(),
  };
}

function toCreatePayload(input: CreateMaterialPackagingRelationInput) {
  return {
    MaterialCode: input.materialCode,
    MaterialName: input.materialName,
    PackagingRuleCode: input.packagingRuleCode,
    PackagingRuleName: input.packagingRuleName,
    Details: input.details.map(toDetailPayload),
    Remark: input.remark,
  };
}

function toUpdatePayload(input: UpdateMaterialPackagingRelationInput) {
  return {
    NeedUpdateFields: {
      Id: input.id,
      MaterialCode: input.materialCode,
      MaterialName: input.materialName,
      PackagingRuleCode: input.packagingRuleCode,
      PackagingRuleName: input.packagingRuleName,
      Details: input.details.map(toDetailPayload),
      Remark: input.remark,
    },
  };
}

function toDeletePayload(dto: MaterialPackagingRelationDeletePayloadSource) {
  const payload = { ...dto };

  delete payload.CompanyCode;
  delete payload.FactoryCode;

  return payload;
}

export async function getMaterialPackagingRelations(
  query: MaterialPackagingRelationQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<MaterialPackagingRelationApiDto[]>> {
  return getMesClient().postDataResult<MaterialPackagingRelationApiDto[]>(
    MATERIAL_PACKAGING_RELATION_QUERY_PATH,
    query,
    options,
  );
}

export async function getMaterialOptions(
  query: MaterialOptionQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<MaterialOptionApiDto[]>> {
  return getMesClient().postDataResult<MaterialOptionApiDto[]>(
    MATERIAL_OPTIONS_PATH,
    query,
    options,
  );
}

export async function getPackagingRuleOptions(
  query: PackagingRuleOptionQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingRuleOptionApiDto[]>> {
  return getMesClient().postDataResult<PackagingRuleOptionApiDto[]>(
    PACKAGING_RULE_OPTIONS_PATH,
    query,
    options,
  );
}

export async function createMaterialPackagingRelation(
  input: CreateMaterialPackagingRelationInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<MaterialPackagingRelationApiDto>> {
  return getMesClient().postDataResult<MaterialPackagingRelationApiDto>(
    MATERIAL_PACKAGING_RELATION_CREATE_PATH,
    toCreatePayload(input),
    options,
  );
}

export async function updateMaterialPackagingRelation(
  input: UpdateMaterialPackagingRelationInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    MATERIAL_PACKAGING_RELATION_UPDATE_PATH,
    toUpdatePayload(input),
    options,
  );
}

export async function deleteMaterialPackagingRelation(
  dto: MaterialPackagingRelationDeletePayloadSource,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    MATERIAL_PACKAGING_RELATION_DELETE_PATH,
    toDeletePayload(dto),
    options,
  );
}

export async function deleteMaterialPackagingRelations(
  dtos: MaterialPackagingRelationDeletePayloadSource[],
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    MATERIAL_PACKAGING_RELATION_BATCH_DELETE_PATH,
    dtos.map(toDeletePayload),
    options,
  );
}
