import type { ApiQueryParams, DataResult } from "@/lib/api/http-client";
import { getMesClient } from "@/lib/api/mes-client";
import type { MaterialPickerApiDto } from "@/features/mes/material/material-picker-contract";

const MATERIAL_PICKER_QUERY_PATH =
  "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas";
const MATERIAL_PICKER_COMPANY_CODE = "00000";
const MATERIAL_PICKER_FACTORY_CODE = "00000.00001";

export type MaterialPickerQueryDto = ApiQueryParams & {
  MaterialCode?: string;
  MaterialName?: string;
};

function toMaterialPickerQueryPayload(query: MaterialPickerQueryDto) {
  return {
    MaterialCode: query.MaterialCode ?? "",
    MaterialName: query.MaterialName ?? "",
    MaterialSpecification: "",
    IsProduct: null,
    IsSemiFinishedProduct: null,
    IsMaterial: null,
    MaterialCategoryCode: null,
    IsSingleCodeControl: null,
    MaterialAttribute: null,
    IsUse: null,
    IsPaged: query.IsPaged ?? true,
    PageSize: query.PageSize ?? 20,
    PageIndex: query.PageIndex ?? 1,
    CompanyCode: MATERIAL_PICKER_COMPANY_CODE,
    FactoryCode: MATERIAL_PICKER_FACTORY_CODE,
  };
}

export function getMaterialPickerRecords(
  query: MaterialPickerQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<MaterialPickerApiDto[] | null>> {
  return getMesClient().postDataResult<MaterialPickerApiDto[] | null>(
    MATERIAL_PICKER_QUERY_PATH,
    toMaterialPickerQueryPayload(query),
    options,
  );
}

export type { MaterialPickerApiDto };
