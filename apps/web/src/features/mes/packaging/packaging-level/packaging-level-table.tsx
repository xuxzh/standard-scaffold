import { SquarePenIcon, TrashIcon } from "lucide-react";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import type { PackagingLevelRecord } from "@/features/mes/packaging/packaging-level/packaging-level-contract";

type PackagingLevelTableProps = {
  data: PackagingLevelRecord[];
  loading?: boolean;
  pageIndex: number;
  pageSize: number;
  selectedIds: number[];
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: number, checked: boolean) => void;
  onEdit: (record: PackagingLevelRecord) => void;
  onDelete: (record: PackagingLevelRecord) => void;
};

export function PackagingLevelTable({
  data,
  loading = false,
  pageIndex,
  pageSize,
  selectedIds,
  onToggleAll,
  onToggleOne,
  onEdit,
  onDelete,
}: PackagingLevelTableProps) {
  const { t } = useTranslation("common");
  const allSelected = data.length > 0 && data.every((row) => selectedIds.includes(row.id));

  const columns = useMemo<ColumnDef<PackagingLevelRecord>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            aria-label={t("pages.packagingLevel.table.selectAll")}
            type="checkbox"
            checked={allSelected}
            onChange={(event) => onToggleAll(event.target.checked)}
          />
        ),
        cell: ({ row }) => (
          <input
            aria-label={t("pages.packagingLevel.table.selectOne", {
              name: row.original.levelCode,
            })}
            data-testid={`packaging-level-select-${row.original.levelCode}`}
            type="checkbox"
            checked={selectedIds.includes(row.original.id)}
            onChange={(event) => onToggleOne(row.original.id, event.target.checked)}
          />
        ),
      },
      {
        accessorKey: "levelCode",
        header: t("pages.packagingLevel.table.levelCode"),
      },
      {
        accessorKey: "levelSequence",
        header: t("pages.packagingLevel.table.levelSequence"),
      },
      {
        accessorKey: "levelName",
        header: t("pages.packagingLevel.table.levelName"),
      },
      {
        accessorKey: "parentLevelCode",
        header: t("pages.packagingLevel.table.parentLevelCode"),
        cell: ({ row }) => row.original.parentLevelCode || "-",
      },
      {
        accessorKey: "parentLevelName",
        header: t("pages.packagingLevel.table.parentLevelName"),
        cell: ({ row }) => row.original.parentLevelName || "-",
      },
      {
        accessorKey: "description",
        header: t("pages.packagingLevel.table.description"),
      },
      {
        id: "actions",
        header: t("pages.packagingLevel.table.actions"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              data-testid={`packaging-level-edit-${row.original.levelCode}`}
              type="button"
              variant="link"
              className="px-0"
              onClick={() => onEdit(row.original)}
            >
              <SquarePenIcon data-icon="inline-start" />
              {t("pages.packagingLevel.actions.edit")}
            </Button>
            <Button
              data-testid={`packaging-level-delete-${row.original.levelCode}`}
              type="button"
              variant="link"
              className="px-0 text-destructive"
              onClick={() => onDelete(row.original)}
            >
              <TrashIcon data-icon="inline-start" />
              {t("pages.packagingLevel.actions.delete")}
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
      loadingLabel={t("pages.packagingLevel.states.loading")}
      emptyLabel={t("pages.packagingLevel.states.empty")}
      rowNumber={{
        header: t("pages.packagingLevel.table.index"),
        startIndex: (pageIndex - 1) * pageSize + 1,
        columnIndex: 1,
      }}
    />
  );
}
