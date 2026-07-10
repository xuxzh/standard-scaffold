import { SquarePenIcon, TrashIcon } from "lucide-react";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import type { MaterialPackagingRelationRecord } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";

type MaterialPackagingRelationTableProps = {
  data: MaterialPackagingRelationRecord[];
  loading?: boolean;
  pageIndex: number;
  pageSize: number;
  selectedRelationIds: number[];
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (relationId: number, checked: boolean) => void;
  onEdit: (record: MaterialPackagingRelationRecord) => void;
  onDelete: (record: MaterialPackagingRelationRecord) => void;
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

  const allSelected =
    data.length > 0 &&
    data.every((record) => selectedRelationIds.includes(record.id));

  const columns = useMemo<ColumnDef<MaterialPackagingRelationRecord>[]>(
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
              name: row.original.materialCode,
            })}
            data-testid={`material-packaging-relation-select-${row.original.id}`}
            type="checkbox"
            checked={selectedRelationIds.includes(row.original.id)}
            onChange={(event) =>
              onToggleOne(row.original.id, event.target.checked)
            }
          />
        ),
      },
      {
        accessorKey: "materialCode",
        header: t("pages.materialPackagingRelation.table.materialCode"),
      },
      {
        accessorKey: "materialName",
        header: t("pages.materialPackagingRelation.table.materialName"),
      },
      {
        accessorKey: "packagingRuleCode",
        header: t("pages.materialPackagingRelation.table.packagingRuleCode"),
      },
      {
        accessorKey: "packagingRuleName",
        header: t("pages.materialPackagingRelation.table.packagingRuleName"),
      },
      {
        id: "detailCount",
        header: t("pages.materialPackagingRelation.table.detailCount"),
        cell: ({ row }) => row.original.details.length,
      },
      {
        accessorKey: "remark",
        header: t("pages.materialPackagingRelation.table.remark"),
        cell: ({ row }) => row.original.remark || "-",
      },
      {
        id: "actions",
        header: t("pages.materialPackagingRelation.table.actions"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              data-testid={`material-packaging-relation-edit-${row.original.id}`}
              type="button"
              variant="link"
              className="px-0"
              onClick={() => onEdit(row.original)}
            >
              <SquarePenIcon data-icon="inline-start" />
              {t("pages.materialPackagingRelation.actions.edit")}
            </Button>
            <Button
              data-testid={`material-packaging-relation-delete-${row.original.id}`}
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
      getRowId={(row) => String(row.id)}
      getRowCanExpand={(row) => row.original.details.length > 0}
      loading={loading}
      loadingLabel={t("pages.materialPackagingRelation.states.loading")}
      emptyLabel={t("pages.materialPackagingRelation.states.empty")}
      className="min-h-0 flex-1"
      renderExpandedRow={({ row }) => (
        <div
          className="overflow-hidden rounded-md border bg-background"
          data-testid={`material-packaging-relation-details-${row.original.id}`}
        >
          <div
            className="max-w-full overflow-x-auto"
            data-testid={`material-packaging-relation-details-scroll-${row.original.id}`}
          >
            <table className="w-max min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3">
                    {t("pages.materialPackagingRelation.table.levelSequence")}
                  </th>
                  <th className="px-4 py-3">
                    {t(
                      "pages.materialPackagingRelation.table.packagingLevelCode",
                    )}
                  </th>
                  <th className="px-4 py-3">
                    {t(
                      "pages.materialPackagingRelation.table.packagingLevelName",
                    )}
                  </th>
                  <th className="px-4 py-3">
                    {t("pages.materialPackagingRelation.table.specCode")}
                  </th>
                  <th className="px-4 py-3">
                    {t("pages.materialPackagingRelation.table.specName")}
                  </th>
                  <th className="px-4 py-3">
                    {t("pages.materialPackagingRelation.table.quantity")}
                  </th>
                  <th className="px-4 py-3">
                    {t("pages.materialPackagingRelation.table.unit")}
                  </th>
                  <th className="px-4 py-3">
                    {t(
                      "pages.materialPackagingRelation.table.packagingTypeName",
                    )}
                  </th>
                  <th className="px-4 py-3">
                    {t(
                      "pages.materialPackagingRelation.table.boxLabelPrintTemplate",
                    )}
                  </th>
                  <th className="px-4 py-3">
                    {t(
                      "pages.materialPackagingRelation.table.packingListPrintTemplate",
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {row.original.details.map((detail, detailIndex) => (
                  <tr
                    key={`${detail.packagingLevelCode}:${detailIndex}`}
                    className="border-t"
                  >
                    <td className="px-4 py-3">
                      {detail.levelSequence ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {detail.packagingLevelCode || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {detail.packagingLevelName || "-"}
                    </td>
                    <td className="px-4 py-3">{detail.specCode || "-"}</td>
                    <td className="px-4 py-3">{detail.specName || "-"}</td>
                    <td className="px-4 py-3">{detail.quantity}</td>
                    <td className="px-4 py-3">{detail.unit || "-"}</td>
                    <td className="px-4 py-3">
                      {detail.packagingTypeName || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {detail.boxLabelPrintTemplate || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {detail.packingListPrintTemplate || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      rowNumber={{
        header: t("pages.materialPackagingRelation.table.index"),
        startIndex: (pageIndex - 1) * pageSize + 1,
        columnIndex: 1,
      }}
    />
  );
}
