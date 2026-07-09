import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  CirclePlusIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
  packagingRuleDefaultFilters,
  packagingRulePageSize,
  type PackagingRuleApiDto,
  type PackagingRuleConfigFormValues,
  type PackagingRuleFilters,
  type PackagingRuleFormValues,
  type PackagingRuleRecord,
} from "@/features/mes/packaging/packaging-rule/packaging-rule-contract";
import { PackagingRuleConfigDialog } from "@/features/mes/packaging/packaging-rule/packaging-rule-config-dialog";
import { PackagingRuleFilterForm } from "@/features/mes/packaging/packaging-rule/packaging-rule-filter-form";
import { PackagingRuleFormDialog } from "@/features/mes/packaging/packaging-rule/packaging-rule-form-dialog";
import {
  getPackagingRuleExportRows,
  packagingRuleExportMaxRows,
  useBatchDeletePackagingRulesMutation,
  useCreatePackagingRuleMutation,
  useDeletePackagingRuleMutation,
  usePackagingRuleConfigQuery,
  usePackagingRuleLevelOptionsQuery,
  usePackagingRuleListQuery,
  usePackagingRuleSpecOptionsQuery,
  useSavePackagingRuleConfigMutation,
  useUpdatePackagingRuleMutation,
} from "@/features/mes/packaging/packaging-rule/packaging-rule-queries";
import { usePrintTemplateOptionsQuery } from "@/features/mes/packaging/print-template/print-template-queries";
import { PackagingRuleTable } from "@/features/mes/packaging/packaging-rule/packaging-rule-table";

function mapRecordToApiDto(record: PackagingRuleRecord): PackagingRuleApiDto {
  return {
    Id: record.id,
    RuleCode: record.ruleCode,
    RuleName: record.ruleName,
    IsEnabled: record.isEnabled,
    IsDefault: record.isDefault,
    Details: record.details.map((detail) => ({
      Id: detail.id,
      PackagingLevelCode: detail.packagingLevelCode,
      PackagingLevelName: detail.packagingLevelName,
      LevelSequence: detail.levelSequence,
      SpecCode: detail.specCode,
      SpecName: detail.specName,
      StandardQuantity: detail.standardQuantity,
      MaxQuantity: detail.maxQuantity,
      PackagingMethod: detail.packagingMethod,
      Unit: detail.unit,
      PackagingTypeName: detail.packagingTypeName,
    })),
    Remark: record.remark,
    CreationTime: record.creationTime,
    LastModificationTime: record.lastModificationTime,
  };
}

function getErrorMessage(error: unknown) {
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

type FormOptionLoadError = {
  title: string;
  description: string;
};

export function PackagingRulePage() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState<PackagingRuleFilters>(packagingRuleDefaultFilters);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(packagingRulePageSize);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] = useState<PackagingRuleRecord | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PackagingRuleRecord | PackagingRuleRecord[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [configRecord, setConfigRecord] = useState<PackagingRuleRecord | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [configRefreshVersion, setConfigRefreshVersion] = useState(0);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const listQuery = usePackagingRuleListQuery(filters, pageIndex, pageSize, refreshVersion);
  const levelOptionsQuery = usePackagingRuleLevelOptionsQuery();
  const specOptionsQuery = usePackagingRuleSpecOptionsQuery();
  const configQuery = usePackagingRuleConfigQuery(
    configRecord?.ruleCode ?? null,
    configOpen,
    configRefreshVersion,
  );
  const createMutation = useCreatePackagingRuleMutation();
  const updateMutation = useUpdatePackagingRuleMutation();
  const deleteMutation = useDeletePackagingRuleMutation();
  const batchDeleteMutation = useBatchDeletePackagingRulesMutation();
  const saveConfigMutation = useSavePackagingRuleConfigMutation();
  const printTemplateOptionsQuery = usePrintTemplateOptionsQuery(configOpen);

  const records = listQuery.data?.items ?? [];
  const hasListError = listQuery.isError || listQuery.isRefetchError;
  const tableData = records;
  const listErrorMessage = getErrorMessage(listQuery.error);
  const configErrorMessage = getErrorMessage(configQuery.error);
  const levelOptions = useMemo(() => levelOptionsQuery.data ?? [], [levelOptionsQuery.data]);
  const specOptions = useMemo(() => specOptionsQuery.data ?? [], [specOptionsQuery.data]);
  const printTemplateOptions = useMemo(
    () => printTemplateOptionsQuery.data ?? [],
    [printTemplateOptionsQuery.data],
  );
  const formOptionLoadErrors = useMemo(() => {
    const errors: FormOptionLoadError[] = [];

    if (levelOptionsQuery.isError) {
      errors.push({
        title: t("pages.packagingRule.feedback.levelOptionsLoadFailed"),
        description:
          getErrorMessage(levelOptionsQuery.error) ??
          t("pages.packagingRule.feedback.levelOptionsLoadFailed"),
      });
    }

    if (specOptionsQuery.isError) {
      errors.push({
        title: t("pages.packagingRule.feedback.specOptionsLoadFailed"),
        description:
          getErrorMessage(specOptionsQuery.error) ??
          t("pages.packagingRule.feedback.specOptionsLoadFailed"),
      });
    }

    return errors;
  }, [levelOptionsQuery.error, levelOptionsQuery.isError, specOptionsQuery.error, specOptionsQuery.isError, t]);

  const selectedRows = records.filter((record) =>
    selectedIds.includes(record.id),
  );
  const exportColumns: DataExportColumn<PackagingRuleRecord>[] = [
    {
      key: "ruleCode",
      header: t("pages.packagingRule.table.ruleCode"),
      value: (row) => row.ruleCode,
    },
    {
      key: "ruleName",
      header: t("pages.packagingRule.table.ruleName"),
      value: (row) => row.ruleName,
    },
    {
      key: "isDefault",
      header: t("pages.packagingRule.table.isDefault"),
      value: (row) =>
        row.isDefault
          ? t("pages.packagingRule.filters.options.true")
          : t("pages.packagingRule.filters.options.false"),
    },
    {
      key: "isEnabled",
      header: t("pages.packagingRule.table.isEnabled"),
      value: (row) =>
        row.isEnabled
          ? t("pages.packagingRule.filters.options.true")
          : t("pages.packagingRule.filters.options.false"),
    },
    {
      key: "detailCount",
      header: t("pages.packagingRule.table.detailCount"),
      value: (row) => row.details.length,
    },
  ];

  async function resolveExportRows(mode: DataExportMode) {
    if (mode === "current") {
      return records;
    }

    if (mode === "selected") {
      return selectedRows;
    }

    const totalCount = listQuery.data?.totalCount ?? 0;

    if (totalCount > packagingRuleExportMaxRows) {
      throw new Error("EXPORT_LIMIT_EXCEEDED");
    }

    return await getPackagingRuleExportRows(filters, totalCount);
  }

  async function handleExport(mode: DataExportMode) {
    setExporting(true);

    try {
      const rows = await resolveExportRows(mode);

      if (rows.length === 0) {
        throw new DataExportEmptyError();
      }

      await exportRowsToExcel({
        filename: `packaging-rules-${formatExportTimestamp(new Date())}.xlsx`,
        sheetName: "Packaging Rules",
        columns: exportColumns,
        rows,
      });

      setExportDialogOpen(false);
      toast.success(t("pages.packagingRule.export.successTitle"));
    } catch (error) {
      if (error instanceof DataExportEmptyError) {
        toast.error(t("pages.packagingRule.export.emptyTitle"));
        return;
      }

      if (error instanceof Error && error.message === "EXPORT_LIMIT_EXCEEDED") {
        toast.error(t("pages.packagingRule.export.limitTitle"), {
          description: t("pages.packagingRule.export.limitDescription"),
        });
        return;
      }

      toast.error(t("pages.packagingRule.export.errorTitle"));
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    if (!hasListError) {
      return;
    }

    toast.error(t("pages.packagingRule.states.errorTitle"), {
      description: listErrorMessage ?? t("pages.packagingRule.states.errorDescription"),
    });
  }, [hasListError, listErrorMessage, t]);

  async function handleFormSubmit(values: PackagingRuleFormValues) {
    try {
      if (dialogMode === "create") {
        await createMutation.mutateAsync(values);
        toast.success(t("pages.packagingRule.feedback.created"));
      } else if (editingRecord) {
        await updateMutation.mutateAsync({ id: editingRecord.id, ...values });
        toast.success(t("pages.packagingRule.feedback.updated"));
      }

      setFormOpen(false);
      setEditingRecord(null);
    } catch (error) {
      toast.error(getErrorMessage(error) ?? t("pages.packagingRule.feedback.submitFailed"));
    }
  }

  async function handleDelete(record: PackagingRuleRecord) {
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
        await batchDeleteMutation.mutateAsync(
          deleteTarget.map(mapRecordToApiDto),
        );
        setSelectedIds([]);
        toast.success(t("pages.packagingRule.feedback.batchDeleted"));

        if (records.length === deleteTarget.length && pageIndex > 1) {
          setPageIndex((current) => current - 1);
        }
      } else {
        await deleteMutation.mutateAsync(mapRecordToApiDto(deleteTarget));
        setSelectedIds((current) =>
          current.filter((id) => id !== deleteTarget.id),
        );
        toast.success(t("pages.packagingRule.feedback.deleted"));

        if (records.length === 1 && pageIndex > 1) {
          setPageIndex((current) => current - 1);
        }
      }

      setConfirmOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        getErrorMessage(error) ??
          t("pages.packagingRule.feedback.submitFailed"),
      );
    }
  }

  async function handleConfigSubmit(values: PackagingRuleConfigFormValues) {
    try {
      await saveConfigMutation.mutateAsync(values);
      toast.success(t("pages.packagingRule.feedback.configSaved"));
      setConfigOpen(false);
      setConfigRecord(null);
    } catch (error) {
      toast.error(getErrorMessage(error) ?? t("pages.packagingRule.feedback.configSaveFailed"));
    }
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <PackagingRuleFilterForm
        defaultValues={filters}
        onSubmit={(nextFilters) => {
          setPageIndex(1);
          setFilters(nextFilters);
          setRefreshVersion((current) => current + 1);
        }}
        onReset={(nextFilters) => {
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
            {t("pages.packagingRule.actions.create")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!selectedIds.length || batchDeleteMutation.isPending}
            onClick={() => void handleBatchDelete()}
          >
            <TrashIcon data-icon="inline-start" />
            {t("pages.packagingRule.actions.batchDelete")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={listQuery.isLoading}
            onClick={() => setRefreshVersion((current) => current + 1)}
          >
            <RefreshCwIcon data-icon="inline-start" />
            {t("pages.packagingRule.actions.refresh")}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setImportDialogOpen(true)}
          >
            <ArrowDownToLineIcon data-icon="inline-start" />
            {t("pages.packagingRule.actions.import")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={exporting}
            onClick={() => setExportDialogOpen(true)}
          >
            <ArrowUpFromLineIcon data-icon="inline-start" />
            {t("pages.packagingRule.actions.export")}
          </Button>
        </div>
      </div>

      {hasListError ? (
        <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex-1">
            <p className="font-medium text-destructive">
              {t("pages.packagingRule.states.errorTitle")}
            </p>
            <p className="text-sm text-muted-foreground">
              {listErrorMessage ?? t("pages.packagingRule.states.errorDescription")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRefreshVersion((current) => current + 1)}
          >
            {t("pages.packagingRule.actions.retry")}
          </Button>
        </div>
      ) : null}

      <PackagingRuleTable
        data={tableData}
        loading={listQuery.isLoading}
        pageIndex={pageIndex}
        pageSize={packagingRulePageSize}
        selectedIds={selectedIds}
        onToggleAll={(checked) => {
          setSelectedIds(checked ? records.map((record) => record.id) : []);
        }}
        onToggleOne={(id, checked) => {
          setSelectedIds((current) =>
            checked ? [...current, id] : current.filter((value) => value !== id),
          );
        }}
        onOpenConfig={(record) => {
          setConfigRecord(record);
          setConfigRefreshVersion((current) => current + 1);
          setConfigOpen(true);
        }}
        onEdit={(record) => {
          setDialogMode("edit");
          setEditingRecord(record);
          setFormOpen(true);
        }}
        onDelete={(record) => void handleDelete(record)}
      />

      <DataTablePagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalCount={listQuery.data?.totalCount ?? 0}
        loading={listQuery.isLoading || listQuery.isFetching}
        onPageIndexChange={setPageIndex}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPageIndex(1);
        }}
      />

      <PackagingRuleFormDialog
        open={formOpen}
        mode={dialogMode}
        record={editingRecord}
        levelOptions={levelOptions}
        specOptions={specOptions}
        optionLoadErrors={formOptionLoadErrors}
        submitting={createMutation.isPending || updateMutation.isPending}
        onRetryOptions={() => {
          void levelOptionsQuery.refetch();
          void specOptionsQuery.refetch();
        }}
        onOpenChange={(nextOpen) => {
          setFormOpen(nextOpen);
          if (!nextOpen) {
            setEditingRecord(null);
          }
        }}
        onSubmit={handleFormSubmit}
      />

      <PackagingRuleConfigDialog
        open={configOpen}
        ruleCode={configRecord?.ruleCode ?? ""}
        ruleName={configRecord?.ruleName ?? ""}
        values={configQuery.data ?? null}
        loading={configQuery.isLoading}
        errorMessage={configQuery.isError ? configErrorMessage : null}
        submitting={saveConfigMutation.isPending}
        printTemplateOptions={printTemplateOptions}
        onOpenChange={(nextOpen) => {
          setConfigOpen(nextOpen);
          if (!nextOpen) {
            setConfigRecord(null);
          }
        }}
        onRetry={() => setConfigRefreshVersion((current) => current + 1)}
        onSubmit={handleConfigSubmit}
      />

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirmDelete.title")}
        description={
          deleteTarget && Array.isArray(deleteTarget)
            ? t("pages.packagingRule.feedback.confirmBatchDelete", { count: deleteTarget.length })
            : deleteTarget
              ? t("pages.packagingRule.feedback.confirmDelete", { name: deleteTarget.ruleName })
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
          all: t("pages.packagingRule.export.options.all"),
          current: t("pages.packagingRule.export.options.current"),
          selected: t("pages.packagingRule.export.options.selected"),
        }}
        messages={{
          title: t("pages.packagingRule.export.dialogTitle"),
          description: t("pages.packagingRule.export.dialogDescription"),
          confirm: t("pages.packagingRule.actions.export"),
          cancel: t("pages.packagingRule.actions.cancel"),
          exporting: t("pages.packagingRule.export.exporting"),
          selectedDisabledHint: t(
            "pages.packagingRule.export.selectedDisabledHint",
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
        businessKey="PackagingRule"
        businessName={t("pages.packagingRule.title")}
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
        businessKey="PackagingRule"
        onOpenChange={setTemplateDialogOpen}
      />
    </section>
  );
}
