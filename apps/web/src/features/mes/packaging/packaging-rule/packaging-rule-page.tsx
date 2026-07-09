import { CirclePlusIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
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
import { notify } from "@/lib/notify";

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

  // 列表加载失败由 queryCache.onError 统一提示。

  async function handleFormSubmit(values: PackagingRuleFormValues) {
    if (dialogMode === "create") {
      const result = await createMutation.mutateAsync(values);
      notify.apiSuccess("pages.packagingRule.feedback.created", result);
      setFormOpen(false);
      setEditingRecord(null);
      return;
    }

    if (editingRecord) {
      const result = await updateMutation.mutateAsync({
        id: editingRecord.id,
        ...values,
      });
      notify.apiSuccess("pages.packagingRule.feedback.updated", result);
      setFormOpen(false);
      setEditingRecord(null);
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

    if (Array.isArray(deleteTarget)) {
      const result = await batchDeleteMutation.mutateAsync(
        deleteTarget.map(mapRecordToApiDto),
      );
      notify.apiSuccess("pages.packagingRule.feedback.batchDeleted", result);
      setSelectedIds([]);

      if (records.length === deleteTarget.length && pageIndex > 1) {
        setPageIndex((current) => current - 1);
      }

      setConfirmOpen(false);
      setDeleteTarget(null);
      return;
    }

    const result = await deleteMutation.mutateAsync(mapRecordToApiDto(deleteTarget));
    notify.apiSuccess("pages.packagingRule.feedback.deleted", result);
    setSelectedIds((current) =>
      current.filter((id) => id !== deleteTarget.id),
    );

    if (records.length === 1 && pageIndex > 1) {
      setPageIndex((current) => current - 1);
    }

    setConfirmOpen(false);
    setDeleteTarget(null);
  }

  async function handleConfigSubmit(values: PackagingRuleConfigFormValues) {
    const result = await saveConfigMutation.mutateAsync(values);
    notify.apiSuccess("pages.packagingRule.feedback.configSaved", result);
    setConfigOpen(false);
    setConfigRecord(null);
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
    </section>
  );
}
