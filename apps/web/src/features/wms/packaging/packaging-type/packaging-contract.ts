export type PackagingModuleSummary = {
  pendingTasks: number;
  inProgressTasks: number;
  exceptionTasks: number;
};

export type PackagingTypeApiDto = {
  Id: number;
  TypeCode: string;
  TypeName: string;
  IsRecyclable: boolean;
  Description?: string | null;
  Remark?: string | null;
  CompanyCode?: string;
  FactoryCode?: string;
  CreationTime?: string | null;
  LastModificationTime?: string | null;
};

export type PackagingTypeRecord = {
  id: number;
  typeCode: string;
  typeName: string;
  isRecyclable: boolean;
  description: string;
  remark: string;
  companyCode?: string;
  factoryCode?: string;
  creationTime?: string | null;
  lastModificationTime?: string | null;
};

export type PackagingTypeFilters = {
  typeCode: string;
  typeName: string;
  isRecyclable: "all" | "true" | "false";
};

export type PackagingTypeListQuery = {
  TypeCode?: string;
  TypeName?: string;
  IsRecyclable?: boolean;
  Description?: string;
  IsPaged: true;
  PageIndex: number;
  PageSize: number;
};

export type CreatePackagingTypeInput = {
  typeCode: string;
  typeName: string;
  isRecyclable: boolean;
  description: string;
};

export type UpdatePackagingTypeInput = {
  id: number;
  typeName: string;
  isRecyclable: boolean;
  description: string;
};

export type PackagingTypeFormValues = {
  typeCode: string;
  typeName: string;
  isRecyclable: boolean;
  description: string;
};

export const packagingTypePageSize = 20;

export const packagingTypeDefaultFilters: PackagingTypeFilters = {
  typeCode: "",
  typeName: "",
  isRecyclable: "all",
};

export function mapPackagingTypeDtoToRecord(
  dto: PackagingTypeApiDto,
): PackagingTypeRecord {
  return {
    id: dto.Id,
    typeCode: dto.TypeCode,
    typeName: dto.TypeName,
    isRecyclable: dto.IsRecyclable,
    description: dto.Description ?? "",
    remark: dto.Remark ?? "",
    companyCode: dto.CompanyCode,
    factoryCode: dto.FactoryCode,
    creationTime: dto.CreationTime,
    lastModificationTime: dto.LastModificationTime,
  };
}

export const packagingModuleSummary: PackagingModuleSummary = {
  pendingTasks: 0,
  inProgressTasks: 0,
  exceptionTasks: 0,
};
