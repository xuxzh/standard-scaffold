import { CirclePlusIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  packagingSpecDefaultFilters,
  type PackagingSpecApiDto,
  type PackagingSpecFilters,
  type PackagingSpecFormValues,
  type PackagingSpecRecord,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-contract";
import { PackagingSpecFilterForm } from "@/features/mes/packaging/packaging-spec/packaging-spec-filter-form";
import { PackagingSpecFormDialog } from "@/features/mes/packaging/packaging-spec/packaging-spec-form-dialog";
import {
  useBatchDeletePackagingSpecsMutation,
  useCreatePackagingSpecMutation,
  useDeletePackagingSpecMutation,
  usePackagingSpecLevelOptionsQuery,
  usePackagingSpecListQuery,
  usePackagingSpecTypeOptionsQuery,
  useUpdatePackagingSpecMutation,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-queries";
import { PackagingSpecTable } from "@/features/mes/packaging/packaging-spec/packaging-spec-table";

function mapRecordToApiDto(record: PackagingSpecRecord): PackagingSpecApiDto {
  return {
    Id: record.id,
    SpecCode: record.specCode,
    SpecName: record.specName,
    PackagingTypeCode: record.packagingTypeCode,
    PackagingTypeName: record.packagingTypeName,
    PackagingLevelCode: record.packagingLevelCode,
    PackagingLevelName: record.packagingLevelName,
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

function getQueryErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return null;
}

export function PackagingSpecPage() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState<PackagingSpecFilters>(packagingSpecDefaultFilters);
  const [pageIndex, setPageIndex] = useState(1);
  const [searchVersion, setSearchVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] = useState<PackagingSpecRecord | null>(null);

  const query = usePackagingSpecListQuery(filters, pageIndex, searchVersion);
  const createMutation = useCreatePackagingSpecMutation();
  const updateMutation = useUpdatePackagingSpecMutation();
  const deleteMutation = useDeletePackagingSpecMutation();
  const batchDeleteMutation = useBatchDeletePackagingSpecsMutation();
  const typeOptionsQuery = usePackagingSpecTypeOptionsQuery(true);
  const levelOptionsQuery = usePackagingSpecLevelOptionsQuery(true);

  const records = query.data?.items ?? [];
  const errorMessage = getQueryErrorMessage(query.error);

  async function handleSubmit(values: PackagingSpecFormValues) {
    if (dialogMode === "create") {
      await createMutation.mutateAsync(values);
    } else if (editingRecord) {
      await updateMutation.mutateAsync({ id: editingRecord.id, ...values });
    }

    setDialogOpen(false);
    setEditingRecord(null);
  }

  async function handleDelete(record: PackagingSpecRecord) {
    if (!window.confirm(t("pages.packagingSpec.feedback.confirmDelete", { name: record.specCode }))) {
      return;
    }

    await deleteMutation.mutateAsync(mapRecordToApiDto(record));
    setSelectedIds((current) => current.filter((id) => id !== record.id));
  }

  async function handleBatchDelete() {
    const targets = records.filter((record) => selectedIds.includes(record.id));

    if (!targets.length) {
      return;
    }

    if (
      !window.confirm(
        t("pages.packagingSpec.feedback.confirmBatchDelete", { count: targets.length }),
      )
    ) {
      return;
    }

    await batchDeleteMutation.mutateAsync(targets.map(mapRecordToApiDto));
    setSelectedIds([]);
  }

  return (
    <section className="flex flex-col gap-4">
      <PackagingSpecFilterForm
        defaultValues={filters}
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

      {query.isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <div className="font-medium text-destructive">
            {t("pages.packagingSpec.states.errorTitle")}
          </div>
          {errorMessage ? <div className="mt-1 text-muted-foreground">{errorMessage}</div> : null}
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => setSearchVersion((current) => current + 1)}
          >
            {t("pages.packagingSpec.actions.retry")}
          </Button>
        </div>
      ) : null}

      <PackagingSpecTable
        data={query.isError ? [] : records}
        loading={query.isLoading || query.isFetching}
        selectedIds={selectedIds}
        onToggleOne={(id, checked) => {
          setSelectedIds((current) =>
            checked ? [...new Set([...current, id])] : current.filter((item) => item !== id),
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

      <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
        <Button
          type="button"
          variant="outline"
          disabled={pageIndex <= 1}
          onClick={() => setPageIndex((current) => Math.max(1, current - 1))}
        >
          {t("pages.packagingSpec.actions.previousPage")}
        </Button>
        <span>{t("pages.packagingSpec.states.page", { page: pageIndex })}</span>
        <Button
          type="button"
          variant="outline"
          disabled={!records.length}
          onClick={() => setPageIndex((current) => current + 1)}
        >
          {t("pages.packagingSpec.actions.nextPage")}
        </Button>
      </div>

      <PackagingSpecFormDialog
        open={dialogOpen}
        mode={dialogMode}
        record={editingRecord}
        typeOptions={typeOptionsQuery.data ?? []}
        levelOptions={levelOptionsQuery.data ?? []}
        optionsError={typeOptionsQuery.isError || levelOptionsQuery.isError}
        submitting={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingRecord(null);
          }
        }}
        onSubmit={handleSubmit}
      />
    </section>
  );
}