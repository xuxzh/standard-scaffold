import { SquarePenIcon, TrashIcon } from "lucide-react";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import type { PackagingTypeRecord } from "@/features/mes/packaging/packaging-type/packaging-contract";

type PackagingTypeTableProps = {
  data: PackagingTypeRecord[];
  loading?: boolean;
  selectedIds: number[];
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: number, checked: boolean) => void;
  onEdit: (record: PackagingTypeRecord) => void;
  onDelete: (record: PackagingTypeRecord) => void;
};

export function PackagingTypeTable({
  data,
  loading = false,
  selectedIds,
  onToggleAll,
  onToggleOne,
  onEdit,
  onDelete,
}: PackagingTypeTableProps) {
  const { t } = useTranslation("common");
  const allSelected = data.length > 0 && data.every((row) => selectedIds.includes(row.id));

  const columns = useMemo<ColumnDef<PackagingTypeRecord>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            aria-label="全选包装类型"
            type="checkbox"
            checked={allSelected}
            onChange={(event) => onToggleAll(event.target.checked)}
          />
        ),
        cell: ({ row }) => (
          <input
            aria-label={`选择 ${row.original.typeName}`}
            data-testid={`packaging-type-select-${row.original.typeCode}`}
            type="checkbox"
            checked={selectedIds.includes(row.original.id)}
            onChange={(event) => onToggleOne(row.original.id, event.target.checked)}
          />
        ),
      },
      {
        accessorKey: "typeCode",
        header: t("pages.packagingType.table.typeCode"),
      },
      {
        accessorKey: "typeName",
        header: t("pages.packagingType.table.typeName"),
      },
      {
        accessorKey: "isRecyclable",
        header: t("pages.packagingType.table.isRecyclable"),
        cell: ({ row }) =>
          row.original.isRecyclable
            ? t("pages.packagingType.filters.options.true")
            : t("pages.packagingType.filters.options.false"),
      },
      {
        accessorKey: "description",
        header: t("pages.packagingType.table.description"),
      },
      {
        id: "actions",
        header: t("pages.packagingType.table.actions"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              data-testid={`packaging-type-edit-${row.original.typeCode}`}
              type="button"
              variant="link"
              className="px-0"
              onClick={() => onEdit(row.original)}
            >
              <SquarePenIcon data-icon="inline-start" />
              {t("pages.packagingType.actions.edit")}
            </Button>
            <Button
              data-testid={`packaging-type-delete-${row.original.typeCode}`}
              type="button"
              variant="link"
              className="px-0 text-destructive"
              onClick={() => onDelete(row.original)}
            >
              <TrashIcon data-icon="inline-start" />
              {t("pages.packagingType.actions.delete")}
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
      loading={loading}
      loadingLabel={t("pages.packagingType.states.loading")}
      emptyLabel={t("pages.packagingType.states.empty")}
    />
  );
}
