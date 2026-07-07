/**
 * Public types and helpers for the data-import capability.
 *
 * The shape mirrors the contract that `simple-data-import` from
 * `rh-standard-product-platform` relied on, but trimmed down to the
 * subset that the React port actually consumes. Keep this file as the
 * single source of truth for DTOs, status enums, and module routing.
 */

export type ImportModuleKey = "MOM" | "PlatformV2" | "WMS" | "IOT";

export type ImportStatus =
  | "InImport"
  | "ImportFail"
  | "ImportSuccess"
  | "ImportClose"
  | string;

export type CommonDataImportDto = {
  ModuleKey: string;
  BusinessKey: string;
  FileStreamString: string;
  RequestId?: string;
  CompanyCode?: string;
  FactoryCode?: string;
};

export type DataImportQueryDto = {
  ModuleKey: string;
  BusinessKey: string;
  CompanyCode?: string;
  FactoryCode?: string;
};

export type DownloadTemplateExcelQueryDto = {
  IsConfigureImportTemplateExcel: boolean;
  ModuleKey: string;
  BusinessKey: string;
  ErrorDatas: unknown[];
};

export type CancelRequestDto = {
  RequestId: string;
};

export type ImportUiStatus =
  | "idle"
  | "uploading"
  | "error"
  | "cancel"
  | "success";

export type DataImportRowData = {
  Success: boolean;
  Message: string;
  [key: string]: unknown;
};

export type DataImportTemplateMetadata = {
  Id?: string;
  FieldName: string;
  FieldDisplayName: string;
  FieldDescription?: string;
  IsUse: boolean;
  IsRequired: boolean;
  IsSystemRequired?: boolean;
  SortId: number;
};

export type DataImportWithProgressResult<
  T extends DataImportRowData = DataImportRowData,
> = {
  Success: boolean;
  Code: string | null;
  Message: string;
  Attach: {
    Status: ImportStatus;
    ErrorDatas: T[];
  } | null;
  DataHeadFields: Array<{
    FieldName: string;
    FieldDescription: string;
  }>;
  SkipCount?: number;
  TotalCount?: number;
  Record?: number;
  SuccessQty?: number;
  ErrorQty?: number;
  TotalQty?: number;
};

export type ImportSignalRReceivedData = {
  Step: number;
  Progress: number;
  Message: string;
  DateTime: string;
  Status: ImportStatus;
  RequestId: string;
};

export const importModulePortMap: Record<ImportModuleKey, number> = {
  MOM: 8282,
  PlatformV2: 8288,
  WMS: 8283,
  IOT: 7281,
};

const DEFAULT_HUB_NAME = "realTimeProductionDataHub";

export function getImportListenMethod(
  moduleKey: ImportModuleKey,
  businessKey: string,
  explicitListenMethod?: string,
) {
  return explicitListenMethod ?? `${moduleKey}-${businessKey}`;
}

export function getImportGroupName(
  moduleKey: ImportModuleKey,
  businessKey: string,
) {
  return `${moduleKey}-${businessKey}`;
}

export function getDefaultImportHubName() {
  return DEFAULT_HUB_NAME;
}
