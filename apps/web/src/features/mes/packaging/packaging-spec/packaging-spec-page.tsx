import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  CirclePlusIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
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
  packagingSpecDefaultFilters,
  packagingSpecPageSize,
  type PackagingSpecApiDto,
  type PackagingSpecFilters,
  type PackagingSpecFormValues,
  type PackagingSpecRecord,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-contract";
import { PackagingSpecFilterForm } from "@/features/mes/packaging/packaging-spec/packaging-spec-filter-form";
import { PackagingSpecFormDialog } from "@/features/mes/packaging/packaging-spec/packaging-spec-form-dialog";
import {
  getPackagingSpecExportRows,
  packagingSpecExportMaxRows,
  useBatchDeletePackagingSpecsMutation,
  useCreatePackagingSpecMutation,
  useDeletePackagingSpecMutation,
  usePackagingSpecListQuery,
  usePackagingSpecTypeOptionsQuery,
  useUpdatePackagingSpecMutation,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-queries";
import { useLabelRuleOptionsQuery } from "@/features/mes/packaging/label-rule/label-rule-queries";
import { useMaterialUnitOptionsQuery } from "@/features/mes/material-unit/material-unit-queries";
import { PackagingSpecTable } from "@/features/mes/packaging/packaging-spec/packaging-spec-table";
import { useOptionsNameResolver } from "@/lib/options-name-lookup";
import { notify } from "@/lib/notify";

function mapRecordToApiDto(record: PackagingSpecRecord): PackagingSpecApiDto {
  return {
    Id: record.id,
    SpecCode: record.specCode,
    SpecName: record.specName,
    PackagingTypeCode: record.packagingTypeCode,
    PackagingTypeName: record.packagingTypeName,
    PackagingLevelCode: "",
    PackagingLevelName: "",
    BarcodeRuleCode: record.barcodeRuleCode,
    BarcodeRuleName: record.barcodeRuleName,
    Length: record.length,
    Width: record.width,
    Height: record.height,
    Volume: record.volume,
    MaxWeight: record.maxWeight,
    GrossWeight: record.grossWeight,
    TareWeight: record.tareWeight,
    StandardCapacity: record.standardCapacity,
    StackLimit: record.stackLimit,
    Unit: record.unit,
    IsEnabled: record.isEnabled,
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

export function PackagingSpecPage() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState<PackagingSpecFilters>(
    packagingSpecDefaultFilters,
  );
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(packagingSpecPageSize);
  const [searchVersion, setSearchVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] =
    useState<PackagingSpecRecord | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PackagingSpecRecord | PackagingSpecRecord[] | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const query = usePackagingSpecListQuery(filters, pageIndex, pageSize, searchVersion);
  const createMutation = useCreatePackagingSpecMutation();
  const updateMutation = useUpdatePackagingSpecMutation();
  const deleteMutation = useDeletePackagingSpecMutation();
  const batchDeleteMutation = useBatchDeletePackagingSpecsMutation();
  const typeOptionsQuery = usePackagingSpecTypeOptionsQuery(true);
  const labelRuleOptionsQuery = useLabelRuleOptionsQuery(true);
  const unitOptionsQuery = useMaterialUnitOptionsQuery();

  const records = query.data?.items ?? [];
  const tableData = query.isError ? [] : records;
  const selectedRows = tableData.filter((record) =>
    selectedIds.includes(record.id),
  );
  const unitNameResolver = useOptionsNameResolver(
    unitOptionsQuery.data,
    (option) => option.materialUnitCode,
    (option) => option.materialUnitName,
  );
  const exportColumns: DataExportColumn<PackagingSpecRecord>[] = [
    {
      key: "specCode",
      header: t("pages.packagingSpec.table.specCode"),
      value: (row) => row.specCode,
    },
    {
      key: "specName",
      header: t("pages.packagingSpec.table.specName"),
      value: (row) => row.specName,
    },
    {
      key: "packagingTypeCode",
      header: t("pages.packagingSpec.table.packagingTypeCode"),
      value: (row) => row.packagingTypeCode,
    },
    {
      key: "packagingTypeName",
      header: t("pages.packagingSpec.table.packagingTypeName"),
      value: (row) => row.packagingTypeName,
    },
    {
      key: "barcodeRuleCode",
      header: t("pages.packagingSpec.table.barcodeRuleCode"),
      value: (row) => row.barcodeRuleCode,
    },
    {
      key: "barcodeRuleName",
      header: t("pages.packagingSpec.table.barcodeRuleName"),
      value: (row) => row.barcodeRuleName,
    },
    {
      key: "length",
      header: t("pages.packagingSpec.table.length"),
      value: (row) => row.length,
    },
    {
      key: "width",
      header: t("pages.packagingSpec.table.width"),
      value: (row) => row.width,
    },
    {
      key: "height",
      header: t("pages.packagingSpec.table.height"),
      value: (row) => row.height,
    },
    {
      key: "volume",
      header: t("pages.packagingSpec.table.volume"),
      value: (row) => row.volume,
    },
    {
      key: "maxWeight",
      header: t("pages.packagingSpec.table.maxWeight"),
      value: (row) => row.maxWeight,
    },
    {
      key: "grossWeight",
      header: t("pages.packagingSpec.table.grossWeight"),
      value: (row) => row.grossWeight,
    },
    {
      key: "tareWeight",
      header: t("pages.packagingSpec.table.tareWeight"),
      value: (row) => row.tareWeight,
    },
    {
      key: "standardCapacity",
      header: t("pages.packagingSpec.table.standardCapacity"),
      value: (row) => row.standardCapacity,
    },
    {
      key: "unit",
      header: t("pages.packagingSpec.table.unit"),
      value: (row) => unitNameResolver(row.unit),
    },
    {
      key: "stackLimit",
      header: t("pages.packagingSpec.table.stackLimit"),
      value: (row) => row.stackLimit,
    },
    {
      key: "isEnabled",
      header: t("pages.packagingSpec.table.isEnabled"),
      value: (row) =>
        row.isEnabled
          ? t("pages.packagingSpec.table.isEnabledTrue")
          : t("pages.packagingSpec.table.isEnabledFalse"),
    },
  ];

  async function resolveExportRows(mode: DataExportMode) {
    if (mode === "current") {
      return tableData;
    }

    if (mode === "selected") {
      return selectedRows;
    }

    const totalCount = query.data?.totalCount ?? 0;

    if (totalCount > packagingSpecExportMaxRows) {
      throw new Error("EXPORT_LIMIT_EXCEEDED");
    }

    return await getPackagingSpecExportRows(filters, totalCount);
  }

  async function handleExport(mode: DataExportMode) {
    setExporting(true);

    try {
      const rows = await resolveExportRows(mode);

      if (rows.length === 0) {
        throw new DataExportEmptyError();
      }

      await exportRowsToExcel({
        filename: `packaging-specs-${formatExportTimestamp(new Date())}.xlsx`,
        sheetName: "Packaging Specs",
        columns: exportColumns,
        rows,
      });

      setExportDialogOpen(false);
      notify.success(t("pages.packagingSpec.export.successTitle"));
    } catch (error) {
      if (error instanceof DataExportEmptyError) {
        notify.error(t("pages.packagingSpec.export.emptyTitle"));
        return;
      }

      if (error instanceof Error && error.message === "EXPORT_LIMIT_EXCEEDED") {
        notify.error(t("pages.packagingSpec.export.limitTitle"), {
          description: t("pages.packagingSpec.export.limitDescription"),
        });
        return;
      }

      notify.error(t("pages.packagingSpec.export.errorTitle"));
    } finally {
      setExporting(false);
    }
  }

  async function handleSubmit(values: PackagingSpecFormValues) {
    try {
      if (dialogMode === "create") {
        const result = await createMutation.mutateAsync(values);
        notify.apiSuccess("pages.packagingSpec.feedback.created", result);
        setDialogOpen(false);
        setEditingRecord(null);
        return;
      }

      if (editingRecord) {
        const result = await updateMutation.mutateAsync({
          id: editingRecord.id,
          ...values,
        });
        notify.apiSuccess("pages.packagingSpec.feedback.updated", result);
        setDialogOpen(false);
        setEditingRecord(null);
      }
    } catch {
      // MutationCache owns error notifications; this boundary consumes the event rejection.
    }
  }

  async function handleDelete(record: PackagingSpecRecord) {
    setDeleteTarget(record);
    setConfirmOpen(true);
  }

  async function handleBatchDelete() {
    const targets = records.filter((record) => selectedIds.includes(record.id));

    if (!targets.length) {
      return;
    }

    setDeleteTarget(targets);
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
      notify.apiSuccess("pages.packagingSpec.feedback.batchDeleted", result);
      setSelectedIds([]);
      setConfirmOpen(false);
      setDeleteTarget(null);
      return;
    }

    const result = await deleteMutation.mutateAsync(mapRecordToApiDto(deleteTarget));
    notify.apiSuccess("pages.packagingSpec.feedback.deleted", result);
    setSelectedIds((current) =>
      current.filter((id) => id !== deleteTarget.id),
    );
    setConfirmOpen(false);
    setDeleteTarget(null);
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <PackagingSpecFilterForm
        defaultValues={filters}
        typeOptions={typeOptionsQuery.data ?? []}
        typeOptionsLoading={typeOptionsQuery.isLoading}
        onSubmit={(nextFilters) => {
          setFilters(nextFilters);
          setPageIndex(1);
          setSearchVersion((current) => current + 1);
        }}
        onReset={(nextFilters) => {
          setFilters(nextFilters);
          setPageIndex(1);
          setSearchVersion((current) => current + 1);
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => {
              setDialogMode("create");
              setEditingRecord(null);
              setDialogOpen(true);
            }}
          >
            <CirclePlusIcon data-icon="inline-start" />
            {t("pages.packagingSpec.actions.create")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!selectedIds.length || batchDeleteMutation.isPending}
            onClick={() => void handleBatchDelete()}
          >
            <TrashIcon data-icon="inline-start" />
            {t("pages.packagingSpec.actions.batchDelete")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSearchVersion((current) => current + 1)}
          >
            <RefreshCwIcon data-icon="inline-start" />
            {t("pages.packagingSpec.actions.refresh")}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setImportDialogOpen(true)}
          >
            <ArrowDownToLineIcon data-icon="inline-start" />
            {t("pages.packagingSpec.actions.import")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={exporting}
            onClick={() => setExportDialogOpen(true)}
          >
            <ArrowUpFromLineIcon data-icon="inline-start" />
            {t("pages.packagingSpec.actions.export")}
          </Button>
        </div>
      </div>

      <PackagingSpecTable
        data={tableData}
        loading={query.isLoading || query.isFetching}
        pageIndex={pageIndex}
        pageSize={packagingSpecPageSize}
        selectedIds={selectedIds}
        unitNameResolver={unitNameResolver}
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
        onEdit={(record) => {
          setDialogMode("edit");
          setEditingRecord(record);
          setDialogOpen(true);
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
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPageIndex(1);
        }}
      />

      <PackagingSpecFormDialog
        open={dialogOpen}
        mode={dialogMode}
        record={editingRecord}
        typeOptions={typeOptionsQuery.data ?? []}
        labelRuleOptions={labelRuleOptionsQuery.data ?? []}
        unitOptions={unitOptionsQuery.data ?? []}
        optionsError={typeOptionsQuery.isError || labelRuleOptionsQuery.isError || unitOptionsQuery.isError}
        submitting={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingRecord(null);
          }
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirmDelete.title")}
        description={
          deleteTarget && Array.isArray(deleteTarget)
            ? t("pages.packagingSpec.feedback.confirmBatchDelete", { count: deleteTarget.length })
            : deleteTarget
              ? t("pages.packagingSpec.feedback.confirmDelete", { name: deleteTarget.specCode })
              : ""
        }
        onConfirm={async () => {
          try {
            await handleConfirmDelete();
          } catch {
            // Global MutationCache.onError already handled the notification; suppress only the event-handler rejection.
          }
        }}
        isLoading={deleteMutation.isPending || batchDeleteMutation.isPending}
      />

      <DataExportDialog
        open={exportDialogOpen}
        exporting={exporting}
        selectedCount={selectedRows.length}
        optionLabels={{
          all: t("pages.packagingSpec.export.options.all"),
          current: t("pages.packagingSpec.export.options.current"),
          selected: t("pages.packagingSpec.export.options.selected"),
        }}
        messages={{
          title: t("pages.packagingSpec.export.dialogTitle"),
          description: t("pages.packagingSpec.export.dialogDescription"),
          confirm: t("pages.packagingSpec.actions.export"),
          cancel: t("pages.packagingSpec.actions.cancel"),
          exporting: t("pages.packagingSpec.export.exporting"),
          selectedDisabledHint: t(
            "pages.packagingSpec.export.selectedDisabledHint",
          ),
        }}
        onOpenChange={setExportDialogOpen}
        onConfirm={(mode) => {
          void handleExport(mode);
        }}
      />

      <DataImportDialog
        open={importDialogOpen}
        moduleKey="PlatformV2"
        businessKey="PackagingSpec"
        businessName={t("pages.packagingSpec.title")}
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
        moduleKey="PlatformV2"
        businessKey="PackagingSpec"
        onOpenChange={setTemplateDialogOpen}
      />
    </section>
  );
}
