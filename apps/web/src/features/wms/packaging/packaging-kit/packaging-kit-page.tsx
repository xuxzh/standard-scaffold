import {
  BoxesIcon,
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  packagingKitDefaultFilters,
  packagingKitPageSize,
  type PackagingKitApiDto,
  type PackagingKitFormValues,
  type PackagingKitRecord,
} from "@/features/wms/packaging/packaging-kit/packaging-kit-contract";
import { PackagingKitFilterForm } from "@/features/wms/packaging/packaging-kit/packaging-kit-filter-form";
import { PackagingKitFormDialog } from "@/features/wms/packaging/packaging-kit/packaging-kit-form-dialog";
import {
  useBatchDeletePackagingKitsMutation,
  useCreatePackagingKitMutation,
  useDeletePackagingKitMutation,
  usePackagingKitListQuery,
  useUpdatePackagingKitMutation,
} from "@/features/wms/packaging/packaging-kit/packaging-kit-queries";
import { PackagingKitTable } from "@/features/wms/packaging/packaging-kit/packaging-kit-table";

const emptyRecords: PackagingKitRecord[] = [];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return null;
}

function mapRecordToApiDto(record: PackagingKitRecord): PackagingKitApiDto {
  return {
    Id: record.id,
    KitCode: record.kitCode,
    KitName: record.kitName,
    MainMaterialCode: record.mainMaterialCode,
    MainMaterialName: record.mainMaterialName,
    Unit: record.unit,
    IsVirtualMain: record.isVirtualMain,
    ChildCount: record.childCount,
    Children: record.children.map((child) => ({
      Code: child.code,
      Name: child.name,
      Quantity: child.quantity,
      Unit: child.unit,
    })),
    Remark: record.remark,
    CreationTime: record.creationTime,
    LastModificationTime: record.lastModificationTime,
  };
}

export function PackagingKitPage() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState(packagingKitDefaultFilters);
  const [pageIndex, setPageIndex] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] = useState<PackagingKitRecord | null>(
    null,
  );
  const [viewingRecord, setViewingRecord] = useState<PackagingKitRecord | null>(
    null,
  );
  const [formOpen, setFormOpen] = useState(false);
  const listQuery = usePackagingKitListQuery(
    filters,
    pageIndex,
    refreshVersion,
  );
  const createMutation = useCreatePackagingKitMutation();
  const updateMutation = useUpdatePackagingKitMutation();
  const deleteMutation = useDeletePackagingKitMutation();
  const batchDeleteMutation = useBatchDeletePackagingKitsMutation();

  const records = listQuery.data?.items ?? emptyRecords;
  const tableData = listQuery.isError ? [] : records;
  const displayPageIndex = listQuery.data?.pageIndex ?? pageIndex;
  const queryErrorMessage = getErrorMessage(listQuery.error);
  const totalCount = listQuery.data?.totalCount ?? 0;
  const totalPages =
    totalCount > 0 ? Math.ceil(totalCount / packagingKitPageSize) : 1;
  const visibleSelectedIds = useMemo(() => {
    if (!records.length || !selectedIds.length) {
      return [];
    }

    const visibleIds = new Set(records.map((record) => record.id));

    return selectedIds.filter((id) => visibleIds.has(id));
  }, [records, selectedIds]);
  const canGoNext =
    !listQuery.isLoading &&
    !listQuery.isFetching &&
    totalCount > 0 &&
    pageIndex < totalPages;

  useEffect(() => {
    if (!listQuery.isError) {
      return;
    }

    toast.error(t("pages.packagingKit.states.errorTitle"), {
      description:
        queryErrorMessage ?? t("pages.packagingKit.states.errorDescription"),
    });
  }, [listQuery.isError, queryErrorMessage, t]);

  async function handleSubmit(values: PackagingKitFormValues) {
    try {
      if (dialogMode === "create") {
        await createMutation.mutateAsync(values);
        toast.success(t("pages.packagingKit.feedback.created"));
      } else if (editingRecord) {
        await updateMutation.mutateAsync({ id: editingRecord.id, ...values });
        toast.success(t("pages.packagingKit.feedback.updated"));
      }

      setFormOpen(false);
      setEditingRecord(null);
    } catch (error) {
      toast.error(
        getErrorMessage(error) ?? t("pages.packagingKit.feedback.submitFailed"),
      );
    }
  }

  async function handleDelete(record: PackagingKitRecord) {
    if (
      !window.confirm(
        t("pages.packagingKit.feedback.confirmDelete", {
          name: record.kitName,
        }),
      )
    ) {
      return;
    }

    await deleteMutation.mutateAsync(mapRecordToApiDto(record));
    setSelectedIds((current) => current.filter((id) => id !== record.id));
    toast.success(t("pages.packagingKit.feedback.deleted"));

    if (records.length === 1 && pageIndex > 1) {
      setPageIndex((current) => current - 1);
    }
  }

  async function handleBatchDelete() {
    if (!visibleSelectedIds.length) {
      return;
    }

    const targetRecords = records.filter((record) =>
      visibleSelectedIds.includes(record.id),
    );

    if (!targetRecords.length) {
      setSelectedIds([]);
      return;
    }

    if (
      !window.confirm(
        t("pages.packagingKit.feedback.confirmBatchDelete", {
          count: targetRecords.length,
        }),
      )
    ) {
      return;
    }

    await batchDeleteMutation.mutateAsync(targetRecords.map(mapRecordToApiDto));
    setSelectedIds([]);
    toast.success(t("pages.packagingKit.feedback.batchDeleted"));

    if (records.length === targetRecords.length && pageIndex > 1) {
      setPageIndex((current) => current - 1);
    }
  }

  return (
    <section className="flex flex-col gap-4" data-testid="packaging-kit-page">
      <PackagingKitFilterForm
        defaultValues={filters}
        onSubmit={(nextFilters) => {
          setSelectedIds([]);
          setPageIndex(1);
          setFilters(nextFilters);
          setRefreshVersion((current) => current + 1);
        }}
        onReset={(nextFilters) => {
          setSelectedIds([]);
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
            {t("pages.packagingKit.actions.create")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={
              !visibleSelectedIds.length || batchDeleteMutation.isPending
            }
            onClick={() => void handleBatchDelete()}
          >
            <TrashIcon data-icon="inline-start" />
            {t("pages.packagingKit.actions.batchDelete")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={listQuery.isLoading}
            onClick={() => setRefreshVersion((current) => current + 1)}
          >
            <RefreshCwIcon data-icon="inline-start" />
            {t("pages.packagingKit.actions.refresh")}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {listQuery.data
            ? t("pages.packagingKit.states.total", {
                count: listQuery.data.totalCount,
              })
            : ""}
        </div>
      </div>

      {listQuery.isError ? (
        <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex-1">
            <p className="font-medium">
              {t("pages.packagingKit.states.errorTitle")}
            </p>
            <p className="text-sm text-muted-foreground">
              {queryErrorMessage ??
                t("pages.packagingKit.states.errorDescription")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void listQuery.refetch()}
          >
            {t("pages.packagingKit.actions.retry")}
          </Button>
        </div>
      ) : null}

      <PackagingKitTable
        data={tableData}
        loading={listQuery.isLoading || listQuery.isFetching}
        pageIndex={pageIndex}
        pageSize={packagingKitPageSize}
        selectedIds={visibleSelectedIds}
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
        onViewChildren={(record) => setViewingRecord(record)}
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
          onClick={() => {
            setSelectedIds([]);
            setPageIndex((current) => Math.max(1, current - 1));
          }}
        >
          <ChevronLeftIcon data-icon="inline-start" />
          {t("pages.packagingKit.actions.previousPage")}
        </Button>
        <span className="text-sm text-muted-foreground">
          {t("pages.packagingKit.states.page", { page: displayPageIndex })}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={!canGoNext}
          onClick={() => {
            setSelectedIds([]);
            setPageIndex((current) => Math.min(totalPages, current + 1));
          }}
        >
          <ChevronRightIcon data-icon="inline-start" />
          {t("pages.packagingKit.actions.nextPage")}
        </Button>
      </div>

      <PackagingKitFormDialog
        open={formOpen}
        mode={dialogMode}
        record={editingRecord}
        submitting={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingRecord(null);
          }
        }}
        onSubmit={handleSubmit}
      />

      <Dialog
        open={Boolean(viewingRecord)}
        onOpenChange={(open) => !open && setViewingRecord(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("pages.packagingKit.childrenDialog.title")}
            </DialogTitle>
          </DialogHeader>

          {viewingRecord?.children.length ? (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3">
                      {t("pages.packagingKit.form.childCode")}
                    </th>
                    <th className="px-4 py-3">
                      {t("pages.packagingKit.form.childName")}
                    </th>
                    <th className="px-4 py-3">
                      {t("pages.packagingKit.form.childQuantity")}
                    </th>
                    <th className="px-4 py-3">
                      {t("pages.packagingKit.form.childUnit")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {viewingRecord.children.map((child) => (
                    <tr key={child.code} className="border-t">
                      <td className="px-4 py-3">{child.code}</td>
                      <td className="px-4 py-3">{child.name}</td>
                      <td className="px-4 py-3">{child.quantity}</td>
                      <td className="px-4 py-3">{child.unit || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("pages.packagingKit.states.emptyChildren")}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewingRecord(null)}
            >
              <BoxesIcon data-icon="inline-start" />
              {t("pages.packagingKit.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
