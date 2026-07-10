import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  mapPackagingLevelDtoToOption,
  mapPackagingLevelDtoToRecord,
  mapPackagingLevelTreeDtoToNode,
  type PackagingLevelApiDto,
  type PackagingLevelFilters,
  type PackagingLevelFormValues,
  type PackagingLevelRecord,
} from "@/features/mes/packaging/packaging-level/packaging-level-contract";
import {
  createPackagingLevel,
  deletePackagingLevel,
  deletePackagingLevels,
  getPackagingLevelOptions,
  getPackagingLevelTree,
  getPackagingLevels,
  updatePackagingLevel,
} from "@/features/mes/packaging/packaging-level/packaging-level-service";

function buildPackagingLevelListRequest(
  filters: PackagingLevelFilters,
  pageIndex: number,
  pageSize: number,
) {
  return {
    IsPaged: true,
    PageIndex: pageIndex,
    PageSize: pageSize,
    LevelCode: filters.levelCode || undefined,
    LevelName: filters.levelName || undefined,
    // 不传值代表不过滤，由 React Query / fetch 序列化自动剔除 undefined 字段
    ParentLevelCode: filters.parentLevelCode,
  } as const;
}

export const packagingLevelExportMaxRows = 5000;

export function packagingLevelListQueryKey(
  filters: PackagingLevelFilters,
  pageIndex: number,
  pageSize: number,
  refreshVersion = 0,
) {
  return [
    "mes",
    "packaging-level",
    "list",
    filters,
    pageIndex,
    pageSize,
    refreshVersion,
  ] as const;
}

export const packagingLevelOptionsQueryKey = [
  "mes",
  "packaging-level",
  "options",
] as const;

export function packagingLevelTreeQueryKey(refreshVersion = 0) {
  return ["mes", "packaging-level", "tree", refreshVersion] as const;
}

export function usePackagingLevelListQuery(
  filters: PackagingLevelFilters,
  pageIndex: number,
  pageSize: number,
  refreshVersion = 0,
) {
  return useQuery({
    queryKey: packagingLevelListQueryKey(filters, pageIndex, pageSize, refreshVersion),
    queryFn: async ({ signal }) => {
      const result = await getPackagingLevels(
        buildPackagingLevelListRequest(
          filters,
          pageIndex,
          pageSize,
        ),
        { signal },
      );

      return {
        items: result.Attach.map(mapPackagingLevelDtoToRecord),
        totalCount: result.TotalCount,
      };
    },
  });
}

export async function getPackagingLevelExportRows(
  filters: PackagingLevelFilters,
  totalCount: number,
  options: { signal?: AbortSignal } = {},
): Promise<PackagingLevelRecord[]> {
  const result = await getPackagingLevels(
    buildPackagingLevelListRequest(
      filters,
      1,
      Math.min(totalCount, packagingLevelExportMaxRows),
    ),
    options,
  );

  return result.Attach.map(mapPackagingLevelDtoToRecord);
}

export function usePackagingLevelOptionsQuery() {
  return useQuery({
    queryKey: packagingLevelOptionsQueryKey,
    queryFn: async ({ signal }) => {
      const result = await getPackagingLevelOptions(
        {
          IsPaged: false,
          PageIndex: 1,
          PageSize: 1000,
        },
        { signal },
      );

      return result.Attach.map(mapPackagingLevelDtoToOption);
    },
  });
}

export function usePackagingLevelTreeQuery(open: boolean, refreshVersion = 0) {
  return useQuery({
    queryKey: packagingLevelTreeQueryKey(refreshVersion),
    enabled: open,
    queryFn: async ({ signal }) => {
      const result = await getPackagingLevelTree({ signal });
      return result.Attach.map(mapPackagingLevelTreeDtoToNode);
    },
  });
}

async function invalidatePackagingLevelQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["mes", "packaging-level", "list"],
    }),
    queryClient.invalidateQueries({ queryKey: packagingLevelOptionsQueryKey }),
    queryClient.invalidateQueries({
      queryKey: ["mes", "packaging-level", "tree"],
    }),
  ]);
}

export function useCreatePackagingLevelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      values: PackagingLevelFormValues & { parentLevelName?: string },
    ) => await createPackagingLevel(values),
    onSuccess: async () => {
      await invalidatePackagingLevelQueries(queryClient);
    },
  });
}

export function useUpdatePackagingLevelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      values: PackagingLevelFormValues & {
        id: number;
        parentLevelName?: string;
      },
    ) => await updatePackagingLevel(values),
    onSuccess: async () => {
      await invalidatePackagingLevelQueries(queryClient);
    },
  });
}

export function useDeletePackagingLevelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: PackagingLevelApiDto) =>
      await deletePackagingLevel(dto),
    onSuccess: async () => {
      await invalidatePackagingLevelQueries(queryClient);
    },
  });
}

export function useBatchDeletePackagingLevelsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dtos: PackagingLevelApiDto[]) =>
      await deletePackagingLevels(dtos),
    onSuccess: async () => {
      await invalidatePackagingLevelQueries(queryClient);
    },
  });
}
