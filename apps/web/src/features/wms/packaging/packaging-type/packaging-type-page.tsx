import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  packagingTypeDefaultFilters,
  type PackagingTypeApiDto,
  type PackagingTypeFilters,
  type PackagingTypeFormValues,
  type PackagingTypeRecord,
} from "@/features/wms/packaging/packaging-type/packaging-contract";
import { PackagingTypeFilterForm } from "@/features/wms/packaging/packaging-type/packaging-type-filter-form";
import { PackagingTypeFormSheet } from "@/features/wms/packaging/packaging-type/packaging-type-form-sheet";
import {
  useBatchDeletePackagingTypesMutation,
  useCreatePackagingTypeMutation,
  useDeletePackagingTypeMutation,
  usePackagingTypeListQuery,
  useUpdatePackagingTypeMutation,
} from "@/features/wms/packaging/packaging-type/packaging-type-queries";
import { PackagingTypeTable } from "@/features/wms/packaging/packaging-type/packaging-type-table";

function mapRecordToApiDto(record: PackagingTypeRecord): PackagingTypeApiDto {
  return {
    Id: record.id,
    TypeCode: record.typeCode,
    TypeName: record.typeName,
    IsRecyclable: record.isRecyclable,
    Description: record.description,
    Remark: record.remark,
    CompanyCode: record.companyCode,
    FactoryCode: record.factoryCode,
    CreationTime: record.creationTime,
    LastModificationTime: record.lastModificationTime,
  };
}

function getQueryErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return null;
}

export function PackagingTypePage() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState<PackagingTypeFilters>(packagingTypeDefaultFilters);
  const [pageIndex, setPageIndex] = useState(1);
  const [searchVersion, setSearchVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] = useState<PackagingTypeRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const query = usePackagingTypeListQuery(filters, pageIndex, searchVersion);
  const createMutation = useCreatePackagingTypeMutation();
  const updateMutation = useUpdatePackagingTypeMutation();
  const deleteMutation = useDeletePackagingTypeMutation();
  const batchDeleteMutation = useBatchDeletePackagingTypesMutation();

  const records = query.data?.items ?? [];
  const errorMessage = getQueryErrorMessage(query.error);

  async function handleSubmit(values: PackagingTypeFormValues) {
    if (sheetMode === "create") {
      await createMutation.mutateAsync(values);
      toast.success(t("pages.packagingType.feedback.created"));
    } else if (editingRecord) {
      await updateMutation.mutateAsync({ id: editingRecord.id, ...values });
      toast.success(t("pages.packagingType.feedback.updated"));
    }

    setSheetOpen(false);
    setEditingRecord(null);
  }

  async function handleDelete(record: PackagingTypeRecord) {
    if (!window.confirm(t("pages.packagingType.feedback.confirmDelete", { name: record.typeName }))) {
      return;
    }

    await deleteMutation.mutateAsync(mapRecordToApiDto(record));
    setSelectedIds((current) => current.filter((id) => id !== record.id));
    toast.success(t("pages.packagingType.feedback.deleted"));
  }

  async function handleBatchDelete() {
    if (!selectedIds.length) {
      return;
    }

    const targetRecords = records.filter((record) => selectedIds.includes(record.id));

    if (
      !window.confirm(
        t("pages.packagingType.feedback.confirmBatchDelete", { count: targetRecords.length }),
      )
    ) {
      return;
    }

    await batchDeleteMutation.mutateAsync(targetRecords.map(mapRecordToApiDto));
    setSelectedIds([]);
    toast.success(t("pages.packagingType.feedback.batchDeleted"));
  }

  return (
    <section className="flex flex-col gap-4">
      <PackagingTypeFilterForm
        defaultValues={filters}
        onSubmit={(nextFilters) => {
          setPageIndex(1);
          setFilters(nextFilters);
          setSearchVersion((current) => current + 1);
        }}
        onReset={(nextFilters) => {
          setPageIndex(1);
          setFilters(nextFilters);
          setSearchVersion((current) => current + 1);
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => {
              setSheetMode("create");
              setEditingRecord(null);
              setSheetOpen(true);
            }}
          >
            {t("pages.packagingType.actions.create")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedIds.length || batchDeleteMutation.isPending}
            onClick={() => void handleBatchDelete()}
          >
            {t("pages.packagingType.actions.batchDelete")}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {query.data ? t("pages.packagingType.states.total", { count: query.data.totalCount }) : ""}
        </div>
      </div>

      {query.isError ? (
        <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">{t("pages.packagingType.states.errorTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("pages.packagingType.states.errorDescription")}</p>
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            {t("pages.packagingType.actions.retry")}
          </Button>
        </div>
      ) : (
        <PackagingTypeTable
          data={records}
          loading={query.isLoading || query.isFetching}
          selectedIds={selectedIds}
          onToggleAll={(checked) => {
            setSelectedIds(checked ? records.map((record) => record.id) : []);
          }}
          onToggleOne={(id, checked) => {
            setSelectedIds((current) =>
              checked ? [...new Set([...current, id])] : current.filter((item) => item !== id),
            );
          }}
          onEdit={(record) => {
            setSheetMode("edit");
            setEditingRecord(record);
            setSheetOpen(true);
          }}
          onDelete={(record) => {
            void handleDelete(record);
          }}
        />
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pageIndex <= 1 || query.isLoading}
          onClick={() => setPageIndex((current) => Math.max(1, current - 1))}
        >
          {t("pages.packagingType.actions.previousPage")}
        </Button>
        <span className="text-sm text-muted-foreground">
          {t("pages.packagingType.states.page", { page: pageIndex })}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={query.isLoading || (query.data?.items.length ?? 0) === 0}
          onClick={() => setPageIndex((current) => current + 1)}
        >
          {t("pages.packagingType.actions.nextPage")}
        </Button>
      </div>

      <PackagingTypeFormSheet
        open={sheetOpen}
        mode={sheetMode}
        record={editingRecord}
        submitting={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setEditingRecord(null);
          }
        }}
        onSubmit={handleSubmit}
      />
    </section>
  );
}