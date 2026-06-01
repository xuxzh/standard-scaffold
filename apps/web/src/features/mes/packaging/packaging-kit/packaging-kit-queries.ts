import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  mapPackagingKitDtoToRecord,
  mapPackagingKitMaterialDtoToOption,
  packagingKitMaterialPageSize,
  packagingKitPageSize,
  type CreatePackagingKitInput,
  type PackagingKitFilters,
  type PackagingKitMaterialFilters,
  type UpdatePackagingKitInput,
} from "@/features/mes/packaging/packaging-kit/packaging-kit-contract";
import {
  createPackagingKit,
  deletePackagingKit,
  deletePackagingKits,
  getPackagingKitMaterialOptions,
  getPackagingKits,
  updatePackagingKit,
  type PackagingKitApiDto,
} from "@/features/mes/packaging/packaging-kit/packaging-kit-service";

type PackagingKitListQueryData = {
  items: ReturnType<typeof mapPackagingKitDtoToRecord>[];
  pageIndex: number;
  totalCount: number;
};

function buildPackagingKitListRequest(
  filters: PackagingKitFilters,
  pageIndex: number,
  pageSize: number,
) {
  return {
    IsPaged: true,
    PageIndex: pageIndex,
    PageSize: pageSize,
    KitCode: filters.kitCode || undefined,
    KitName: filters.kitName || undefined,
  } as const;
}

function buildPackagingKitMaterialRequest(
  filters: PackagingKitMaterialFilters,
  pageIndex: number,
  pageSize: number,
) {
  return {
    IsPaged: true,
    PageIndex: pageIndex,
    PageSize: pageSize,
    MaterialCode: filters.materialCode || undefined,
    MaterialName: filters.materialName || undefined,
  } as const;
}

export function packagingKitListQueryKey(
  filters: PackagingKitFilters,
  pageIndex: number,
  refreshVersion = 0,
) {
  return [
    "mes",
    "packaging-kit",
    "list",
    filters,
    pageIndex,
    refreshVersion,
  ] as const;
}

export function packagingKitMaterialOptionsQueryKey(
  filters: PackagingKitMaterialFilters,
  pageIndex: number,
  mode: "main" | "children",
) {
  return [
    "mes",
    "packaging-kit",
    "material-options",
    mode,
    filters,
    pageIndex,
  ] as const;
}

export function usePackagingKitListQuery(
  filters: PackagingKitFilters,
  pageIndex: number,
  refreshVersion = 0,
) {
  return useQuery<PackagingKitListQueryData>({
    placeholderData: (previousData) => previousData,
    queryKey: packagingKitListQueryKey(filters, pageIndex, refreshVersion),
    queryFn: async ({ signal }) => {
      const result = await getPackagingKits(
        buildPackagingKitListRequest(filters, pageIndex, packagingKitPageSize),
        { signal },
      );

      return {
        items: result.Attach.map(mapPackagingKitDtoToRecord),
        pageIndex,
        totalCount: result.TotalCount,
      };
    },
  });
}

export function usePackagingKitMaterialOptionsQuery(
  filters: PackagingKitMaterialFilters,
  pageIndex: number,
  mode: "main" | "children",
  enabled = true,
) {
  return useQuery({
    queryKey: packagingKitMaterialOptionsQueryKey(filters, pageIndex, mode),
    enabled,
    queryFn: async ({ signal }) => {
      const result = await getPackagingKitMaterialOptions(
        buildPackagingKitMaterialRequest(
          filters,
          pageIndex,
          packagingKitMaterialPageSize,
        ),
        { signal },
      );

      return {
        items: result.Attach.map(mapPackagingKitMaterialDtoToOption),
        totalCount: result.TotalCount,
      };
    },
  });
}

async function invalidatePackagingKitList(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({
    queryKey: ["mes", "packaging-kit", "list"],
  });
}

export function useCreatePackagingKitMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: CreatePackagingKitInput) =>
      await createPackagingKit(values),
    onSuccess: async () => {
      await invalidatePackagingKitList(queryClient);
    },
  });
}

export function useUpdatePackagingKitMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: UpdatePackagingKitInput) =>
      await updatePackagingKit(values),
    onSuccess: async () => {
      await invalidatePackagingKitList(queryClient);
    },
  });
}

export function useDeletePackagingKitMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: PackagingKitApiDto) =>
      await deletePackagingKit(dto),
    onSuccess: async () => {
      await invalidatePackagingKitList(queryClient);
    },
  });
}

export function useBatchDeletePackagingKitsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dtos: PackagingKitApiDto[]) =>
      await deletePackagingKits(dtos),
    onSuccess: async () => {
      await invalidatePackagingKitList(queryClient);
    },
  });
}
