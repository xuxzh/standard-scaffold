import { SquarePenIcon, TrashIcon } from "lucide-react";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { PackagingKitRecord } from "@/features/mes/packaging/packaging-kit/packaging-kit-contract";

type PackagingKitTableProps = {
  data: PackagingKitRecord[];
  loading?: boolean;
  pageIndex: number;
  pageSize: number;
  selectedIds: number[];
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: number, checked: boolean) => void;
  onViewChildren: (record: PackagingKitRecord) => void;
  onEdit: (record: PackagingKitRecord) => void;
  onDelete: (record: PackagingKitRecord) => void;
};

export function PackagingKitTable({
  data,
  loading = false,
  pageIndex,
  pageSize,
  selectedIds,
  onToggleAll,
  onToggleOne,
  onEdit,
  onDelete,
}: PackagingKitTableProps) {
  const { t } = useTranslation("common");
  const allSelected =
    data.length > 0 && data.every((row) => selectedIds.includes(row.id));

  const columns = useMemo<ColumnDef<PackagingKitRecord>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            aria-label={t("pages.packagingKit.table.selectAll")}
            checked={allSelected}
            type="checkbox"
            onChange={(event) => onToggleAll(event.target.checked)}
          />
        ),
        cell: ({ row }) => (
          <input
            aria-label={t("pages.packagingKit.table.selectOne", {
              name: row.original.kitCode,
            })}
            checked={selectedIds.includes(row.original.id)}
            data-testid={`packaging-kit-select-${row.original.kitCode}`}
            type="checkbox"
            onChange={(event) =>
              onToggleOne(row.original.id, event.target.checked)
            }
          />
        ),
      },
      {
        accessorKey: "kitCode",
        header: t("pages.packagingKit.table.kitCode"),
      },
      {
        accessorKey: "kitName",
        header: t("pages.packagingKit.table.kitName"),
      },
      {
        accessorKey: "mainMaterialCode",
        header: t("pages.packagingKit.table.mainMaterialCode"),
      },
      {
        accessorKey: "mainMaterialName",
        header: t("pages.packagingKit.table.mainMaterialName"),
      },
      {
        accessorKey: "unit",
        header: t("pages.packagingKit.table.unit"),
      },
      {
        accessorKey: "isVirtualMain",
        header: t("pages.packagingKit.table.isVirtualMain"),
        cell: ({ row }) =>
          row.original.isVirtualMain
            ? t("pages.packagingKit.form.virtualMainTrue")
            : t("pages.packagingKit.form.virtualMainFalse"),
      },
      {
        accessorKey: "childCount",
        header: t("pages.packagingKit.table.childCount"),
      },
      {
        id: "actions",
        header: t("pages.packagingKit.table.actions"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {/* <Button
              data-testid={`packaging-kit-view-${row.original.kitCode}`}
              type="button"
              variant="link"
              className="px-0"
              onClick={() => onViewChildren(row.original)}
            >
              <BoxesIcon data-icon="inline-start" />
              {t("pages.packagingKit.actions.viewChildren")}
            </Button> */}
            <Button
              data-testid={`packaging-kit-edit-${row.original.kitCode}`}
              type="button"
              variant="link"
              className="px-0"
              onClick={() => onEdit(row.original)}
            >
              <SquarePenIcon data-icon="inline-start" />
              {t("pages.packagingKit.actions.edit")}
            </Button>
            <Button
              data-testid={`packaging-kit-delete-${row.original.kitCode}`}
              type="button"
              variant="link"
              className="px-0 text-destructive"
              onClick={() => onDelete(row.original)}
            >
              <TrashIcon data-icon="inline-start" />
              {t("pages.packagingKit.actions.delete")}
            </Button>
          </div>
        ),
      },
    ],
    [allSelected, onDelete, onEdit, onToggleAll, onToggleOne, selectedIds, t],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => String(row.id)}
      getRowCanExpand={(row) => row.original.children.length > 0}
      loading={loading}
      loadingLabel={t("pages.packagingKit.states.loading")}
      emptyLabel={t("pages.packagingKit.states.empty")}
      renderExpandedRow={({ row }) => (
        <div
          className="overflow-hidden rounded-md border bg-background"
          data-testid={`packaging-kit-children-${row.original.kitCode}`}
        >
          <div
            className="max-w-full overflow-x-auto"
            data-testid={`packaging-kit-children-scroll-${row.original.kitCode}`}
          >
            <table className="w-max min-w-full text-sm">
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
                {row.original.children.map((child) => (
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
        </div>
      )}
      rowNumber={{
        header: t("pages.packagingKit.table.index"),
        startIndex: (pageIndex - 1) * pageSize + 1,
        columnIndex: 1,
      }}
    />
  );
}
