import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  DataExportDialog,
  DataExportEmptyError,
  exportRowsToExcel,
  type DataExportColumn,
  type DataExportMode,
} from "@/components/data-export";
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
  getPackagingTypeExportRows,
  packagingTypeExportMaxRows,
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

function formatExportTimestamp(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

export function PackagingTypePage() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState<PackagingTypeFilters>(packagingTypeDefaultFilters);
  const [pageIndex, setPageIndex] = useState(1);
  const [searchVersion, setSearchVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
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
  const tableData = query.isError ? [] : records;
  const selectedRows = tableData.filter((record) => selectedIds.includes(record.id));
  const exportColumns: DataExportColumn<PackagingTypeRecord>[] = [
    {
      key: "typeCode",
      header: t("pages.packagingType.table.typeCode"),
      value: (row) => row.typeCode,
    },
    {
      key: "typeName",
      header: t("pages.packagingType.table.typeName"),
      value: (row) => row.typeName,
    },
    {
      key: "isRecyclable",
      header: t("pages.packagingType.table.isRecyclable"),
      value: (row) =>
        row.isRecyclable
          ? t("pages.packagingType.filters.options.true")
          : t("pages.packagingType.filters.options.false"),
    },
    {
      key: "description",
      header: t("pages.packagingType.table.description"),
      value: (row) => row.description,
    },
  ];

  useEffect(() => {
    if (!query.isError) {
      return;
    }

    toast.error(t("pages.packagingType.states.errorTitle"), {
      description: errorMessage ?? t("pages.packagingType.states.errorDescription"),
    });
  }, [errorMessage, query.isError, t]);

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

  async function resolveExportRows(mode: DataExportMode) {
    if (mode === "current") {
      return tableData;
    }

    if (mode === "selected") {
      return selectedRows;
    }

    const totalCount = query.data?.totalCount ?? 0;

    if (totalCount > packagingTypeExportMaxRows) {
      throw new Error("EXPORT_LIMIT_EXCEEDED");
    }

    return await getPackagingTypeExportRows(filters, totalCount);
  }

  async function handleExport(mode: DataExportMode) {
    setExporting(true);

    try {
      const rows = await resolveExportRows(mode);

      if (rows.length === 0) {
        throw new DataExportEmptyError();
      }

      await exportRowsToExcel({
        filename: `packaging-types-${formatExportTimestamp(new Date())}.xlsx`,
        sheetName: "Packaging Types",
        columns: exportColumns,
        rows,
      });

      setExportDialogOpen(false);
      toast.success(t("pages.packagingType.export.successTitle"));
    } catch (error) {
      if (error instanceof DataExportEmptyError) {
        toast.error(t("pages.packagingType.export.emptyTitle"));
        return;
      }

      if (error instanceof Error && error.message === "EXPORT_LIMIT_EXCEEDED") {
        toast.error(t("pages.packagingType.export.limitTitle"), {
          description: t("pages.packagingType.export.limitDescription"),
        });
        return;
      }

      toast.error(t("pages.packagingType.export.errorTitle"));
    } finally {
      setExporting(false);
    }
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
          <Button
            type="button"
            variant="outline"
            disabled={exporting}
            onClick={() => setExportDialogOpen(true)}
          >
            {t("pages.packagingType.actions.export")}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {query.data ? t("pages.packagingType.states.total", { count: query.data.totalCount }) : ""}
        </div>
      </div>

      <PackagingTypeTable
        data={tableData}
        loading={query.isLoading || query.isFetching}
        selectedIds={selectedIds}
        onToggleAll={(checked) => {
          setSelectedIds(checked ? tableData.map((record) => record.id) : []);
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

      <DataExportDialog
        open={exportDialogOpen}
        exporting={exporting}
        selectedCount={selectedRows.length}
        optionLabels={{
          all: t("pages.packagingType.export.options.all"),
          current: t("pages.packagingType.export.options.current"),
          selected: t("pages.packagingType.export.options.selected"),
        }}
        messages={{
          title: t("pages.packagingType.export.dialogTitle"),
          description: t("pages.packagingType.export.dialogDescription"),
          confirm: t("pages.packagingType.actions.export"),
          cancel: t("pages.packagingType.actions.cancel"),
          exporting: t("pages.packagingType.export.exporting"),
          selectedDisabledHint: t("pages.packagingType.export.selectedDisabledHint"),
        }}
        onOpenChange={setExportDialogOpen}
        onConfirm={(mode) => {
          void handleExport(mode);
        }}
      />
    </section>
  );
}
