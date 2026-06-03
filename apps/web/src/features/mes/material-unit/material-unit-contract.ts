export type MaterialUnitApiDto = {
  Id: number;
  MaterialUnitCode: string;
  MaterialUnitName: string;
};

export type MaterialUnitOption = {
  materialUnitCode: string;
  materialUnitName: string;
};

export function mapMaterialUnitDtoToOption(
  dto: MaterialUnitApiDto,
): MaterialUnitOption {
  return {
    materialUnitCode: dto.MaterialUnitCode,
    materialUnitName: dto.MaterialUnitName,
  };
}
