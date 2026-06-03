import type { ApiQueryParams, DataResult } from "@/lib/api/http-client";
import { getMesClient } from "@/lib/api/mes-client";
import type {
  CreatePackagingKitInput,
  PackagingKitApiDto as ContractPackagingKitApiDto,
  PackagingKitMaterialApiDto,
  UpdatePackagingKitInput,
} from "@/features/mes/packaging/packaging-kit/packaging-kit-contract";
import { parsePackagingKitChildQuantity } from "@/features/mes/packaging/packaging-kit/packaging-kit-contract";

const PACKAGING_KIT_QUERY_PATH =
  "/PackagingKitApi/GetPackagingKitAutoQueryDatas";
const PACKAGING_KIT_CREATE_PATH = "/PackagingKitApi/StorePackagingKitData";
const PACKAGING_KIT_UPDATE_PATH = "/PackagingKitApi/UpdatePackagingKitData";
const PACKAGING_KIT_DELETE_PATH = "/PackagingKitApi/RemovePackagingKitData";
const PACKAGING_KIT_BATCH_DELETE_PATH =
  "/PackagingKitApi/RemoveBatchPackagingKitDatas";
const PACKAGING_KIT_MATERIAL_QUERY_PATH = "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas";

type PackagingKitDeletePayloadSource = ContractPackagingKitApiDto & {
  CompanyCode?: string;
  FactoryCode?: string;
};

export type PackagingKitApiDto = PackagingKitDeletePayloadSource;

export type PackagingKitQueryDto = ApiQueryParams & {
  KitCode?: string;
  KitName?: string;
};

export type PackagingKitMaterialQueryDto = ApiQueryParams & {
  MaterialCode?: string;
  MaterialName?: string;
};

function normalizeChildren(children: CreatePackagingKitInput["children"]) {
  return children.map((child) => ({
    Code: child.code,
    Name: child.name,
    Quantity: parsePackagingKitChildQuantity(child.quantity),
    Unit: child.unit,
  }));
}

function toCreatePayload(input: CreatePackagingKitInput) {
  return {
    KitCode: input.kitCode,
    KitName: input.kitName,
    MainMaterialCode: input.mainMaterialCode,
    MainMaterialName: input.mainMaterialName,
    Unit: input.unit,
    IsVirtualMain: input.isVirtualMain,
    Children: normalizeChildren(input.children),
    Remark: input.remark,
  };
}

function toUpdatePayload(input: UpdatePackagingKitInput) {
  return {
    NeedUpdateFields: {
      Id: input.id,
      KitName: input.kitName,
      MainMaterialCode: input.mainMaterialCode,
      MainMaterialName: input.mainMaterialName,
      Unit: input.unit,
      IsVirtualMain: input.isVirtualMain,
      Children: normalizeChildren(input.children),
      Remark: input.remark,
    },
  };
}

function toDeletePayload(dto: PackagingKitDeletePayloadSource) {
  const payload = { ...dto };

  delete payload.CompanyCode;
  delete payload.FactoryCode;

  return payload;
}

export function getPackagingKits(
  query: PackagingKitQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingKitApiDto[]>> {
  return getMesClient().postDataResult<PackagingKitApiDto[]>(
    PACKAGING_KIT_QUERY_PATH,
    query,
    options,
  );
}

export function getPackagingKitMaterialOptions(
  query: PackagingKitMaterialQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingKitMaterialApiDto[]>> {
  return getMesClient().postDataResult<PackagingKitMaterialApiDto[]>(
    PACKAGING_KIT_MATERIAL_QUERY_PATH,
    query,
    options,
  );
}

export function createPackagingKit(
  input: CreatePackagingKitInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingKitApiDto>> {
  return getMesClient().postDataResult<PackagingKitApiDto>(
    PACKAGING_KIT_CREATE_PATH,
    toCreatePayload(input),
    options,
  );
}

export function updatePackagingKit(
  input: UpdatePackagingKitInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    PACKAGING_KIT_UPDATE_PATH,
    toUpdatePayload(input),
    options,
  );
}

export function deletePackagingKit(
  dto: PackagingKitDeletePayloadSource,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    PACKAGING_KIT_DELETE_PATH,
    toDeletePayload(dto),
    options,
  );
}

export function deletePackagingKits(
  dtos: PackagingKitDeletePayloadSource[],
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    PACKAGING_KIT_BATCH_DELETE_PATH,
    dtos.map(toDeletePayload),
    options,
  );
}

export type { PackagingKitMaterialApiDto };
