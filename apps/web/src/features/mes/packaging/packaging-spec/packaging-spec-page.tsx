import { CirclePlusIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
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

export function PackagingSpecPage() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState<PackagingSpecFilters>(
    packagingSpecDefaultFilters,
  );
  const [pageIndex, setPageIndex] = useState(1);
  const [searchVersion, setSearchVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] =
    useState<PackagingSpecRecord | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PackagingSpecRecord | PackagingSpecRecord[] | null>(null);

  const query = usePackagingSpecListQuery(filters, pageIndex, searchVersion);
  const createMutation = useCreatePackagingSpecMutation();
  const updateMutation = useUpdatePackagingSpecMutation();
  const deleteMutation = useDeletePackagingSpecMutation();
  const batchDeleteMutation = useBatchDeletePackagingSpecsMutation();
  const typeOptionsQuery = usePackagingSpecTypeOptionsQuery(true);
  const levelOptionsQuery = usePackagingSpecLevelOptionsQuery(true);

  const records = query.data?.items ?? [];

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
      await batchDeleteMutation.mutateAsync(deleteTarget.map(mapRecordToApiDto));
      setSelectedIds([]);
    } else {
      await deleteMutation.mutateAsync(mapRecordToApiDto(deleteTarget));
      setSelectedIds((current) => current.filter((id) => id !== deleteTarget.id));
    }

    setConfirmOpen(false);
    setDeleteTarget(null);
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
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

      <PackagingSpecTable
        data={query.isError ? [] : records}
        loading={query.isLoading || query.isFetching}
        pageIndex={pageIndex}
        pageSize={packagingSpecPageSize}
        selectedIds={selectedIds}
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
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending || batchDeleteMutation.isPending}
      />
    </section>
  );
}
