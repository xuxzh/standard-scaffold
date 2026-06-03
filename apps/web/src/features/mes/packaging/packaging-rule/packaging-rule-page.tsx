import { ChevronLeftIcon, ChevronRightIcon, CirclePlusIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
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

  const listQuery = usePackagingRuleListQuery(filters, pageIndex, refreshVersion);
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

    if (Array.isArray(deleteTarget)) {
      await batchDeleteMutation.mutateAsync(deleteTarget.map(mapRecordToApiDto));
      setSelectedIds([]);
      toast.success(t("pages.packagingRule.feedback.batchDeleted"));

      if (records.length === deleteTarget.length && pageIndex > 1) {
        setPageIndex((current) => current - 1);
      }
    } else {
      await deleteMutation.mutateAsync(mapRecordToApiDto(deleteTarget));
      setSelectedIds((current) => current.filter((id) => id !== deleteTarget.id));
      toast.success(t("pages.packagingRule.feedback.deleted"));

      if (records.length === 1 && pageIndex > 1) {
        setPageIndex((current) => current - 1);
      }
    }

    setConfirmOpen(false);
    setDeleteTarget(null);
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
        <div className="text-sm text-muted-foreground">
          {listQuery.data
            ? t("pages.packagingRule.states.total", { count: listQuery.data.totalCount })
            : ""}
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

      <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
        <span>{t("pages.packagingRule.states.page", { page: pageIndex })}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pageIndex <= 1 || listQuery.isLoading}
          onClick={() => setPageIndex((current) => Math.max(1, current - 1))}
        >
          <ChevronLeftIcon data-icon="inline-start" />
          {t("pages.packagingRule.actions.previousPage")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!listQuery.data || pageIndex * packagingRulePageSize >= listQuery.data.totalCount}
          onClick={() => setPageIndex((current) => current + 1)}
        >
          {t("pages.packagingRule.actions.nextPage")}
          <ChevronRightIcon data-icon="inline-end" />
        </Button>
      </div>

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
