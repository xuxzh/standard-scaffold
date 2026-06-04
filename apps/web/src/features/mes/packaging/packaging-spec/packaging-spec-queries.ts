import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  mapPackagingSpecDtoToRecord,
  type PackagingSpecApiDto,
  type PackagingSpecFilters,
  type PackagingSpecFormValues,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-contract";
import {
  createPackagingSpec,
  deletePackagingSpec,
  deletePackagingSpecs,
  getPackagingLevelOptions,
  getPackagingSpecList,
  getPackagingTypeOptions,
  updatePackagingSpec,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-service";

function mapEnabledFilter(value: PackagingSpecFilters["isEnabled"]) {
  if (value === "all") {
    return undefined;
  }

  return value === "true";
}

function buildPackagingSpecListRequest(
  filters: PackagingSpecFilters,
  pageIndex: number,
  pageSize: number,
) {
  return {
    IsPaged: true,
    PageIndex: pageIndex,
    PageSize: pageSize,
    SpecCode: filters.specCode || undefined,
    SpecName: filters.specName || undefined,
    PackagingTypeCode: filters.packagingTypeCode || undefined,
    IsEnabled: mapEnabledFilter(filters.isEnabled),
  } as const;
}

export function packagingSpecListQueryKey(
  filters: PackagingSpecFilters,
  pageIndex: number,
  pageSize: number,
  searchVersion = 0,
) {
  return [
    "mes",
    "packaging-spec",
    "list",
    filters,
    pageIndex,
    pageSize,
    searchVersion,
  ] as const;
}

export function usePackagingSpecListQuery(
  filters: PackagingSpecFilters,
  pageIndex: number,
  pageSize: number,
  searchVersion = 0,
) {
  return useQuery({
    queryKey: packagingSpecListQueryKey(filters, pageIndex, pageSize, searchVersion),
    queryFn: async ({ signal }) => {
      const result = await getPackagingSpecList(
        buildPackagingSpecListRequest(filters, pageIndex, pageSize),
        { signal },
      );

      return {
        items: result.Attach.map(mapPackagingSpecDtoToRecord),
        totalCount: result.TotalCount,
      };
    },
  });
}

export function usePackagingSpecTypeOptionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["mes", "packaging-spec", "packaging-type-options"],
    enabled,
    queryFn: async ({ signal }) => {
      const result = await getPackagingTypeOptions({ signal });

      return result.Attach;
    },
  });
}

export function usePackagingSpecLevelOptionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["mes", "packaging-spec", "packaging-level-options"],
    enabled,
    queryFn: async ({ signal }) => {
      const result = await getPackagingLevelOptions({ signal });

      return result.Attach;
    },
  });
}

export function useCreatePackagingSpecMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: PackagingSpecFormValues) =>
      await createPackagingSpec(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mes", "packaging-spec", "list"],
      });
    },
  });
}

export function useUpdatePackagingSpecMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: PackagingSpecFormValues & { id: number }) =>
      await updatePackagingSpec(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mes", "packaging-spec", "list"],
      });
    },
  });
}

export function useDeletePackagingSpecMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: PackagingSpecApiDto) =>
      await deletePackagingSpec(dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mes", "packaging-spec", "list"],
      });
    },
  });
}

export function useBatchDeletePackagingSpecsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dtos: PackagingSpecApiDto[]) =>
      await deletePackagingSpecs(dtos),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mes", "packaging-spec", "list"],
      });
    },
  });
}
