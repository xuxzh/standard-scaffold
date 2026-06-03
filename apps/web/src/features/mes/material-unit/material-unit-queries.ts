import { useQuery } from "@tanstack/react-query";
import { mapMaterialUnitDtoToOption } from "@/features/mes/material-unit/material-unit-contract";
import { getMaterialUnitOptions } from "@/features/mes/material-unit/material-unit-service";

export const materialUnitOptionsQueryKey = [
  "mes",
  "material-unit",
  "options",
] as const;

export function useMaterialUnitOptionsQuery() {
  return useQuery({
    queryKey: materialUnitOptionsQueryKey,
    queryFn: async ({ signal }) => {
      const result = await getMaterialUnitOptions(
        {
          IsPaged: false,
          PageIndex: 1,
          PageSize: 1000,
        },
        { signal },
      );

      return result.Attach.map(mapMaterialUnitDtoToOption);
    },
  });
}
