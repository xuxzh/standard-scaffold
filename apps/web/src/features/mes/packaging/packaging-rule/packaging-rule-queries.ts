import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  mapPackagingRuleDtoToRecord,
  mapPackagingRuleFiltersToQuery,
  mapPackagingRuleLevelOptionDto,
  mapPackagingRuleSpecOptionDto,
  packagingRulePageSize,
  type PackagingRuleApiDto,
  type PackagingRuleConfigFormValues,
  type PackagingRuleFilters,
  type PackagingRuleFormValues,
} from "@/features/mes/packaging/packaging-rule/packaging-rule-contract";
import {
  createPackagingRule,
  deletePackagingRule,
  deletePackagingRules,
  getPackagingRuleConfig,
  getPackagingRuleLevelOptions,
  getPackagingRuleSpecOptions,
  getPackagingRules,
  savePackagingRuleConfig,
  updatePackagingRule,
} from "@/features/mes/packaging/packaging-rule/packaging-rule-service";

export function packagingRuleListQueryKey(
  filters: PackagingRuleFilters,
  pageIndex: number,
  refreshVersion = 0,
) {
  return [
    "wms",
    "packaging-rule",
    "list",
    filters,
    pageIndex,
    refreshVersion,
  ] as const;
}

export const packagingRuleLevelOptionsQueryKey = [
  "wms",
  "packaging-rule",
  "packaging-level-options",
] as const;

export const packagingRuleSpecOptionsQueryKey = [
  "wms",
  "packaging-rule",
  "packaging-spec-options",
] as const;

export function packagingRuleConfigQueryKey(
  ruleCode: string,
  refreshVersion = 0,
) {
  return ["wms", "packaging-rule", "config", ruleCode, refreshVersion] as const;
}

export function usePackagingRuleListQuery(
  filters: PackagingRuleFilters,
  pageIndex: number,
  refreshVersion = 0,
) {
  return useQuery({
    queryKey: packagingRuleListQueryKey(filters, pageIndex, refreshVersion),
    queryFn: async ({ signal }) => {
      const result = await getPackagingRules(
        mapPackagingRuleFiltersToQuery(
          filters,
          pageIndex,
          packagingRulePageSize,
        ),
        { signal },
      );

      return {
        items: result.Attach.map(mapPackagingRuleDtoToRecord),
        totalCount: result.TotalCount,
      };
    },
  });
}

export function usePackagingRuleLevelOptionsQuery() {
  return useQuery({
    queryKey: packagingRuleLevelOptionsQueryKey,
    queryFn: async ({ signal }) => {
      const result = await getPackagingRuleLevelOptions({ signal });

      return result.Attach.map(mapPackagingRuleLevelOptionDto);
    },
  });
}

export function usePackagingRuleSpecOptionsQuery() {
  return useQuery({
    queryKey: packagingRuleSpecOptionsQueryKey,
    queryFn: async ({ signal }) => {
      const result = await getPackagingRuleSpecOptions({ signal });

      return result.Attach.map(mapPackagingRuleSpecOptionDto);
    },
  });
}

export function usePackagingRuleConfigQuery(
  ruleCode: string | null,
  open: boolean,
  refreshVersion = 0,
) {
  return useQuery({
    queryKey: packagingRuleConfigQueryKey(ruleCode ?? "", refreshVersion),
    enabled: open && Boolean(ruleCode),
    queryFn: async ({ signal }) =>
      await getPackagingRuleConfig(
        {
          RuleCode: ruleCode ?? "",
          IsPaged: false,
          PageIndex: 1,
          PageSize: 10,
        },
        { signal },
      ),
  });
}

async function invalidatePackagingRuleListQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({
    queryKey: ["wms", "packaging-rule", "list"],
  });
}

export function useCreatePackagingRuleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: PackagingRuleFormValues) =>
      await createPackagingRule(values),
    onSuccess: async () => {
      await invalidatePackagingRuleListQueries(queryClient);
    },
  });
}

export function useUpdatePackagingRuleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: PackagingRuleFormValues & { id: number }) =>
      await updatePackagingRule(values),
    onSuccess: async () => {
      await invalidatePackagingRuleListQueries(queryClient);
    },
  });
}

export function useDeletePackagingRuleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: PackagingRuleApiDto) =>
      await deletePackagingRule(dto),
    onSuccess: async () => {
      await invalidatePackagingRuleListQueries(queryClient);
    },
  });
}

export function useBatchDeletePackagingRulesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dtos: PackagingRuleApiDto[]) =>
      await deletePackagingRules(dtos),
    onSuccess: async () => {
      await invalidatePackagingRuleListQueries(queryClient);
    },
  });
}

export function useSavePackagingRuleConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: PackagingRuleConfigFormValues) =>
      await savePackagingRuleConfig(values),
    onSuccess: async (_, values) => {
      await queryClient.invalidateQueries({
        queryKey: ["wms", "packaging-rule", "config", values.ruleCode],
      });
    },
  });
}
