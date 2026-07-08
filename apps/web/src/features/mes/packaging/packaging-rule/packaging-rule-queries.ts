import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  mapPackagingRuleDtoToRecord,
  mapPackagingRuleFiltersToQuery,
  mapPackagingRuleLevelChainDtoToOption,
  mapPackagingRuleLevelOptionDto,
  mapPackagingRuleSpecOptionDto,
  type PackagingRuleApiDto,
  type PackagingRuleConfigFormValues,
  type PackagingRuleFilters,
  type PackagingRuleFormValues,
  type PackagingRuleLevelChainOption,
} from "@/features/mes/packaging/packaging-rule/packaging-rule-contract";
import {
  createPackagingRule,
  deletePackagingRule,
  deletePackagingRules,
  getPackagingRuleConfig,
  getPackagingRuleLevelChain,
  getPackagingRuleLevelOptions,
  getPackagingRuleSpecOptions,
  getPackagingRules,
  savePackagingRuleConfig,
  updatePackagingRule,
} from "@/features/mes/packaging/packaging-rule/packaging-rule-service";

export function packagingRuleListQueryKey(
  filters: PackagingRuleFilters,
  pageIndex: number,
  pageSize: number,
  refreshVersion = 0,
) {
  return [
    "mes",
    "packaging-rule",
    "list",
    filters,
    pageIndex,
    pageSize,
    refreshVersion,
  ] as const;
}

export const packagingRuleLevelOptionsQueryKey = [
  "mes",
  "packaging-rule",
  "packaging-level-options",
] as const;

export const packagingRuleSpecOptionsQueryKey = [
  "mes",
  "packaging-rule",
  "packaging-spec-options",
] as const;

export function packagingRuleConfigQueryKey(
  ruleCode: string,
  refreshVersion = 0,
) {
  return ["mes", "packaging-rule", "config", ruleCode, refreshVersion] as const;
}

export function usePackagingRuleListQuery(
  filters: PackagingRuleFilters,
  pageIndex: number,
  pageSize: number,
  refreshVersion = 0,
) {
  return useQuery({
    queryKey: packagingRuleListQueryKey(filters, pageIndex, pageSize, refreshVersion),
    queryFn: async ({ signal }) => {
      const result = await getPackagingRules(
        mapPackagingRuleFiltersToQuery(
          filters,
          pageIndex,
          pageSize,
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
    queryKey: ["mes", "packaging-rule", "list"],
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
        queryKey: ["mes", "packaging-rule", "config", values.ruleCode],
      });
    },
  });
}

/**
 * Level-chain query mutation, triggered after the user confirms a level choice.
 *
 * - Not a persistent query: the dialog triggers it directly so the cache is
 *   never shared with unrelated forms.
 * - Returns normalized chain options, sorted by `LevelSequence` ascending as a
 *   safe fallback when the API order is not trustworthy. `Array.prototype.sort`
 *   is stable in modern JS engines, so the API order is preserved as tie-breaker.
 * - Does not invalidate other packaging rule caches
 *   (list / level options / spec options).
 */
export function usePackagingRuleLevelChainMutation() {
  return useMutation({
    mutationFn: async (input: { innerLevelCode: string }) => {
      const result = await getPackagingRuleLevelChain(input);
      const options: PackagingRuleLevelChainOption[] = result.Attach.map(
        mapPackagingRuleLevelChainDtoToOption,
      );

      return options
        .slice()
        .sort((left, right) => left.levelSequence - right.levelSequence);
    },
  });
}
