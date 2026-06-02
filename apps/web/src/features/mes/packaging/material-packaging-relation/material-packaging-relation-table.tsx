import { SquarePenIcon, TrashIcon } from "lucide-react";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import type { MaterialPackagingRelationTableRow } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";

type MaterialPackagingRelationTableProps = {
  data: MaterialPackagingRelationTableRow[];
  loading?: boolean;
  pageIndex: number;
  pageSize: number;
  selectedRelationIds: number[];
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (relationId: number, checked: boolean) => void;
  onEdit: (row: MaterialPackagingRelationTableRow) => void;
  onDelete: (row: MaterialPackagingRelationTableRow) => void;
};

export function MaterialPackagingRelationTable({
  data,
  loading = false,
  pageIndex,
  pageSize,
  selectedRelationIds,
  onToggleAll,
  onToggleOne,
  onEdit,
  onDelete,
}: MaterialPackagingRelationTableProps) {
  const { t } = useTranslation("common");

  const uniqueRelationIds = useMemo(
    () => [...new Set(data.map((row) => row.relationId))],
    [data],
  );

  const allSelected =
    uniqueRelationIds.length > 0 &&
    uniqueRelationIds.every((id) => selectedRelationIds.includes(id));

  const columns = useMemo<ColumnDef<MaterialPackagingRelationTableRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            aria-label={t("pages.materialPackagingRelation.table.selectAll")}
            type="checkbox"
            checked={allSelected}
            onChange={(event) => onToggleAll(event.target.checked)}
          />
        ),
        cell: ({ row }) => (
          <input
            aria-label={t("pages.materialPackagingRelation.table.selectOne", {
              name: row.original.record.materialCode,
            })}
            data-testid={`material-packaging-relation-select-${row.original.relationId}`}
            type="checkbox"
            checked={selectedRelationIds.includes(row.original.relationId)}
            onChange={(event) =>
              onToggleOne(row.original.relationId, event.target.checked)
            }
          />
        ),
      },
      {
        accessorKey: "record.materialCode",
        header: t("pages.materialPackagingRelation.table.materialCode"),
        cell: ({ row }) => row.original.record.materialCode,
      },
      {
        accessorKey: "record.materialName",
        header: t("pages.materialPackagingRelation.table.materialName"),
        cell: ({ row }) => row.original.record.materialName,
      },
      {
        accessorKey: "record.packagingRuleCode",
        header: t("pages.materialPackagingRelation.table.packagingRuleCode"),
        cell: ({ row }) => row.original.record.packagingRuleCode,
      },
      {
        accessorKey: "record.packagingRuleName",
        header: t("pages.materialPackagingRelation.table.packagingRuleName"),
        cell: ({ row }) => row.original.record.packagingRuleName,
      },
      {
        id: "levelSequence",
        header: t("pages.materialPackagingRelation.table.levelSequence"),
        cell: ({ row }) =>
          row.original.detail?.levelSequence ?? "-",
      },
      {
        id: "packagingLevelCode",
        header: t("pages.materialPackagingRelation.table.packagingLevelCode"),
        cell: ({ row }) => row.original.detail?.packagingLevelCode ?? "-",
      },
      {
        id: "packagingLevelName",
        header: t("pages.materialPackagingRelation.table.packagingLevelName"),
        cell: ({ row }) => row.original.detail?.packagingLevelName ?? "-",
      },
      {
        id: "specCode",
        header: t("pages.materialPackagingRelation.table.specCode"),
        cell: ({ row }) => row.original.detail?.specCode ?? "-",
      },
      {
        id: "specName",
        header: t("pages.materialPackagingRelation.table.specName"),
        cell: ({ row }) => row.original.detail?.specName ?? "-",
      },
      {
        id: "quantity",
        header: t("pages.materialPackagingRelation.table.quantity"),
        cell: ({ row }) =>
          row.original.detail ? String(row.original.detail.quantity) : "-",
      },
      {
        id: "unit",
        header: t("pages.materialPackagingRelation.table.unit"),
        cell: ({ row }) => row.original.detail?.unit ?? "-",
      },
      {
        id: "boxLabelPrintTemplate",
        header: t(
          "pages.materialPackagingRelation.table.boxLabelPrintTemplate",
        ),
        cell: ({ row }) =>
          row.original.detail?.boxLabelPrintTemplate || "-",
      },
      {
        id: "packingListPrintTemplate",
        header: t(
          "pages.materialPackagingRelation.table.packingListPrintTemplate",
        ),
        cell: ({ row }) =>
          row.original.detail?.packingListPrintTemplate || "-",
      },
      {
        accessorKey: "record.remark",
        header: t("pages.materialPackagingRelation.table.remark"),
        cell: ({ row }) => row.original.record.remark || "-",
      },
      {
        id: "packagingTypeName",
        header: t("pages.materialPackagingRelation.table.packagingTypeName"),
        cell: ({ row }) =>
          row.original.detail?.packagingTypeName ?? "-",
      },
      {
        id: "actions",
        header: t("pages.materialPackagingRelation.table.actions"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              data-testid={`material-packaging-relation-edit-${row.original.relationId}`}
              type="button"
              variant="link"
              className="px-0"
              onClick={() => onEdit(row.original)}
            >
              <SquarePenIcon data-icon="inline-start" />
              {t("pages.materialPackagingRelation.actions.edit")}
            </Button>
            <Button
              data-testid={`material-packaging-relation-delete-${row.original.relationId}`}
              type="button"
              variant="link"
              className="px-0 text-destructive"
              onClick={() => onDelete(row.original)}
            >
              <TrashIcon data-icon="inline-start" />
              {t("pages.materialPackagingRelation.actions.delete")}
            </Button>
          </div>
        ),
      },
    ],
    [
      allSelected,
      onDelete,
      onEdit,
      onToggleAll,
      onToggleOne,
      selectedRelationIds,
      t,
    ],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.rowId}
      loading={loading}
      loadingLabel={t("pages.materialPackagingRelation.states.loading")}
      emptyLabel={t("pages.materialPackagingRelation.states.empty")}
      rowNumber={{
        header: t("pages.materialPackagingRelation.table.index"),
        startIndex: (pageIndex - 1) * pageSize + 1,
        columnIndex: 1,
      }}
    />
  );
}
