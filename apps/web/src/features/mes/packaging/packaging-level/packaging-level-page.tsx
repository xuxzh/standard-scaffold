import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CirclePlusIcon,
  GitBranchPlusIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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

function mapRecordToApiDto(record: PackagingLevelRecord): PackagingLevelApiDto {
  return {
    Id: record.id,
    LevelCode: record.levelCode,
    LevelSequence: record.levelSequence,
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
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] =
    useState<PackagingLevelRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
  const [treeRefreshVersion, setTreeRefreshVersion] = useState(0);
  const listQuery = usePackagingLevelListQuery(
    filters,
    pageIndex,
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
  const queryErrorMessage = getErrorMessage(listQuery.error);
  const treeErrorMessage = getErrorMessage(treeQuery.error);

  useEffect(() => {
    if (!listQuery.isError) {
      return;
    }

    toast.error(t("pages.packagingLevel.states.errorTitle"), {
      description:
        queryErrorMessage ?? t("pages.packagingLevel.states.errorDescription"),
    });
  }, [listQuery.isError, queryErrorMessage, t]);

  useEffect(() => {
    if (!optionsQuery.isError) {
      return;
    }

    toast.error(t("pages.packagingLevel.feedback.optionsLoadFailed"), {
      description:
        getErrorMessage(optionsQuery.error) ??
        t("pages.packagingLevel.feedback.optionsLoadFailed"),
    });
  }, [optionsQuery.error, optionsQuery.isError, t]);

  async function handleSubmit(
    values: PackagingLevelFormValues & { parentLevelName?: string },
  ) {
    try {
      if (dialogMode === "create") {
        await createMutation.mutateAsync(values);
        toast.success(t("pages.packagingLevel.feedback.created"));
      } else if (editingRecord) {
        await updateMutation.mutateAsync({ id: editingRecord.id, ...values });
        toast.success(t("pages.packagingLevel.feedback.updated"));
      }

      setFormOpen(false);
      setEditingRecord(null);
    } catch (error) {
      toast.error(
        getErrorMessage(error) ??
          t("pages.packagingLevel.feedback.submitFailed"),
      );
    }
  }

  async function handleDelete(record: PackagingLevelRecord) {
    if (
      !window.confirm(
        t("pages.packagingLevel.feedback.confirmDelete", {
          name: record.levelName,
        }),
      )
    ) {
      return;
    }

    await deleteMutation.mutateAsync(mapRecordToApiDto(record));
    setSelectedIds((current) => current.filter((id) => id !== record.id));
    toast.success(t("pages.packagingLevel.feedback.deleted"));

    if (records.length === 1 && pageIndex > 1) {
      setPageIndex((current) => current - 1);
    }
  }

  async function handleBatchDelete() {
    if (!selectedIds.length) {
      return;
    }

    const targetRecords = records.filter((record) =>
      selectedIds.includes(record.id),
    );

    if (
      !window.confirm(
        t("pages.packagingLevel.feedback.confirmBatchDelete", {
          count: targetRecords.length,
        }),
      )
    ) {
      return;
    }

    await batchDeleteMutation.mutateAsync(targetRecords.map(mapRecordToApiDto));
    setSelectedIds([]);
    toast.success(t("pages.packagingLevel.feedback.batchDeleted"));

    if (records.length === targetRecords.length && pageIndex > 1) {
      setPageIndex((current) => current - 1);
    }
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
        <div className="text-sm text-muted-foreground">
          {listQuery.data
            ? t("pages.packagingLevel.states.total", {
                count: listQuery.data.totalCount,
              })
            : ""}
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

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pageIndex <= 1 || listQuery.isLoading}
          onClick={() => setPageIndex((current) => Math.max(1, current - 1))}
        >
          <ChevronLeftIcon data-icon="inline-start" />
          {t("pages.packagingLevel.actions.previousPage")}
        </Button>
        <span className="text-sm text-muted-foreground">
          {t("pages.packagingLevel.states.page", { page: pageIndex })}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={
            listQuery.isLoading || (listQuery.data?.items.length ?? 0) === 0
          }
          onClick={() => setPageIndex((current) => current + 1)}
        >
          <ChevronRightIcon data-icon="inline-start" />
          {t("pages.packagingLevel.actions.nextPage")}
        </Button>
      </div>

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
    </section>
  );
}
