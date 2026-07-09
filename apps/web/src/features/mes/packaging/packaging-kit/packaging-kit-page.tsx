import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  BoxesIcon,
  CirclePlusIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  DataExportDialog,
  DataExportEmptyError,
  exportRowsToExcel,
  type DataExportColumn,
  type DataExportMode,
} from "@/components/data-export";
import {
  DataImportDialog,
  DataImportTemplateDialog,
} from "@/components/data-import";
import { DataTablePagination } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  packagingKitDefaultFilters,
  packagingKitPageSize,
  type PackagingKitApiDto,
  type PackagingKitFormValues,
  type PackagingKitRecord,
} from "@/features/mes/packaging/packaging-kit/packaging-kit-contract";
import { PackagingKitFilterForm } from "@/features/mes/packaging/packaging-kit/packaging-kit-filter-form";
import { PackagingKitFormDialog } from "@/features/mes/packaging/packaging-kit/packaging-kit-form-dialog";
import {
  getPackagingKitExportRows,
  packagingKitExportMaxRows,
  useBatchDeletePackagingKitsMutation,
  useCreatePackagingKitMutation,
  useDeletePackagingKitMutation,
  usePackagingKitListQuery,
  useUpdatePackagingKitMutation,
} from "@/features/mes/packaging/packaging-kit/packaging-kit-queries";
import { PackagingKitTable } from "@/features/mes/packaging/packaging-kit/packaging-kit-table";
import { notify } from "@/lib/notify";

const emptyRecords: PackagingKitRecord[] = [];

function mapRecordToApiDto(record: PackagingKitRecord): PackagingKitApiDto {
  return {
    Id: record.id,
    KitCode: record.kitCode,
    KitName: record.kitName,
    MainMaterialCode: record.mainMaterialCode,
    MainMaterialName: record.mainMaterialName,
    Unit: record.unit,
    IsVirtualMain: record.isVirtualMain,
    ChildCount: record.childCount,
    Children: record.children.map((child) => ({
      Code: child.code,
      Name: child.name,
      Quantity: child.quantity,
      Unit: child.unit,
    })),
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

export function PackagingKitPage() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState(packagingKitDefaultFilters);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(packagingKitPageSize);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] = useState<PackagingKitRecord | null>(
    null,
  );
  const [viewingRecord, setViewingRecord] = useState<PackagingKitRecord | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PackagingKitRecord | PackagingKitRecord[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const listQuery = usePackagingKitListQuery(
    filters,
    pageIndex,
    pageSize,
    refreshVersion,
  );
  const createMutation = useCreatePackagingKitMutation();
  const updateMutation = useUpdatePackagingKitMutation();
  const deleteMutation = useDeletePackagingKitMutation();
  const batchDeleteMutation = useBatchDeletePackagingKitsMutation();

  const records = listQuery.data?.items ?? emptyRecords;
  const tableData = listQuery.isError ? [] : records;
  const visibleSelectedIds = useMemo(() => {
    if (!records.length || !selectedIds.length) {
      return [];
    }

    const visibleIds = new Set(records.map((record) => record.id));

    return selectedIds.filter((id) => visibleIds.has(id));
  }, [records, selectedIds]);

  const selectedRows = tableData.filter((record) =>
    visibleSelectedIds.includes(record.id),
  );
  const exportColumns: DataExportColumn<PackagingKitRecord>[] = [
    {
      key: "kitCode",
      header: t("pages.packagingKit.table.kitCode"),
      value: (row) => row.kitCode,
    },
    {
      key: "kitName",
      header: t("pages.packagingKit.table.kitName"),
      value: (row) => row.kitName,
    },
    {
      key: "mainMaterialCode",
      header: t("pages.packagingKit.table.mainMaterialCode"),
      value: (row) => row.mainMaterialCode,
    },
    {
      key: "mainMaterialName",
      header: t("pages.packagingKit.table.mainMaterialName"),
      value: (row) => row.mainMaterialName,
    },
    {
      key: "unit",
      header: t("pages.packagingKit.table.unit"),
      value: (row) => row.unit,
    },
    {
      key: "childCount",
      header: t("pages.packagingKit.table.childCount"),
      value: (row) => row.childCount,
    },
  ];

  async function resolveExportRows(mode: DataExportMode) {
    if (mode === "current") {
      return tableData;
    }

    if (mode === "selected") {
      return selectedRows;
    }

    const totalCount = listQuery.data?.totalCount ?? 0;

    if (totalCount > packagingKitExportMaxRows) {
      throw new Error("EXPORT_LIMIT_EXCEEDED");
    }

    return await getPackagingKitExportRows(filters, totalCount);
  }

  async function handleExport(mode: DataExportMode) {
    setExporting(true);

    try {
      const rows = await resolveExportRows(mode);

      if (rows.length === 0) {
        throw new DataExportEmptyError();
      }

      await exportRowsToExcel({
        filename: `packaging-kits-${formatExportTimestamp(new Date())}.xlsx`,
        sheetName: "Packaging Kits",
        columns: exportColumns,
        rows,
      });

      setExportDialogOpen(false);
      toast.success(t("pages.packagingKit.export.successTitle"));
    } catch (error) {
      if (error instanceof DataExportEmptyError) {
        toast.error(t("pages.packagingKit.export.emptyTitle"));
        return;
      }

      if (error instanceof Error && error.message === "EXPORT_LIMIT_EXCEEDED") {
        toast.error(t("pages.packagingKit.export.limitTitle"), {
          description: t("pages.packagingKit.export.limitDescription"),
        });
        return;
      }

      toast.error(t("pages.packagingKit.export.errorTitle"));
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    if (!listQuery.isError) {
      return;
    }

    if (editingRecord) {
      const result = await updateMutation.mutateAsync({
        id: editingRecord.id,
        ...values,
      });
      notify.apiSuccess("pages.packagingKit.feedback.updated", result);
      setFormOpen(false);
      setEditingRecord(null);
    }
  }

  async function handleDelete(record: PackagingKitRecord) {
    setDeleteTarget(record);
    setConfirmOpen(true);
  }

  async function handleBatchDelete() {
    if (!visibleSelectedIds.length) {
      return;
    }

    const targetRecords = records.filter((record) =>
      visibleSelectedIds.includes(record.id),
    );

    if (!targetRecords.length) {
      setSelectedIds([]);
      return;
    }

    setDeleteTarget(targetRecords);
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    if (Array.isArray(deleteTarget)) {
      const result = await batchDeleteMutation.mutateAsync(
        deleteTarget.map(mapRecordToApiDto),
      );
      notify.apiSuccess("pages.packagingKit.feedback.batchDeleted", result);
      setSelectedIds([]);

      if (records.length === deleteTarget.length && pageIndex > 1) {
        setPageIndex((current) => current - 1);
      }

      setConfirmOpen(false);
      setDeleteTarget(null);
      return;
    }

    const result = await deleteMutation.mutateAsync(mapRecordToApiDto(deleteTarget));
    notify.apiSuccess("pages.packagingKit.feedback.deleted", result);
    setSelectedIds((current) =>
      current.filter((id) => id !== deleteTarget.id),
    );

    if (records.length === 1 && pageIndex > 1) {
      setPageIndex((current) => current - 1);
    }

    setConfirmOpen(false);
    setDeleteTarget(null);
  }

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden"
      data-testid="packaging-kit-page"
    >
      <PackagingKitFilterForm
        defaultValues={filters}
        onSubmit={(nextFilters) => {
          setSelectedIds([]);
          setPageIndex(1);
          setFilters(nextFilters);
          setRefreshVersion((current) => current + 1);
        }}
        onReset={(nextFilters) => {
          setSelectedIds([]);
          setPageIndex(1);
          setFilters(nextFilters);
          setRefreshVersion((current) => current + 1);
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => {
              setDialogMode("create");
              setEditingRecord(null);
              setFormOpen(true);
            }}
          >
            <CirclePlusIcon data-icon="inline-start" />
            {t("pages.packagingKit.actions.create")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={
              !visibleSelectedIds.length || batchDeleteMutation.isPending
            }
            onClick={() => void handleBatchDelete()}
          >
            <TrashIcon data-icon="inline-start" />
            {t("pages.packagingKit.actions.batchDelete")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={listQuery.isLoading}
            onClick={() => setRefreshVersion((current) => current + 1)}
          >
            <RefreshCwIcon data-icon="inline-start" />
            {t("pages.packagingKit.actions.refresh")}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setImportDialogOpen(true)}
          >
            <ArrowDownToLineIcon data-icon="inline-start" />
            {t("pages.packagingKit.actions.import")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={exporting}
            onClick={() => setExportDialogOpen(true)}
          >
            <ArrowUpFromLineIcon data-icon="inline-start" />
            {t("pages.packagingKit.actions.export")}
          </Button>
        </div>
      </div>

      <PackagingKitTable
        data={tableData}
        loading={listQuery.isLoading || listQuery.isFetching}
        pageIndex={pageIndex}
        pageSize={packagingKitPageSize}
        selectedIds={visibleSelectedIds}
        onToggleAll={(checked) => {
          setSelectedIds(checked ? tableData.map((record) => record.id) : []);
        }}
        onToggleOne={(id, checked) => {
          setSelectedIds((current) =>
            checked
              ? [...new Set([...current, id])]
              : current.filter((item) => item !== id),
          );
        }}
        onViewChildren={(record) => setViewingRecord(record)}
        onEdit={(record) => {
          setDialogMode("edit");
          setEditingRecord(record);
          setFormOpen(true);
        }}
        onDelete={(record) => {
          void handleDelete(record);
        }}
      />

      <DataTablePagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalCount={listQuery.data?.totalCount ?? 0}
        loading={listQuery.isLoading || listQuery.isFetching}
        onPageIndexChange={(nextPageIndex) => {
          setSelectedIds([]);
          setPageIndex(nextPageIndex);
        }}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPageIndex(1);
        }}
      />

      <PackagingKitFormDialog
        open={formOpen}
        mode={dialogMode}
        record={editingRecord}
        submitting={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingRecord(null);
          }
        }}
        onSubmit={handleSubmit}
      />
      {/* 查看子件对话框 */}
      <Dialog
        open={Boolean(viewingRecord)}
        onOpenChange={(open) => !open && setViewingRecord(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("pages.packagingKit.childrenDialog.title")}
            </DialogTitle>
          </DialogHeader>

          {viewingRecord?.children.length ? (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3">
                      {t("pages.packagingKit.form.childCode")}
                    </th>
                    <th className="px-4 py-3">
                      {t("pages.packagingKit.form.childName")}
                    </th>
                    <th className="px-4 py-3">
                      {t("pages.packagingKit.form.childQuantity")}
                    </th>
                    <th className="px-4 py-3">
                      {t("pages.packagingKit.form.childUnit")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {viewingRecord.children.map((child) => (
                    <tr key={child.code} className="border-t">
                      <td className="px-4 py-3">{child.code}</td>
                      <td className="px-4 py-3">{child.name}</td>
                      <td className="px-4 py-3">{child.quantity}</td>
                      <td className="px-4 py-3">{child.unit || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("pages.packagingKit.states.emptyChildren")}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewingRecord(null)}
            >
              <BoxesIcon data-icon="inline-start" />
              {t("pages.packagingKit.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirmDelete.title")}
        description={
          deleteTarget && Array.isArray(deleteTarget)
            ? t("pages.packagingKit.feedback.confirmBatchDelete", { count: deleteTarget.length })
            : deleteTarget
              ? t("pages.packagingKit.feedback.confirmDelete", { name: deleteTarget.kitName })
              : ""
        }
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending || batchDeleteMutation.isPending}
      />

      <DataExportDialog
        open={exportDialogOpen}
        exporting={exporting}
        selectedCount={selectedRows.length}
        optionLabels={{
          all: t("pages.packagingKit.export.options.all"),
          current: t("pages.packagingKit.export.options.current"),
          selected: t("pages.packagingKit.export.options.selected"),
        }}
        messages={{
          title: t("pages.packagingKit.export.dialogTitle"),
          description: t("pages.packagingKit.export.dialogDescription"),
          confirm: t("pages.packagingKit.actions.export"),
          cancel: t("pages.packagingKit.actions.cancel"),
          exporting: t("pages.packagingKit.export.exporting"),
          selectedDisabledHint: t(
            "pages.packagingKit.export.selectedDisabledHint",
          ),
        }}
        onOpenChange={setExportDialogOpen}
        onConfirm={(mode) => {
          void handleExport(mode);
        }}
      />

      <DataImportDialog
        open={importDialogOpen}
        moduleKey="MOM"
        businessKey="PackagingKit"
        businessName={t("pages.packagingKit.title")}
        onOpenChange={setImportDialogOpen}
        onConfigureTemplate={() => {
          setTemplateDialogOpen(true);
        }}
        onImported={() => {
          setPageIndex(1);
          setRefreshVersion((current) => current + 1);
        }}
      />

      <DataImportTemplateDialog
        open={templateDialogOpen}
        moduleKey="MOM"
        businessKey="PackagingKit"
        onOpenChange={setTemplateDialogOpen}
      />
    </section>
  );
}
