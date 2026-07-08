export type PackagingSpecApiDto = {
  Id: number;
  SpecCode: string;
  SpecName: string;
  PackagingTypeCode: string;
  PackagingTypeName: string;
  PackagingLevelCode: string;
  PackagingLevelName: string;
  BarcodeRuleCode: string;
  BarcodeRuleName: string;
  Length: number;
  Width: number;
  Height: number;
  Volume: number;
  MaxWeight: number;
  GrossWeight: number;
  TareWeight: number;
  StandardCapacity: number;
  StackLimit: number;
  Unit: string;
  IsEnabled: boolean;
  Remark?: string | null;
  CompanyCode?: string;
  FactoryCode?: string;
  CreationTime?: string | null;
  LastModificationTime?: string | null;
};

export type PackagingSpecRecord = {
  id: number;
  specCode: string;
  specName: string;
  packagingTypeCode: string;
  packagingTypeName: string;
  barcodeRuleCode: string;
  barcodeRuleName: string;
  length: number;
  width: number;
  height: number;
  volume: number;
  maxWeight: number;
  grossWeight: number;
  tareWeight: number;
  standardCapacity: number;
  stackLimit: number;
  unit: string;
  isEnabled: boolean;
  remark: string;
  creationTime?: string | null;
  lastModificationTime?: string | null;
};

export type PackagingSpecFilters = {
  specCode: string;
  specName: string;
  packagingTypeCode: string;
  isEnabled: "all" | "true" | "false";
};

export type PackagingSpecListQuery = {
  SpecCode?: string;
  SpecName?: string;
  PackagingTypeCode?: string;
  IsEnabled?: boolean;
  IsPaged: boolean;
  PageIndex: number;
  PageSize: number;
};

export type PackagingTypeOptionDto = {
  Id: number;
  TypeCode: string;
  TypeName: string;
};

export type PackagingSpecFormValues = {
  specCode: string;
  specName: string;
  packagingTypeCode: string;
  packagingTypeName: string;
  barcodeRuleCode: string;
  barcodeRuleName: string;
  length: string;
  width: string;
  height: string;
  volume: string;
  maxWeight: string;
  grossWeight: string;
  tareWeight: string;
  standardCapacity: string;
  stackLimit: string;
  unit: string;
  isEnabled: boolean;
};

export type CreatePackagingSpecInput = PackagingSpecFormValues;

export type UpdatePackagingSpecInput = PackagingSpecFormValues & {
  id: number;
};

export const packagingSpecPageSize = 20;

export const packagingSpecDefaultFilters: PackagingSpecFilters = {
  specCode: "",
  specName: "",
  packagingTypeCode: "",
  isEnabled: "all",
};

export function mapPackagingSpecDtoToRecord(
  dto: PackagingSpecApiDto,
): PackagingSpecRecord {
  return {
    id: dto.Id,
    specCode: dto.SpecCode,
    specName: dto.SpecName,
    packagingTypeCode: dto.PackagingTypeCode,
    packagingTypeName: dto.PackagingTypeName,
    barcodeRuleCode: dto.BarcodeRuleCode,
    barcodeRuleName: dto.BarcodeRuleName,
    length: dto.Length,
    width: dto.Width,
    height: dto.Height,
    volume: dto.Volume,
    maxWeight: dto.MaxWeight,
    grossWeight: dto.GrossWeight,
    tareWeight: dto.TareWeight,
    standardCapacity: dto.StandardCapacity,
    stackLimit: dto.StackLimit,
    unit: dto.Unit,
    isEnabled: dto.IsEnabled,
    remark: dto.Remark ?? "",
    creationTime: dto.CreationTime,
    lastModificationTime: dto.LastModificationTime,
  };
}
