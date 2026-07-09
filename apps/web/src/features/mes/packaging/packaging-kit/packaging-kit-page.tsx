import {
  BoxesIcon,
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
} from "@/features/mes/packaging/packaging-kit/packaging-kit-contract";
import { PackagingKitFilterForm } from "@/features/mes/packaging/packaging-kit/packaging-kit-filter-form";
import { PackagingKitFormDialog } from "@/features/mes/packaging/packaging-kit/packaging-kit-form-dialog";
import {
  useBatchDeletePackagingKitsMutation,
  useCreatePackagingKitMutation,
  useDeletePackagingKitMutation,
  usePackagingKitListQuery,
  useUpdatePackagingKitMutation,
} from "@/features/mes/packaging/packaging-kit/packaging-kit-queries";
import { PackagingKitTable } from "@/features/mes/packaging/packaging-kit/packaging-kit-table";
import { notify } from "@/lib/notify";

const emptyRecords: PackagingKitRecord[] = [];

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
  const [pageSize, setPageSize] = useState(packagingKitPageSize);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] = useState<PackagingKitRecord | null>(
    null,
  );
  const [viewingRecord, setViewingRecord] = useState<PackagingKitRecord | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PackagingKitRecord | PackagingKitRecord[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const listQuery = usePackagingKitListQuery(
    filters,
    pageIndex,
    pageSize,
    refreshVersion,
  );
  const createMutation = useCreatePackagingKitMutation();
  const updateMutation = useUpdatePackagingKitMutation();
  const deleteMutation = useDeletePackagingKitMutation();
  const batchDeleteMutation = useBatchDeletePackagingKitsMutation();

  const records = listQuery.data?.items ?? emptyRecords;
  const tableData = listQuery.isError ? [] : records;
  const visibleSelectedIds = useMemo(() => {
    if (!records.length || !selectedIds.length) {
      return [];
    }

    const visibleIds = new Set(records.map((record) => record.id));

    return selectedIds.filter((id) => visibleIds.has(id));
  }, [records, selectedIds]);

  // 列表加载失败由 queryCache.onError 统一提示。

  async function handleSubmit(values: PackagingKitFormValues) {
    if (dialogMode === "create") {
      const result = await createMutation.mutateAsync(values);
      notify.apiSuccess("pages.packagingKit.feedback.created", result);
      setFormOpen(false);
      setEditingRecord(null);
      return;
    }

    if (editingRecord) {
      const result = await updateMutation.mutateAsync({
        id: editingRecord.id,
        ...values,
      });
      notify.apiSuccess("pages.packagingKit.feedback.updated", result);
      setFormOpen(false);
      setEditingRecord(null);
    }
  }

  async function handleDelete(record: PackagingKitRecord) {
    setDeleteTarget(record);
    setConfirmOpen(true);
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
      notify.apiSuccess("pages.packagingKit.feedback.batchDeleted", result);
      setSelectedIds([]);

      if (records.length === deleteTarget.length && pageIndex > 1) {
        setPageIndex((current) => current - 1);
      }

      setConfirmOpen(false);
      setDeleteTarget(null);
      return;
    }

    const result = await deleteMutation.mutateAsync(mapRecordToApiDto(deleteTarget));
    notify.apiSuccess("pages.packagingKit.feedback.deleted", result);
    setSelectedIds((current) =>
      current.filter((id) => id !== deleteTarget.id),
    );

    if (records.length === 1 && pageIndex > 1) {
      setPageIndex((current) => current - 1);
    }

    setConfirmOpen(false);
    setDeleteTarget(null);
  }

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden"
      data-testid="packaging-kit-page"
    >
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
      </div>

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

      <DataTablePagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalCount={listQuery.data?.totalCount ?? 0}
        loading={listQuery.isLoading || listQuery.isFetching}
        onPageIndexChange={(nextPageIndex) => {
          setSelectedIds([]);
          setPageIndex(nextPageIndex);
        }}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPageIndex(1);
        }}
      />

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
      {/* 查看子件对话框 */}
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

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirmDelete.title")}
        description={
          deleteTarget && Array.isArray(deleteTarget)
            ? t("pages.packagingKit.feedback.confirmBatchDelete", { count: deleteTarget.length })
            : deleteTarget
              ? t("pages.packagingKit.feedback.confirmDelete", { name: deleteTarget.kitName })
              : ""
        }
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending || batchDeleteMutation.isPending}
      />
    </section>
  );
}
