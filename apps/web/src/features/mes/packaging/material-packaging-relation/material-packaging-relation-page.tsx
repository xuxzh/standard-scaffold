import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CirclePlusIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
import { MaterialPackagingRelationTable } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-table";

function mapRecordToApiDto(
  record: MaterialPackagingRelationRecord,
): MaterialPackagingRelationApiDto {
  return record.rawDto;
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

export function MaterialPackagingRelationPage() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState<MaterialPackagingRelationFilters>(
    materialPackagingRelationDefaultFilters,
  );
  const [pageIndex, setPageIndex] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selectedRelationIds, setSelectedRelationIds] = useState<number[]>([]);
  const [selectedMaterial, setSelectedMaterial] =
    useState<MaterialOption | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] =
    useState<MaterialPackagingRelationRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const listQuery = useMaterialPackagingRelationListQuery(
    filters,
    selectedMaterial?.materialCode ?? "",
    pageIndex,
    refreshVersion,
  );
  const createMutation = useCreateMaterialPackagingRelationMutation();
  const updateMutation = useUpdateMaterialPackagingRelationMutation();
  const deleteMutation = useDeleteMaterialPackagingRelationMutation();
  const batchDeleteMutation =
    useBatchDeleteMaterialPackagingRelationsMutation();

  const records = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  );
  const hasListError = listQuery.isError || listQuery.isRefetchError;
  const listErrorMessage = getErrorMessage(listQuery.error);

  const tableRows = useMemo(
    () => flattenMaterialPackagingRelationRows(records),
    [records],
  );

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

  useEffect(() => {
    if (!hasListError) {
      return;
    }

    toast.error(t("pages.materialPackagingRelation.states.errorTitle"), {
      description:
        listErrorMessage ??
        t("pages.materialPackagingRelation.states.errorDescription"),
    });
  }, [hasListError, listErrorMessage, t]);

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
    try {
      if (dialogMode === "create") {
        await createMutation.mutateAsync(values);
        toast.success(
          t("pages.materialPackagingRelation.feedback.created"),
        );
      } else if (editingRecord) {
        await updateMutation.mutateAsync({
          id: editingRecord.id,
          ...values,
        });
        toast.success(
          t("pages.materialPackagingRelation.feedback.updated"),
        );
      }

      setFormOpen(false);
      setEditingRecord(null);
    } catch (error) {
      toast.error(
        getErrorMessage(error) ??
          t("pages.materialPackagingRelation.feedback.submitFailed"),
      );
    }
  }

  async function handleDelete(row: MaterialPackagingRelationTableRow) {
    if (
      !window.confirm(
        t("pages.materialPackagingRelation.feedback.confirmDelete", {
          name: row.record.materialCode,
        }),
      )
    ) {
      return;
    }

    await deleteMutation.mutateAsync(mapRecordToApiDto(row.record));
    setSelectedRelationIds((current) =>
      current.filter((id) => id !== row.relationId),
    );
    toast.success(t("pages.materialPackagingRelation.feedback.deleted"));

    if (records.length === 1 && pageIndex > 1) {
      setPageIndex((current) => current - 1);
    }
  }

  async function handleBatchDelete() {
    if (!filteredSelectedIds.length) {
      return;
    }

    // Deduplicate: one DTO per relationId
    const uniqueIds = [...new Set(filteredSelectedIds)];
    const targetRecords = records.filter((r) => uniqueIds.includes(r.id));

    if (
      !window.confirm(
        t("pages.materialPackagingRelation.feedback.confirmBatchDelete", {
          count: targetRecords.length,
        }),
      )
    ) {
      return;
    }

    await batchDeleteMutation.mutateAsync(
      targetRecords.map(mapRecordToApiDto),
    );
    setSelectedRelationIds([]);
    toast.success(
      t("pages.materialPackagingRelation.feedback.batchDeleted"),
    );

    if (records.length === targetRecords.length && pageIndex > 1) {
      setPageIndex((current) => current - 1);
    }
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex min-h-0 min-w-0 flex-1 gap-4">
        {/* Left Material Sidebar */}
        <MaterialPackagingRelationMaterialSidebar
          selectedMaterial={selectedMaterial}
          onSelect={handleMaterialSelect}
          onClear={handleMaterialClear}
        />

        {/* Right Content Area */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <MaterialPackagingRelationFilterForm
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
            <div className="text-sm text-muted-foreground">
              {listQuery.data
                ? t("pages.materialPackagingRelation.states.total", {
                    count: listQuery.data.totalCount,
                  })
                : ""}
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

          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <span>
              {t("pages.materialPackagingRelation.states.page", {
                page: pageIndex,
              })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageIndex <= 1 || listQuery.isLoading}
              onClick={() =>
                setPageIndex((current) => Math.max(1, current - 1))
              }
            >
              <ChevronLeftIcon data-icon="inline-start" />
              {t("pages.materialPackagingRelation.actions.previousPage")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                !listQuery.data ||
                pageIndex * materialPackagingRelationPageSize >=
                  listQuery.data.totalCount
              }
              onClick={() => setPageIndex((current) => current + 1)}
            >
              {t("pages.materialPackagingRelation.actions.nextPage")}
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>

      <MaterialPackagingRelationFormDialog
        open={formOpen}
        mode={dialogMode}
        record={editingRecord}
        submitting={
          createMutation.isPending || updateMutation.isPending
        }
        onOpenChange={(nextOpen) => {
          setFormOpen(nextOpen);
          if (!nextOpen) {
            setEditingRecord(null);
          }
        }}
        onSubmit={handleFormSubmit}
      />
    </section>
  );
}
