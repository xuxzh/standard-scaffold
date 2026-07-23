import type { DataResult } from "@/lib/api/http-client";
import { getAppClient } from "@/lib/api/app-client";
import { getMesClient } from "@/lib/api/mes-client";
import { getWmsClient } from "@/lib/api/wms-client";
import type {
  CancelRequestDto,
  CommonDataImportDto,
  DataImportQueryDto,
  DataImportRowData,
  DataImportTemplateMetadata,
  DataImportWithProgressResult,
  DownloadTemplateExcelQueryDto,
  ImportModuleKey,
} from "@/components/data-import/data-import-contract";

const GET_METADATA_PATH = "/DataImportApi/GetMetadataDatas";
const STORE_METADATA_PATH = "/TemplateManagementApi/StoreMetaDatas";
const DOWNLOAD_TEMPLATE_PATH = "/DataImportApi/DownloadTemplateExcel";
const EXPORT_ERROR_PATH = "/DataImportApi/ExportErrorExcelDatas";
const DATA_IMPORT_WITH_PROGRESS_PATH = "/DataImportApi/DataImportWithProgress";
const CANCEL_TASK_PATH = "/ImportTask/CancelTask";

type DataImportRequestOptions = {
  signal?: AbortSignal;
  serviceRoute?: ImportModuleKey;
};

function selectClientForModule(
  moduleKey: ImportModuleKey,
  serviceRoute?: ImportModuleKey,
) {
  switch (serviceRoute ?? moduleKey) {
    case "MOM":
      return getMesClient();
    case "WMS":
      return getWmsClient();
    case "PlatformV2":
      return getAppClient();
    case "IOT":
      throw new Error("Unsupported import module: IOT");
  }
}

export function getMetadataDatas(
  dto: DataImportQueryDto,
  moduleKey: ImportModuleKey,
  options: DataImportRequestOptions = {},
): Promise<DataResult<DataImportTemplateMetadata[]>> {
  const client = selectClientForModule(moduleKey, options.serviceRoute);

  return client.postDataResult<DataImportTemplateMetadata[]>(
    GET_METADATA_PATH,
    dto,
    options,
  );
}

export function storeMetaDatas(
  payload: DataImportTemplateMetadata[],
  moduleKey: ImportModuleKey,
  businessKey: string,
  options: DataImportRequestOptions = {},
): Promise<DataResult<null>> {
  const client = selectClientForModule(moduleKey, options.serviceRoute);
  const path = `${STORE_METADATA_PATH}?moduleKey=${moduleKey}&businessKey=${businessKey}`;

  return client.postDataResult<null>(path, payload, options);
}

export function downloadTemplateExcel(
  dto: DownloadTemplateExcelQueryDto,
  moduleKey: ImportModuleKey,
  options: DataImportRequestOptions = {},
): Promise<DataResult<string>> {
  const client = selectClientForModule(moduleKey, options.serviceRoute);

  return client.postDataResult<string>(
    DOWNLOAD_TEMPLATE_PATH,
    dto,
    options,
  );
}

export type ExportErrorExcelDto = {
  ModuleKey: string;
  BusinessKey: string;
  ErrorDatas: DataImportRowData[];
};

export function exportErrorExcelDatas(
  dto: ExportErrorExcelDto,
  moduleKey: ImportModuleKey,
  options: DataImportRequestOptions = {},
): Promise<DataResult<string>> {
  const client = selectClientForModule(moduleKey, options.serviceRoute);

  return client.postDataResult<string>(EXPORT_ERROR_PATH, dto, options);
}

export function dataImportWithProgress<
  T extends DataImportRowData = DataImportRowData,
>(
  dto: CommonDataImportDto,
  moduleKey: ImportModuleKey,
  options: DataImportRequestOptions = {},
): Promise<DataImportWithProgressResult<T>> {
  const client = selectClientForModule(moduleKey, options.serviceRoute);

  return client.post<DataImportWithProgressResult<T>>(
    DATA_IMPORT_WITH_PROGRESS_PATH,
    dto,
    options,
  );
}

export function cancelImportTask(
  dto: CancelRequestDto,
  moduleKey: ImportModuleKey,
  options: DataImportRequestOptions = {},
): Promise<DataResult<null>> {
  const client = selectClientForModule(moduleKey, options.serviceRoute);

  return client.postDataResult<null>(CANCEL_TASK_PATH, dto, options);
}
