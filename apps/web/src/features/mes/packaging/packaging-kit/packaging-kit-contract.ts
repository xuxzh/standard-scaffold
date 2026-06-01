export type PackagingKitChildApiDto = {
  Code: string;
  Name: string;
  Quantity: number;
  Unit?: string | null;
};

export type PackagingKitApiDto = {
  Id: number;
  KitCode: string;
  KitName: string;
  MainMaterialCode: string;
  MainMaterialName: string;
  Unit: string;
  IsVirtualMain: boolean;
  ChildCount?: number | null;
  Children?: PackagingKitChildApiDto[] | null;
  Remark?: string | null;
  CreationTime?: string | null;
  LastModificationTime?: string | null;
};

export type PackagingKitChild = {
  code: string;
  name: string;
  quantity: number;
  unit: string;
};

export type PackagingKitRecord = {
  id: number;
  kitCode: string;
  kitName: string;
  mainMaterialCode: string;
  mainMaterialName: string;
  unit: string;
  isVirtualMain: boolean;
  childCount: number;
  children: PackagingKitChild[];
  remark: string;
  creationTime?: string | null;
  lastModificationTime?: string | null;
};

export type PackagingKitFilters = {
  kitCode: string;
  kitName: string;
};

export type PackagingKitListQuery = {
  KitCode?: string;
  KitName?: string;
  IsPaged: boolean;
  PageIndex: number;
  PageSize: number;
};

export type PackagingKitChildFormValues = {
  code: string;
  name: string;
  quantity: string;
  unit: string;
};

export type PackagingKitFormValues = {
  kitCode: string;
  kitName: string;
  mainMaterialCode: string;
  mainMaterialName: string;
  unit: string;
  isVirtualMain: boolean;
  children: PackagingKitChildFormValues[];
  remark: string;
};

export type CreatePackagingKitInput = PackagingKitFormValues;

export type UpdatePackagingKitInput = PackagingKitFormValues & {
  id: number;
};

export type PackagingKitMaterialApiDto = {
  Id: number;
  MaterialCode: string;
  MaterialName: string;
  Unit?: string | null;
  MaterialTypeName?: string | null;
};

export type PackagingKitMaterialFilters = {
  materialCode: string;
  materialName: string;
};

export type PackagingKitMaterialListQuery = {
  MaterialCode?: string;
  MaterialName?: string;
  IsPaged: boolean;
  PageIndex: number;
  PageSize: number;
};

export type PackagingKitMaterialOption = {
  code: string;
  name: string;
  unit: string;
  typeName: string;
};

export const packagingKitPageSize = 20;
export const packagingKitMaterialPageSize = 20;

export const packagingKitDefaultFilters: PackagingKitFilters = {
  kitCode: "",
  kitName: "",
};

export const packagingKitDefaultMaterialFilters: PackagingKitMaterialFilters = {
  materialCode: "",
  materialName: "",
};

export function isValidPackagingKitChildQuantity(value: string): boolean {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return false;
  }

  return Number.parseInt(trimmed, 10) >= 1;
}

export function parsePackagingKitChildQuantity(value: string): number {
  if (!isValidPackagingKitChildQuantity(value)) {
    throw new Error(`Invalid packaging kit child quantity: ${value}`);
  }

  return Number.parseInt(value.trim(), 10);
}

export function mapPackagingKitChildDtoToModel(
  dto: PackagingKitChildApiDto,
): PackagingKitChild {
  return {
    code: dto.Code,
    name: dto.Name,
    quantity: dto.Quantity,
    unit: dto.Unit ?? "",
  };
}

export function mapPackagingKitDtoToRecord(
  dto: PackagingKitApiDto,
): PackagingKitRecord {
  const children = (dto.Children ?? []).map(mapPackagingKitChildDtoToModel);

  return {
    id: dto.Id,
    kitCode: dto.KitCode,
    kitName: dto.KitName,
    mainMaterialCode: dto.MainMaterialCode,
    mainMaterialName: dto.MainMaterialName,
    unit: dto.Unit,
    isVirtualMain: dto.IsVirtualMain,
    childCount: dto.ChildCount ?? children.length,
    children,
    remark: dto.Remark ?? "",
    creationTime: dto.CreationTime,
    lastModificationTime: dto.LastModificationTime,
  };
}

export function mapPackagingKitMaterialDtoToOption(
  dto: PackagingKitMaterialApiDto,
): PackagingKitMaterialOption {
  return {
    code: dto.MaterialCode,
    name: dto.MaterialName,
    unit: dto.Unit ?? "",
    typeName: dto.MaterialTypeName ?? "",
  };
}
