import type { ApiQueryParams, DataResult } from "@/lib/api/http-client";
import { getMesClient } from "@/lib/api/mes-client";
import type {
  CreatePackagingLevelInput,
  PackagingLevelApiDto as ContractPackagingLevelApiDto,
  PackagingLevelTreeDto,
  UpdatePackagingLevelInput,
} from "@/features/mes/packaging/packaging-level/packaging-level-contract";

const PACKAGING_LEVEL_QUERY_PATH =
  "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas";
const PACKAGING_LEVEL_TREE_PATH = "/PackagingLevelApi/GetPackagingLevelTree";
const PACKAGING_LEVEL_CREATE_PATH =
  "/PackagingLevelApi/StorePackagingLevelData";
const PACKAGING_LEVEL_UPDATE_PATH =
  "/PackagingLevelApi/UpdatePackagingLevelData";
const PACKAGING_LEVEL_DELETE_PATH =
  "/PackagingLevelApi/RemovePackagingLevelData";
const PACKAGING_LEVEL_BATCH_DELETE_PATH =
  "/PackagingLevelApi/RemoveBatchPackagingLevelDatas";

export type PackagingLevelApiDto = ContractPackagingLevelApiDto & {
  CompanyCode?: string;
  FactoryCode?: string;
};

export type PackagingLevelQueryDto = ApiQueryParams & {
  LevelCode?: string;
  LevelName?: string;
  ParentLevelCode?: string;
};

function normalizeOptionalText(value: string | undefined) {
  return value ?? "";
}

function normalizeSequence(value: string) {
  return Number.parseInt(value, 10);
}

function toCreatePayload(input: CreatePackagingLevelInput) {
  return {
    LevelCode: input.levelCode,
    LevelSequence: normalizeSequence(input.levelSequence),
    LevelName: input.levelName,
    ParentLevelCode: normalizeOptionalText(input.parentLevelCode),
    ParentLevelName: normalizeOptionalText(input.parentLevelName),
    Description: input.description,
    Remark: "",
  };
}

function toUpdatePayload(input: UpdatePackagingLevelInput) {
  return {
    NeedUpdateFields: {
      Id: input.id,
      LevelSequence: normalizeSequence(input.levelSequence),
      LevelName: input.levelName,
      ParentLevelCode: normalizeOptionalText(input.parentLevelCode),
      ParentLevelName: normalizeOptionalText(input.parentLevelName),
      Description: input.description,
    },
  };
}

function toDeletePayload(dto: PackagingLevelApiDto) {
  const payload = { ...dto };

  delete payload.CompanyCode;
  delete payload.FactoryCode;

  return payload;
}

export function getPackagingLevels(
  query: PackagingLevelQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingLevelApiDto[]>> {
  return getMesClient().postDataResult<PackagingLevelApiDto[]>(
    PACKAGING_LEVEL_QUERY_PATH,
    query,
    options,
  );
}

export function getPackagingLevelOptions(
  query: PackagingLevelQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingLevelApiDto[]>> {
  return getMesClient().postDataResult<PackagingLevelApiDto[]>(
    PACKAGING_LEVEL_QUERY_PATH,
    query,
    options,
  );
}

export function getPackagingLevelTree(
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingLevelTreeDto[]>> {
  return getMesClient().postDataResult<PackagingLevelTreeDto[]>(
    PACKAGING_LEVEL_TREE_PATH,
    undefined,
    options,
  );
}

export function createPackagingLevel(
  input: CreatePackagingLevelInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PackagingLevelApiDto>> {
  return getMesClient().postDataResult<PackagingLevelApiDto>(
    PACKAGING_LEVEL_CREATE_PATH,
    toCreatePayload(input),
    options,
  );
}

export function updatePackagingLevel(
  input: UpdatePackagingLevelInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    PACKAGING_LEVEL_UPDATE_PATH,
    toUpdatePayload(input),
    options,
  );
}

export function deletePackagingLevel(
  dto: PackagingLevelApiDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    PACKAGING_LEVEL_DELETE_PATH,
    toDeletePayload(dto),
    options,
  );
}

export function deletePackagingLevels(
  dtos: PackagingLevelApiDto[],
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    PACKAGING_LEVEL_BATCH_DELETE_PATH,
    dtos.map(toDeletePayload),
    options,
  );
}

export type { PackagingLevelTreeDto };
