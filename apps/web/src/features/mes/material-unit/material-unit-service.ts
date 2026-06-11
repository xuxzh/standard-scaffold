import type { ApiQueryParams, DataResult } from "@/lib/api/http-client";
import { getMesClient } from "@/lib/api/mes-client";
import type { MaterialUnitApiDto } from "@/features/mes/material-unit/material-unit-contract";

const MATERIAL_UNIT_QUERY_PATH =
  "/MaterialInfoApi/GetMaterialUnitAutoQueryDatas";

export type MaterialUnitQueryDto = ApiQueryParams & {
  MaterialUnitCode?: string;
  MaterialUnitName?: string;
};

function toMaterialUnitQueryPayload(query: MaterialUnitQueryDto) {
  return {
    MaterialUnitCode: query.MaterialUnitCode ?? "",
    MaterialUnitName: query.MaterialUnitName ?? null,
    IsPaged: query.IsPaged ?? true,
    PageSize: query.PageSize ?? 1000,
    PageIndex: query.PageIndex ?? 1,
  };
}

export function getMaterialUnitOptions(
  query: MaterialUnitQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<MaterialUnitApiDto[]>> {
  return getMesClient().postDataResult<MaterialUnitApiDto[]>(
    MATERIAL_UNIT_QUERY_PATH,
    toMaterialUnitQueryPayload(query),
    options,
  );
}

export type { MaterialUnitApiDto };
