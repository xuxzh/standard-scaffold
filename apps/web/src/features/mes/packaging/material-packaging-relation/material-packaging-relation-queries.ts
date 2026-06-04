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
  keyword: string,
  pageIndex: number,
  usage: string,
) {
  return [
    "wms",
    "material-packaging-relation",
    "material-options",
    keyword,
    pageIndex,
    usage,
  ] as const;
}

export function packagingRuleOptionsQueryKey(
  ruleCode: string,
  ruleName: string,
  pageIndex: number,
) {
  return [
    "wms",
    "material-packaging-relation",
    "rule-options",
    ruleCode,
    ruleName,
    pageIndex,
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

// === Material options query ===

export function useMaterialOptionsQuery(
  keyword: string,
  pageIndex: number,
  usage: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: materialOptionsQueryKey(keyword, pageIndex, usage),
    enabled,
    queryFn: async ({ signal }) => {
      const result = await getMaterialOptions(
        {
          MaterialCode: keyword.trim() || undefined,
          MaterialName: keyword.trim() || undefined,
          IsPaged: true,
          PageIndex: pageIndex,
          PageSize: materialOptionPageSize,
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
) {
  return useQuery({
    queryKey: packagingRuleOptionsQueryKey(ruleCode, ruleName, pageIndex),
    enabled,
    queryFn: async ({ signal }) => {
      const result = await getPackagingRuleOptions(
        {
          RuleCode: ruleCode.trim() || undefined,
          RuleName: ruleName.trim() || undefined,
          IsPaged: true,
          PageIndex: pageIndex,
          PageSize: packagingRuleOptionPageSize,
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
