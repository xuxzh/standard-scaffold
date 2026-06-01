import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  mapPackagingTypeDtoToRecord,
  packagingTypePageSize,
  type PackagingTypeApiDto,
  type PackagingTypeFilters,
  type PackagingTypeFormValues,
  type PackagingTypeRecord,
} from "@/features/mes/packaging/packaging-type/packaging-contract";
import {
  createPackagingType,
  deletePackagingType,
  deletePackagingTypes,
  getPackagingTypes,
  updatePackagingType,
} from "@/features/mes/packaging/packaging-type/packaging-type-service";

function mapRecyclableFilter(value: PackagingTypeFilters["isRecyclable"]) {
  if (value === "all") {
    return undefined;
  }

  return value === "true";
}

export const packagingTypeExportMaxRows = 5000;

function buildPackagingTypeListRequest(
  filters: PackagingTypeFilters,
  pageIndex: number,
  pageSize: number,
) {
  return {
    IsPaged: true,
    PageIndex: pageIndex,
    PageSize: pageSize,
    TypeCode: filters.typeCode || undefined,
    TypeName: filters.typeName || undefined,
    IsRecyclable: mapRecyclableFilter(filters.isRecyclable),
  } as const;
}

export function packagingTypeListQueryKey(
  filters: PackagingTypeFilters,
  pageIndex: number,
  searchVersion = 0,
) {
  return [
    "mes",
    "packaging-type",
    "list",
    filters,
    pageIndex,
    searchVersion,
  ] as const;
}

export function usePackagingTypeListQuery(
  filters: PackagingTypeFilters,
  pageIndex: number,
  searchVersion = 0,
) {
  return useQuery({
    queryKey: packagingTypeListQueryKey(filters, pageIndex, searchVersion),
    queryFn: async ({ signal }) => {
      const result = await getPackagingTypes(
        buildPackagingTypeListRequest(
          filters,
          pageIndex,
          packagingTypePageSize,
        ),
        { signal },
      );

      return {
        items: result.Attach.map(mapPackagingTypeDtoToRecord),
        totalCount: result.TotalCount,
      };
    },
  });
}

export async function getPackagingTypeExportRows(
  filters: PackagingTypeFilters,
  totalCount: number,
  options: { signal?: AbortSignal } = {},
): Promise<PackagingTypeRecord[]> {
  const result = await getPackagingTypes(
    buildPackagingTypeListRequest(
      filters,
      1,
      Math.min(totalCount, packagingTypeExportMaxRows),
    ),
    options,
  );

  return result.Attach.map(mapPackagingTypeDtoToRecord);
}

export function useCreatePackagingTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: PackagingTypeFormValues) =>
      await createPackagingType(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mes", "packaging-type", "list"],
      });
    },
  });
}

export function useUpdatePackagingTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: PackagingTypeFormValues & { id: number }) =>
      await updatePackagingType(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mes", "packaging-type", "list"],
      });
    },
  });
}

export function useDeletePackagingTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: PackagingTypeApiDto) =>
      await deletePackagingType(dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mes", "packaging-type", "list"],
      });
    },
  });
}

export function useBatchDeletePackagingTypesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dtos: PackagingTypeApiDto[]) =>
      await deletePackagingTypes(dtos),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mes", "packaging-type", "list"],
      });
    },
  });
}
