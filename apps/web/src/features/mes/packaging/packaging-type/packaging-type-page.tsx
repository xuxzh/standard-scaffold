import { ArrowDownToLineIcon, ArrowUpFromLineIcon, CirclePlusIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DataExportDialog,
  DataExportEmptyError,
  exportRowsToExcel,
  type DataExportColumn,
  type DataExportMode,
} from "@/components/data-export";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  DataImportDialog,
  DataImportTemplateDialog,
} from "@/components/data-import";
import { DataTablePagination } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  packagingTypeDefaultFilters,
  packagingTypePageSize,
  type PackagingTypeApiDto,
  type PackagingTypeFilters,
  type PackagingTypeFormValues,
  type PackagingTypeRecord,
} from "@/features/mes/packaging/packaging-type/packaging-contract";
import { PackagingTypeFilterForm } from "@/features/mes/packaging/packaging-type/packaging-type-filter-form";
import { PackagingTypeFormSheet } from "@/features/mes/packaging/packaging-type/packaging-type-form-sheet";
import {
  useBatchDeletePackagingTypesMutation,
  getPackagingTypeExportRows,
  packagingTypeExportMaxRows,
  useCreatePackagingTypeMutation,
  useDeletePackagingTypeMutation,
  usePackagingTypeListQuery,
  useUpdatePackagingTypeMutation,
} from "@/features/mes/packaging/packaging-type/packaging-type-queries";
import { PackagingTypeTable } from "@/features/mes/packaging/packaging-type/packaging-type-table";
import { notify } from "@/lib/notify";

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
  const [pageSize, setPageSize] = useState(packagingTypePageSize);
  const [searchVersion, setSearchVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] = useState<PackagingTypeRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PackagingTypeRecord | PackagingTypeRecord[] | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const query = usePackagingTypeListQuery(filters, pageIndex, pageSize, searchVersion);

  // DEBUG: 诊断页面卸载/重挂问题
  useEffect(() => {
    console.log("PackagingTypePage mounted");
    return () => console.log("PackagingTypePage unmounted");
  }, []);
  const createMutation = useCreatePackagingTypeMutation();
  const updateMutation = useUpdatePackagingTypeMutation();
  const deleteMutation = useDeletePackagingTypeMutation();
  const batchDeleteMutation = useBatchDeletePackagingTypesMutation();

  const records = query.data?.items ?? [];
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
          ? t("pages.packagingType.table.isRecyclableTrue")
          : t("pages.packagingType.table.isRecyclableFalse"),
    },
    {
      key: "description",
      header: t("pages.packagingType.table.description"),
      value: (row) => row.description,
    },
  ];

  // 列表加载失败由 queryCache.onError 统一提示，无需在页面内重复监听。

  async function handleSubmit(values: PackagingTypeFormValues) {
    try {
      if (sheetMode === "create") {
        const result = await createMutation.mutateAsync(values);
        notify.apiSuccess("pages.packagingType.feedback.created", result);
        setSheetOpen(false);
        setEditingRecord(null);
        return;
      }

      if (editingRecord) {
        const result = await updateMutation.mutateAsync({
          id: editingRecord.id,
          ...values,
        });
        notify.apiSuccess("pages.packagingType.feedback.updated", result);
        setSheetOpen(false);
        setEditingRecord(null);
      }
    } catch {
      // MutationCache owns error notifications; this boundary consumes the event rejection.
    }
  }

  async function handleDelete(record: PackagingTypeRecord) {
    setDeleteTarget(record);
    setConfirmOpen(true);
  }

  async function handleBatchDelete() {
    if (!selectedIds.length) {
      return;
    }

    const targetRecords = records.filter((record) => selectedIds.includes(record.id));

    setDeleteTarget(targetRecords);
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    try {
      if (Array.isArray(deleteTarget)) {
        const result = await batchDeleteMutation.mutateAsync(
          deleteTarget.map(mapRecordToApiDto),
        );
        notify.apiSuccess("pages.packagingType.feedback.batchDeleted", result);
        setSelectedIds([]);
        setConfirmOpen(false);
        setDeleteTarget(null);
        return;
      }

      const result = await deleteMutation.mutateAsync(mapRecordToApiDto(deleteTarget));
      notify.apiSuccess("pages.packagingType.feedback.deleted", result);
      setSelectedIds((current) =>
        current.filter((id) => id !== deleteTarget.id),
      );
      setConfirmOpen(false);
      setDeleteTarget(null);
    } catch {
      // MutationCache owns error notifications; this boundary consumes the event rejection.
    }
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
      notify.success(t("pages.packagingType.export.successTitle"));
    } catch (error) {
      if (error instanceof DataExportEmptyError) {
        notify.error(t("pages.packagingType.export.emptyTitle"));
        return;
      }

      if (error instanceof Error && error.message === "EXPORT_LIMIT_EXCEEDED") {
        notify.error(t("pages.packagingType.export.limitTitle"), {
          description: t("pages.packagingType.export.limitDescription"),
        });
        return;
      }

      notify.error(t("pages.packagingType.export.errorTitle"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <PackagingTypeFilterForm
        defaultValues={filters}
        onSubmit={(nextFilters) => {
          console.log("Page onSubmit called", { nextFilters, searchVersion });
          setPageIndex(1);
          setFilters(nextFilters);
          setSearchVersion((current) => {
            console.log("searchVersion changing", { from: current, to: current + 1 });
            return current + 1;
          });
        }}
        onReset={(nextFilters) => {
          console.log("Page onReset called", { nextFilters, searchVersion });
          setPageIndex(1);
          setFilters(nextFilters);
          setSearchVersion((current) => {
            console.log("searchVersion changing", { from: current, to: current + 1 });
            return current + 1;
          });
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
            <CirclePlusIcon data-icon="inline-start" />
            {t("pages.packagingType.actions.create")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!selectedIds.length || batchDeleteMutation.isPending}
            onClick={() => void handleBatchDelete()}
          >
            <TrashIcon data-icon="inline-start" />
            {t("pages.packagingType.actions.batchDelete")}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setImportDialogOpen(true)}
          >
            <ArrowDownToLineIcon data-icon="inline-start" />
            {t("pages.packagingType.actions.import")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={exporting}
            onClick={() => setExportDialogOpen(true)}
          >
            <ArrowUpFromLineIcon data-icon="inline-start" />
            {t("pages.packagingType.actions.export")}
          </Button>
        </div>
      </div>

      <PackagingTypeTable
        data={tableData}
        loading={query.isLoading || query.isFetching}
        pageIndex={pageIndex}
        pageSize={pageSize}
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

      <DataTablePagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalCount={query.data?.totalCount ?? 0}
        selectedCount={selectedRows.length}
        loading={query.isLoading || query.isFetching}
        onPageIndexChange={setPageIndex}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPageIndex(1);
        }}
      />

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

      <DataImportDialog
        open={importDialogOpen}
        moduleKey="MOM"
        businessKey="PackagingType"
        businessName={t("pages.packagingType.title")}
        onOpenChange={setImportDialogOpen}
        onConfigureTemplate={() => {
          setTemplateDialogOpen(true);
        }}
        onImported={() => {
          setPageIndex(1);
          setSearchVersion((current) => current + 1);
        }}
      />

      <DataImportTemplateDialog
        open={templateDialogOpen}
        moduleKey="MOM"
        businessKey="PackagingType"
        onOpenChange={setTemplateDialogOpen}
      />

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirmDelete.title")}
        description={
          deleteTarget && Array.isArray(deleteTarget)
            ? t("pages.packagingType.feedback.confirmBatchDelete", { count: deleteTarget.length })
            : deleteTarget
              ? t("pages.packagingType.feedback.confirmDelete", { name: deleteTarget.typeName })
              : ""
        }
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending || batchDeleteMutation.isPending}
      />
    </section>
  );
}
