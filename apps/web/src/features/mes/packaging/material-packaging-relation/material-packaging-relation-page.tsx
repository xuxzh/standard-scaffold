import {
  CirclePlusIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { DataTablePagination } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  flattenMaterialPackagingRelationRows,
  materialPackagingRelationDefaultFilters,
  materialPackagingRelationPageSize,
  type MaterialPackagingRelationApiDto,
  type MaterialPackagingRelationFilters,
  type MaterialPackagingRelationFormValues,
  type MaterialPackagingRelationRecord,
  type MaterialPackagingRelationTableRow,
  type MaterialOption,
} from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";
import { MaterialPackagingRelationFilterForm } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-filter-form";
import { MaterialPackagingRelationFormDialog } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-form-dialog";
import { MaterialPackagingRelationMaterialSidebar } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-material-sidebar";
import {
  useBatchDeleteMaterialPackagingRelationsMutation,
  useCreateMaterialPackagingRelationMutation,
  useDeleteMaterialPackagingRelationMutation,
  useMaterialPackagingRelationListQuery,
  useUpdateMaterialPackagingRelationMutation,
} from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-queries";
import { usePrintTemplateOptionsQuery } from "@/features/mes/packaging/print-template/print-template-queries";
import { MaterialPackagingRelationTable } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-table";
import { notify } from "@/lib/notify";

function mapRecordToApiDto(
  record: MaterialPackagingRelationRecord,
): MaterialPackagingRelationApiDto {
  return record.rawDto;
}

export function MaterialPackagingRelationPage() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState<MaterialPackagingRelationFilters>(
    materialPackagingRelationDefaultFilters,
  );
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(materialPackagingRelationPageSize);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selectedRelationIds, setSelectedRelationIds] = useState<number[]>([]);
  const [selectedMaterial, setSelectedMaterial] =
    useState<MaterialOption | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] =
    useState<MaterialPackagingRelationRecord | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaterialPackagingRelationRecord | MaterialPackagingRelationRecord[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const listQuery = useMaterialPackagingRelationListQuery(
    filters,
    selectedMaterial?.materialCode ?? "",
    pageIndex,
    pageSize,
    refreshVersion,
  );
  const createMutation = useCreateMaterialPackagingRelationMutation();
  const updateMutation = useUpdateMaterialPackagingRelationMutation();
  const deleteMutation = useDeleteMaterialPackagingRelationMutation();
  const batchDeleteMutation =
    useBatchDeleteMaterialPackagingRelationsMutation();

  const printTemplateOptionsQuery = usePrintTemplateOptionsQuery(formOpen);
  const printTemplateOptions = useMemo(
    () => printTemplateOptionsQuery.data ?? [],
    [printTemplateOptionsQuery.data],
  );

  const records = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  );

  const tableRows = useMemo(
    () => flattenMaterialPackagingRelationRows(records),
    [records],
  );
  const filterFormKey = JSON.stringify([
    filters.materialCode,
    filters.materialName,
    filters.packagingRuleCode,
    filters.packagingRuleName,
  ]);

  // Deduplicate selected ids: keep only relationIds present in current records
  const currentRelationIds = useMemo(
    () => new Set(records.map((r) => r.id)),
    [records],
  );

  // Filter selected ids to only those present in current records (computed, not effect)
  const filteredSelectedIds = useMemo(
    () => selectedRelationIds.filter((id) => currentRelationIds.has(id)),
    [selectedRelationIds, currentRelationIds],
  );

  // Deduplicate selection by relationId
  function handleToggleOne(relationId: number, checked: boolean) {
    setSelectedRelationIds((current) =>
      checked
        ? [...new Set([...current, relationId])]
        : current.filter((id) => id !== relationId),
    );
  }

  function handleToggleAll(checked: boolean) {
    if (checked) {
      const uniqueIds = [...new Set(records.map((r) => r.id))];
      setSelectedRelationIds(uniqueIds);
    } else {
      setSelectedRelationIds([]);
    }
  }

  // 列表加载失败由 queryCache.onError 统一提示。

  function handleMaterialSelect(material: MaterialOption) {
    setSelectedMaterial(material);
    setFilters((current) => ({
      ...current,
      materialCode: material.materialCode,
      materialName: material.materialName,
    }));
    setPageIndex(1);
    setRefreshVersion((current) => current + 1);
  }

  function handleMaterialClear() {
    setSelectedMaterial(null);
    setFilters(materialPackagingRelationDefaultFilters);
    setPageIndex(1);
    setRefreshVersion((current) => current + 1);
  }

  async function handleFormSubmit(values: MaterialPackagingRelationFormValues) {
    if (dialogMode === "create") {
      const result = await createMutation.mutateAsync(values);
      notify.apiSuccess("pages.materialPackagingRelation.feedback.created", result);
      setFormOpen(false);
      setEditingRecord(null);
      return;
    }

    if (editingRecord) {
      const result = await updateMutation.mutateAsync({
        id: editingRecord.id,
        ...values,
      });
      notify.apiSuccess("pages.materialPackagingRelation.feedback.updated", result);
      setFormOpen(false);
      setEditingRecord(null);
    }
  }

  async function handleDelete(row: MaterialPackagingRelationTableRow) {
    setDeleteTarget(row.record);
    setConfirmOpen(true);
  }

  async function handleBatchDelete() {
    if (!filteredSelectedIds.length) {
      return;
    }

    // Deduplicate: one DTO per relationId
    const uniqueIds = [...new Set(filteredSelectedIds)];
    const targetRecords = records.filter((r) => uniqueIds.includes(r.id));

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
      notify.apiSuccess("pages.materialPackagingRelation.feedback.batchDeleted", result);
      setSelectedRelationIds([]);

      if (records.length === deleteTarget.length && pageIndex > 1) {
        setPageIndex((current) => current - 1);
      }

      setConfirmOpen(false);
      setDeleteTarget(null);
      return;
    }

    const result = await deleteMutation.mutateAsync(mapRecordToApiDto(deleteTarget));
    notify.apiSuccess("pages.materialPackagingRelation.feedback.deleted", result);
    setSelectedRelationIds((current) =>
      current.filter((id) => id !== deleteTarget.id),
    );

    if (records.length === 1 && pageIndex > 1) {
      setPageIndex((current) => current - 1);
    }

    setConfirmOpen(false);
    setDeleteTarget(null);
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 gap-4 overflow-hidden">
        {/* Left Material Sidebar */}
        <MaterialPackagingRelationMaterialSidebar
          selectedMaterial={selectedMaterial}
          onSelect={handleMaterialSelect}
          onClear={handleMaterialClear}
        />

        {/* Right Content Area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          <MaterialPackagingRelationFilterForm
            key={filterFormKey}
            defaultValues={filters}
            onSubmit={(nextFilters) => {
              setPageIndex(1);
              setFilters(nextFilters);
              setRefreshVersion((current) => current + 1);
            }}
            onReset={(nextFilters) => {
              setPageIndex(1);
              setFilters(nextFilters);
              setSelectedMaterial(null);
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
                {t("pages.materialPackagingRelation.actions.create")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={
                  !filteredSelectedIds.length ||
                  batchDeleteMutation.isPending
                }
                onClick={() => void handleBatchDelete()}
              >
                <TrashIcon data-icon="inline-start" />
                {t("pages.materialPackagingRelation.actions.batchDelete")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={listQuery.isLoading}
                onClick={() =>
                  setRefreshVersion((current) => current + 1)
                }
              >
                <RefreshCwIcon data-icon="inline-start" />
                {t("pages.materialPackagingRelation.actions.refresh")}
              </Button>
            </div>
          </div>

          <MaterialPackagingRelationTable
            data={tableRows}
            loading={listQuery.isLoading}
            pageIndex={pageIndex}
            pageSize={materialPackagingRelationPageSize}
            selectedRelationIds={filteredSelectedIds}
            onToggleAll={handleToggleAll}
            onToggleOne={handleToggleOne}
            onEdit={(row) => {
              setDialogMode("edit");
              setEditingRecord(row.record);
              setFormOpen(true);
            }}
            onDelete={(row) => void handleDelete(row)}
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
        </div>
      </div>

      <MaterialPackagingRelationFormDialog
        open={formOpen}
        mode={dialogMode}
        record={editingRecord}
        createMaterial={selectedMaterial}
        submitting={
          createMutation.isPending || updateMutation.isPending
        }
        printTemplateOptions={printTemplateOptions}
        onOpenChange={(nextOpen) => {
          setFormOpen(nextOpen);
          if (!nextOpen) {
            setEditingRecord(null);
          }
        }}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirmDelete.title")}
        description={
          deleteTarget && Array.isArray(deleteTarget)
            ? t("pages.materialPackagingRelation.feedback.confirmBatchDelete", { count: deleteTarget.length })
            : deleteTarget
              ? t("pages.materialPackagingRelation.feedback.confirmDelete", { name: deleteTarget.materialCode })
              : ""
        }
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending || batchDeleteMutation.isPending}
      />
    </section>
  );
}
