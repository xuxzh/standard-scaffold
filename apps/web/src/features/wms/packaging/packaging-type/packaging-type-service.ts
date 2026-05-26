import type { ApiQueryParams, DataResult } from "@/lib/api/http-client";
import { getWmsClient } from "@/lib/api/wms-client";
import type {
  CreatePackagingTypeInput,
  PackagingTypeApiDto,
  UpdatePackagingTypeInput,
} from "@/features/wms/packaging/packaging-type/packaging-contract";

const PACKAGING_TYPE_QUERY_PATH =
  "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas";
const PACKAGING_TYPE_CREATE_PATH = "/PackagingTypeApi/StorePackagingTypeData";
const PACKAGING_TYPE_UPDATE_PATH = "/PackagingTypeApi/UpdatePackagingTypeData";
const PACKAGING_TYPE_DELETE_PATH = "/PackagingTypeApi/RemovePackagingTypeData";
const PACKAGING_TYPE_BATCH_DELETE_PATH =
  "/PackagingTypeApi/RemoveBatchPackagingTypeDatas";

export type PackagingTypeQueryDto = ApiQueryParams & {
  TypeCode?: string;
  TypeName?: string;
  IsRecyclable?: boolean;
  Description?: string;
};

function toCreatePayload(input: CreatePackagingTypeInput) {
  return {
    TypeCode: input.typeCode,
    TypeName: input.typeName,
    IsRecyclable: input.isRecyclable,
    Description: input.description,
    Remark: "",
  };
}

function toUpdatePayload(input: UpdatePackagingTypeInput) {
  return {
    NeedUpdateFields: {
      Id: input.id,
      TypeName: input.typeName,
      IsRecyclable: input.isRecyclable,
      Description: input.description,
    },
  };
}

export function getPackagingTypes(
  query: PackagingTypeQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingTypeApiDto[]>> {
  return getWmsClient().postDataResult<PackagingTypeApiDto[]>(
    PACKAGING_TYPE_QUERY_PATH,
    query,
    options,
  );
}

export function createPackagingType(
  input: CreatePackagingTypeInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingTypeApiDto>> {
  return getWmsClient().postDataResult<PackagingTypeApiDto>(
    PACKAGING_TYPE_CREATE_PATH,
    toCreatePayload(input),
    options,
  );
}

export function updatePackagingType(
  input: UpdatePackagingTypeInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getWmsClient().postDataResult<null>(
    PACKAGING_TYPE_UPDATE_PATH,
    toUpdatePayload(input),
    options,
  );
}

export function deletePackagingType(
  dto: PackagingTypeApiDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getWmsClient().postDataResult<null>(
    PACKAGING_TYPE_DELETE_PATH,
    dto,
    options,
  );
}

export function deletePackagingTypes(
  dtos: PackagingTypeApiDto[],
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getWmsClient().postDataResult<null>(
    PACKAGING_TYPE_BATCH_DELETE_PATH,
    dtos,
    options,
  );
}

export type { PackagingTypeApiDto };
