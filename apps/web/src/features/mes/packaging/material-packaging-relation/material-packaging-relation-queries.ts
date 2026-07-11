import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  mapMaterialOptionDtoToOption,
  mapMaterialPackagingRelationDtoToRecord,
  mapMaterialPackagingRelationFiltersToQuery,
  mapPackagingRuleOptionDtoToOption,
  materialOptionPageSize,
  packagingRuleOptionPageSize,
  type MaterialPackagingRelationApiDto,
  type MaterialPackagingRelationFilters,
  type MaterialPackagingRelationFormValues,
  type MaterialPackagingRelationRecord,
} from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";
import {
  createMaterialPackagingRelation,
  deleteMaterialPackagingRelation,
  deleteMaterialPackagingRelations,
  getMaterialOptions,
  getMaterialPackagingRelations,
  getPackagingRuleOptions,
  updateMaterialPackagingRelation,
} from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-service";

// === Query key factories ===

export function materialPackagingRelationListQueryKey(
  filters: MaterialPackagingRelationFilters,
  selectedMaterialCode: string,
  pageIndex: number,
  pageSize: number,
  refreshVersion = 0,
) {
  return [
    "wms",
    "material-packaging-relation",
    "list",
    filters,
    selectedMaterialCode,
    pageIndex,
    pageSize,
    refreshVersion,
  ] as const;
}

export function materialOptionsQueryKey(
  materialCode: string,
  materialName: string,
  pageIndex: number,
  usage: string,
  pageSize: number = materialOptionPageSize,
) {
  return [
    "wms",
    "material-packaging-relation",
    "material-options",
    materialCode,
    materialName,
    pageIndex,
    usage,
    pageSize,
  ] as const;
}

export const materialPackagingRelationExportMaxRows = 5000;

export function packagingRuleOptionsQueryKey(
  ruleCode: string,
  ruleName: string,
  pageIndex: number,
  pageSize: number = packagingRuleOptionPageSize,
) {
  return [
    "wms",
    "material-packaging-relation",
    "rule-options",
    ruleCode,
    ruleName,
    pageIndex,
    pageSize,
  ] as const;
}

// === List query ===

export function useMaterialPackagingRelationListQuery(
  filters: MaterialPackagingRelationFilters,
  selectedMaterialCode: string,
  pageIndex: number,
  pageSize: number,
  refreshVersion = 0,
) {
  return useQuery({
    queryKey: materialPackagingRelationListQueryKey(
      filters,
      selectedMaterialCode,
      pageIndex,
      pageSize,
      refreshVersion,
    ),
    queryFn: async ({ signal }) => {
      const queryFilters = { ...filters };

      // When a material is selected from sidebar, override filter fields
      if (selectedMaterialCode) {
        queryFilters.materialCode = selectedMaterialCode;
      }

      const result = await getMaterialPackagingRelations(
        mapMaterialPackagingRelationFiltersToQuery(
          queryFilters,
          pageIndex,
          pageSize,
        ),
        { signal },
      );

      return {
        items: result.Attach.map(mapMaterialPackagingRelationDtoToRecord),
        totalCount: result.TotalCount,
      };
    },
  });
}

// === Export helper ===

export async function getMaterialPackagingRelationExportRows(
  filters: MaterialPackagingRelationFilters,
  selectedMaterialCode: string,
  totalCount: number,
  options: { signal?: AbortSignal } = {},
): Promise<MaterialPackagingRelationRecord[]> {
  const queryFilters = { ...filters };

  if (selectedMaterialCode) {
    queryFilters.materialCode = selectedMaterialCode;
  }

  const result = await getMaterialPackagingRelations(
    mapMaterialPackagingRelationFiltersToQuery(
      queryFilters,
      1,
      Math.min(totalCount, materialPackagingRelationExportMaxRows),
    ),
    options,
  );

  return result.Attach.map(mapMaterialPackagingRelationDtoToRecord);
}

// === Material options query ===

export function useMaterialOptionsQuery(
  materialCode: string,
  materialName: string,
  pageIndex: number,
  usage: string,
  enabled: boolean,
  pageSize: number = materialOptionPageSize,
) {
  return useQuery({
    queryKey: materialOptionsQueryKey(
      materialCode,
      materialName,
      pageIndex,
      usage,
      pageSize,
    ),
    enabled,
    queryFn: async ({ signal }) => {
      const result = await getMaterialOptions(
        {
          MaterialCode: materialCode.trim() || undefined,
          MaterialName: materialName.trim() || undefined,
          IsPaged: true,
          PageIndex: pageIndex,
          PageSize: pageSize,
        },
        { signal },
      );

      return {
        items: result.Attach.map(mapMaterialOptionDtoToOption),
        totalCount: result.TotalCount,
      };
    },
  });
}

// === Packaging rule options query ===

export function usePackagingRuleOptionsQuery(
  ruleCode: string,
  ruleName: string,
  pageIndex: number,
  enabled: boolean,
  pageSize: number = packagingRuleOptionPageSize,
) {
  return useQuery({
    queryKey: packagingRuleOptionsQueryKey(
      ruleCode,
      ruleName,
      pageIndex,
      pageSize,
    ),
    enabled,
    queryFn: async ({ signal }) => {
      const result = await getPackagingRuleOptions(
        {
          RuleCode: ruleCode.trim() || undefined,
          RuleName: ruleName.trim() || undefined,
          IsPaged: true,
          PageIndex: pageIndex,
          PageSize: pageSize,
        },
        { signal },
      );

      return {
        items: result.Attach.map(mapPackagingRuleOptionDtoToOption),
        totalCount: result.TotalCount,
      };
    },
  });
}

// === Mutations ===

async function invalidateListQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({
    queryKey: ["wms", "material-packaging-relation", "list"],
  });
}

export function useCreateMaterialPackagingRelationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: MaterialPackagingRelationFormValues) =>
      await createMaterialPackagingRelation(values),
    onSuccess: async () => {
      await invalidateListQueries(queryClient);
    },
  });
}

export function useUpdateMaterialPackagingRelationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      values: MaterialPackagingRelationFormValues & { id: number },
    ) => await updateMaterialPackagingRelation(values),
    onSuccess: async () => {
      await invalidateListQueries(queryClient);
    },
  });
}

export function useDeleteMaterialPackagingRelationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: MaterialPackagingRelationApiDto) =>
      await deleteMaterialPackagingRelation(dto),
    onSuccess: async () => {
      await invalidateListQueries(queryClient);
    },
  });
}

export function useBatchDeleteMaterialPackagingRelationsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dtos: MaterialPackagingRelationApiDto[]) =>
      await deleteMaterialPackagingRelations(dtos),
    onSuccess: async () => {
      await invalidateListQueries(queryClient);
    },
  });
}
