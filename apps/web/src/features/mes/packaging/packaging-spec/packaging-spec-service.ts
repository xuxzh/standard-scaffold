import type { DataResult } from "@/lib/api/http-client";
import { getMesClient } from "@/lib/api/mes-client";
import type {
  CreatePackagingSpecInput,
  PackagingSpecApiDto,
  PackagingSpecListQuery,
  UpdatePackagingSpecInput,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-contract";
import type { PackagingTypeOptionDto } from "@/features/mes/packaging/packaging-type/packaging-contract";

const PACKAGING_SPEC_QUERY_PATH =
  "/PackagingSpecApi/GetPackagingSpecAutoQueryDatas";
const PACKAGING_SPEC_CREATE_PATH = "/PackagingSpecApi/StorePackagingSpecData";
const PACKAGING_SPEC_UPDATE_PATH = "/PackagingSpecApi/UpdatePackagingSpecData";
const PACKAGING_SPEC_DELETE_PATH = "/PackagingSpecApi/RemovePackagingSpecData";
const PACKAGING_SPEC_BATCH_DELETE_PATH =
  "/PackagingSpecApi/RemoveBatchPackagingSpecDatas";
const PACKAGING_TYPE_OPTIONS_PATH =
  "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas";

function toNumber(value: string) {
  return Number(value);
}

function toCreatePayload(input: CreatePackagingSpecInput) {
  return {
    SpecCode: input.specCode,
    SpecName: input.specName,
    PackagingTypeCode: input.packagingTypeCode,
    PackagingTypeName: input.packagingTypeName,
    BarcodeRuleCode: input.barcodeRuleCode,
    BarcodeRuleName: input.barcodeRuleName,
    Length: toNumber(input.length),
    Width: toNumber(input.width),
    Height: toNumber(input.height),
    Volume: toNumber(input.volume),
    MaxWeight: toNumber(input.maxWeight),
    GrossWeight: toNumber(input.grossWeight),
    TareWeight: toNumber(input.tareWeight),
    StandardCapacity: toNumber(input.standardCapacity),
    StackLimit: toNumber(input.stackLimit),
    Unit: input.unit,
    IsEnabled: input.isEnabled,
    Remark: "",
  };
}

function toUpdatePayload(input: UpdatePackagingSpecInput) {
  return {
    NeedUpdateFields: {
      Id: input.id,
      SpecName: input.specName,
      PackagingTypeCode: input.packagingTypeCode,
      PackagingTypeName: input.packagingTypeName,
      BarcodeRuleCode: input.barcodeRuleCode,
      BarcodeRuleName: input.barcodeRuleName,
      Length: toNumber(input.length),
      Width: toNumber(input.width),
      Height: toNumber(input.height),
      Volume: toNumber(input.volume),
      MaxWeight: toNumber(input.maxWeight),
      GrossWeight: toNumber(input.grossWeight),
      TareWeight: toNumber(input.tareWeight),
      StandardCapacity: toNumber(input.standardCapacity),
      StackLimit: toNumber(input.stackLimit),
      Unit: input.unit,
      IsEnabled: input.isEnabled,
    },
  };
}

function toDeletePayload(dto: PackagingSpecApiDto) {
  const payload = { ...dto };

  delete payload.CompanyCode;
  delete payload.FactoryCode;

  return payload;
}

export function getPackagingSpecList(
  query: PackagingSpecListQuery,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingSpecApiDto[]>> {
  return getMesClient().postDataResult<PackagingSpecApiDto[]>(
    PACKAGING_SPEC_QUERY_PATH,
    query,
    options,
  );
}

export function getPackagingTypeOptions(
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingTypeOptionDto[]>> {
  return getMesClient().postDataResult<PackagingTypeOptionDto[]>(
    PACKAGING_TYPE_OPTIONS_PATH,
    {
      IsPaged: false,
      PageIndex: 1,
      PageSize: 1000,
    },
    options,
  );
}

export function createPackagingSpec(
  input: CreatePackagingSpecInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingSpecApiDto>> {
  return getMesClient().postDataResult<PackagingSpecApiDto>(
    PACKAGING_SPEC_CREATE_PATH,
    toCreatePayload(input),
    options,
  );
}

export function updatePackagingSpec(
  input: UpdatePackagingSpecInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    PACKAGING_SPEC_UPDATE_PATH,
    toUpdatePayload(input),
    options,
  );
}

export function deletePackagingSpec(
  dto: PackagingSpecApiDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    PACKAGING_SPEC_DELETE_PATH,
    toDeletePayload(dto),
    options,
  );
}

export function deletePackagingSpecs(
  dtos: PackagingSpecApiDto[],
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    PACKAGING_SPEC_BATCH_DELETE_PATH,
    dtos.map(toDeletePayload),
    options,
  );
}

export type { PackagingSpecApiDto, PackagingSpecListQuery };
export type { PackagingTypeOptionDto } from "@/features/mes/packaging/packaging-type/packaging-contract";
