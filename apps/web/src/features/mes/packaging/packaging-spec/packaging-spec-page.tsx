import { CirclePlusIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
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

  const query = usePackagingSpecListQuery(filters, pageIndex, pageSize, searchVersion);
  const createMutation = useCreatePackagingSpecMutation();
  const updateMutation = useUpdatePackagingSpecMutation();
  const deleteMutation = useDeletePackagingSpecMutation();
  const batchDeleteMutation = useBatchDeletePackagingSpecsMutation();
  const typeOptionsQuery = usePackagingSpecTypeOptionsQuery(true);
  const labelRuleOptionsQuery = useLabelRuleOptionsQuery(true);
  const unitOptionsQuery = useMaterialUnitOptionsQuery();

  const records = query.data?.items ?? [];

  async function handleSubmit(values: PackagingSpecFormValues) {
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

      <DataTablePagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalCount={query.data?.totalCount ?? 0}
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
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending || batchDeleteMutation.isPending}
      />
    </section>
  );
}
