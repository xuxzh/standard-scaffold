import {
  CirclePlusIcon,
  GitBranchPlusIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { DataTablePagination } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  packagingLevelDefaultFilters,
  packagingLevelPageSize,
  type PackagingLevelApiDto,
  type PackagingLevelFilters,
  type PackagingLevelFormValues,
  type PackagingLevelOption,
  type PackagingLevelRecord,
} from "@/features/mes/packaging/packaging-level/packaging-level-contract";
import { PackagingLevelFilterForm } from "@/features/mes/packaging/packaging-level/packaging-level-filter-form";
import { PackagingLevelFormDialog } from "@/features/mes/packaging/packaging-level/packaging-level-form-dialog";
import {
  useBatchDeletePackagingLevelsMutation,
  useCreatePackagingLevelMutation,
  useDeletePackagingLevelMutation,
  usePackagingLevelListQuery,
  usePackagingLevelOptionsQuery,
  usePackagingLevelTreeQuery,
  useUpdatePackagingLevelMutation,
} from "@/features/mes/packaging/packaging-level/packaging-level-queries";
import { PackagingLevelTable } from "@/features/mes/packaging/packaging-level/packaging-level-table";
import { PackagingLevelTreeDialog } from "@/features/mes/packaging/packaging-level/packaging-level-tree-dialog";
import { notify } from "@/lib/notify";

function mapRecordToApiDto(record: PackagingLevelRecord): PackagingLevelApiDto {
  return {
    Id: record.id,
    LevelCode: record.levelCode,
    LevelName: record.levelName,
    ParentLevelCode: record.parentLevelCode || null,
    ParentLevelName: record.parentLevelName || null,
    Description: record.description,
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

function filterOptionsForRecord(
  options: PackagingLevelOption[],
  record: PackagingLevelRecord | null,
) {
  if (!record) {
    return options;
  }

  return options.filter((option) => option.levelCode !== record.levelCode);
}

export function PackagingLevelPage() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState<PackagingLevelFilters>(
    packagingLevelDefaultFilters,
  );
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(packagingLevelPageSize);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] =
    useState<PackagingLevelRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
  const [treeRefreshVersion, setTreeRefreshVersion] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PackagingLevelRecord | PackagingLevelRecord[] | null>(null);
  const listQuery = usePackagingLevelListQuery(
    filters,
    pageIndex,
    pageSize,
    refreshVersion,
  );
  const optionsQuery = usePackagingLevelOptionsQuery();
  const treeQuery = usePackagingLevelTreeQuery(treeOpen, treeRefreshVersion);
  const createMutation = useCreatePackagingLevelMutation();
  const updateMutation = useUpdatePackagingLevelMutation();
  const deleteMutation = useDeletePackagingLevelMutation();
  const batchDeleteMutation = useBatchDeletePackagingLevelsMutation();

  const records = listQuery.data?.items ?? [];
  const parentOptions = useMemo(
    () => optionsQuery.data ?? [],
    [optionsQuery.data],
  );
  const tableData = listQuery.isError ? [] : records;
  const treeErrorMessage = getErrorMessage(treeQuery.error);

  // 列表与下拉选项加载失败由 queryCache.onError 统一提示。

  async function handleSubmit(
    values: PackagingLevelFormValues & { parentLevelName?: string },
  ) {
    if (dialogMode === "create") {
      const result = await createMutation.mutateAsync(values);
      notify.apiSuccess("pages.packagingLevel.feedback.created", result);
      setFormOpen(false);
      setEditingRecord(null);
      return;
    }

    if (editingRecord) {
      const result = await updateMutation.mutateAsync({
        id: editingRecord.id,
        ...values,
      });
      notify.apiSuccess("pages.packagingLevel.feedback.updated", result);
      setFormOpen(false);
      setEditingRecord(null);
    }
  }

  async function handleDelete(record: PackagingLevelRecord) {
    setDeleteTarget(record);
    setConfirmOpen(true);
  }

  async function handleBatchDelete() {
    if (!selectedIds.length) {
      return;
    }

    const targetRecords = records.filter((record) =>
      selectedIds.includes(record.id),
    );

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
      notify.apiSuccess("pages.packagingLevel.feedback.batchDeleted", result);
      setSelectedIds([]);

      if (records.length === deleteTarget.length && pageIndex > 1) {
        setPageIndex((current) => current - 1);
      }

      setConfirmOpen(false);
      setDeleteTarget(null);
      return;
    }

    const result = await deleteMutation.mutateAsync(mapRecordToApiDto(deleteTarget));
    notify.apiSuccess("pages.packagingLevel.feedback.deleted", result);
    setSelectedIds((current) =>
      current.filter((id) => id !== deleteTarget.id),
    );

    if (records.length === 1 && pageIndex > 1) {
      setPageIndex((current) => current - 1);
    }

    setConfirmOpen(false);
    setDeleteTarget(null);
  }

  const filteredParentOptions = useMemo(
    () => filterOptionsForRecord(parentOptions, editingRecord),
    [editingRecord, parentOptions],
  );

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <PackagingLevelFilterForm
        key={JSON.stringify(filters)}
        defaultValues={filters}
        parentOptions={parentOptions}
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
            {t("pages.packagingLevel.actions.create")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!selectedIds.length || batchDeleteMutation.isPending}
            onClick={() => void handleBatchDelete()}
          >
            <TrashIcon data-icon="inline-start" />
            {t("pages.packagingLevel.actions.batchDelete")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={listQuery.isLoading}
            onClick={() => setRefreshVersion((current) => current + 1)}
          >
            <RefreshCwIcon data-icon="inline-start" />
            {t("pages.packagingLevel.actions.refresh")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setTreeRefreshVersion((current) => current + 1);
              setTreeOpen(true);
            }}
          >
            <GitBranchPlusIcon data-icon="inline-start" />
            {t("pages.packagingLevel.actions.viewTree")}
          </Button>
        </div>
      </div>

      <PackagingLevelTable
        data={tableData}
        loading={listQuery.isLoading || listQuery.isFetching}
        pageIndex={pageIndex}
        pageSize={packagingLevelPageSize}
        selectedIds={selectedIds}
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
        onPageIndexChange={setPageIndex}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPageIndex(1);
        }}
      />

      <PackagingLevelFormDialog
        open={formOpen}
        mode={dialogMode}
        record={editingRecord}
        parentOptions={filteredParentOptions}
        submitting={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingRecord(null);
          }
        }}
        onSubmit={handleSubmit}
      />

      <PackagingLevelTreeDialog
        open={treeOpen}
        loading={treeQuery.isLoading || treeQuery.isFetching}
        nodes={treeQuery.data ?? []}
        error={treeQuery.isError}
        onOpenChange={setTreeOpen}
        onRetry={() => void treeQuery.refetch()}
      />

      {treeQuery.isError && treeOpen ? (
        <div className="sr-only">
          {treeErrorMessage ?? t("pages.packagingLevel.tree.error")}
        </div>
      ) : null}

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirmDelete.title")}
        description={
          deleteTarget && Array.isArray(deleteTarget)
            ? t("pages.packagingLevel.feedback.confirmBatchDelete", { count: deleteTarget.length })
            : deleteTarget
              ? t("pages.packagingLevel.feedback.confirmDelete", { name: deleteTarget.levelName })
              : ""
        }
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending || batchDeleteMutation.isPending}
      />
    </section>
  );
}
