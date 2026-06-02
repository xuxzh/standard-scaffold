export type MaterialPickerApiDto = {
  Id?: number;
  MaterialCode: string;
  MaterialName: string;
  MaterialSpecification?: string | null;
  MaterialTypeName?: string | null;
  MaterialType?: string | null;
  MaterialAttributeName?: string | null;
  UnitName?: string | null;
  Unit?: string | null;
};

export type MaterialPickerRecord = {
  id: string;
  materialCode: string;
  materialName: string;
  materialSpecification: string;
  materialType: string;
  unit: string;
};

export type MaterialPickerFilters = {
  materialCode: string;
  materialName: string;
};

export const materialPickerDefaultFilters: MaterialPickerFilters = {
  materialCode: "",
  materialName: "",
};

export const materialPickerPageSize = 20;

export function mapMaterialPickerDtoToRecord(
  dto: MaterialPickerApiDto,
): MaterialPickerRecord {
  return {
    id: String(dto.Id ?? dto.MaterialCode),
    materialCode: dto.MaterialCode,
    materialName: dto.MaterialName,
    materialSpecification: dto.MaterialSpecification ?? "",
    materialType:
      dto.MaterialTypeName ?? dto.MaterialType ?? dto.MaterialAttributeName ?? "",
    unit: dto.UnitName ?? dto.Unit ?? "",
  };
}
