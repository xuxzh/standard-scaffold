import { Settings2Icon, SquarePenIcon, TrashIcon } from "lucide-react";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import type { PackagingRuleRecord } from "@/features/mes/packaging/packaging-rule/packaging-rule-contract";

type PackagingRuleTableProps = {
  data: PackagingRuleRecord[];
  loading?: boolean;
  pageIndex: number;
  pageSize: number;
  selectedIds: number[];
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: number, checked: boolean) => void;
  onOpenConfig: (record: PackagingRuleRecord) => void;
  onEdit: (record: PackagingRuleRecord) => void;
  onDelete: (record: PackagingRuleRecord) => void;
};

export function PackagingRuleTable({
  data,
  loading = false,
  pageIndex,
  pageSize,
  selectedIds,
  onToggleAll,
  onToggleOne,
  onOpenConfig,
  onEdit,
  onDelete,
}: PackagingRuleTableProps) {
  const { t } = useTranslation("common");
  const allSelected =
    data.length > 0 && data.every((row) => selectedIds.includes(row.id));

  const columns = useMemo<ColumnDef<PackagingRuleRecord>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            aria-label={t("pages.packagingRule.table.selectAll")}
            type="checkbox"
            checked={allSelected}
            onChange={(event) => onToggleAll(event.target.checked)}
          />
        ),
        cell: ({ row }) => (
          <input
            aria-label={t("pages.packagingRule.table.selectOne", {
              name: row.original.ruleCode,
            })}
            data-testid={`packaging-rule-select-${row.original.ruleCode}`}
            type="checkbox"
            checked={selectedIds.includes(row.original.id)}
            onChange={(event) =>
              onToggleOne(row.original.id, event.target.checked)
            }
          />
        ),
      },
      {
        accessorKey: "ruleCode",
        header: t("pages.packagingRule.table.ruleCode"),
      },
      {
        accessorKey: "ruleName",
        header: t("pages.packagingRule.table.ruleName"),
      },
      {
        id: "isDefault",
        header: t("pages.packagingRule.table.isDefault"),
        cell: ({ row }) =>
          row.original.isDefault
            ? t("pages.packagingRule.table.isDefaultTrue")
            : t("pages.packagingRule.table.isDefaultFalse"),
      },
      {
        id: "isEnabled",
        header: t("pages.packagingRule.table.isEnabled"),
        cell: ({ row }) =>
          row.original.isEnabled
            ? t("pages.packagingRule.table.isEnabledTrue")
            : t("pages.packagingRule.table.isEnabledFalse"),
      },
      {
        id: "detailCount",
        header: t("pages.packagingRule.table.detailCount"),
        cell: ({ row }) => row.original.details.length,
      },
      {
        id: "actions",
        header: t("pages.packagingRule.table.actions"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              data-testid={`packaging-rule-config-${row.original.ruleCode}`}
              type="button"
              variant="link"
              className="px-0"
              onClick={() => onOpenConfig(row.original)}
            >
              <Settings2Icon data-icon="inline-start" />
              {t("pages.packagingRule.actions.configure")}
            </Button>
            <Button
              data-testid={`packaging-rule-edit-${row.original.ruleCode}`}
              type="button"
              variant="link"
              className="px-0"
              onClick={() => onEdit(row.original)}
            >
              <SquarePenIcon data-icon="inline-start" />
              {t("pages.packagingRule.actions.edit")}
            </Button>
            <Button
              data-testid={`packaging-rule-delete-${row.original.ruleCode}`}
              type="button"
              variant="link"
              className="px-0 text-destructive"
              onClick={() => onDelete(row.original)}
            >
              <TrashIcon data-icon="inline-start" />
              {t("pages.packagingRule.actions.delete")}
            </Button>
          </div>
        ),
      },
    ],
    [
      allSelected,
      onDelete,
      onEdit,
      onOpenConfig,
      onToggleAll,
      onToggleOne,
      selectedIds,
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
      loadingLabel={t("pages.packagingRule.states.loading")}
      emptyLabel={t("pages.packagingRule.states.empty")}
      renderExpandedRow={({ row }) => (
        <div
          className="overflow-hidden rounded-md border bg-background"
          data-testid={`packaging-rule-details-${row.original.ruleCode}`}
        >
          <div
            className="max-w-full overflow-x-auto"
            data-testid={`packaging-rule-details-scroll-${row.original.ruleCode}`}
          >
            <table className="w-max min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3">
                    {t("pages.packagingRule.form.detailLevelSequence")}
                  </th>
                  <th className="px-4 py-3">
                    {t("pages.packagingRule.form.detailLevelCode")}
                  </th>
                  <th className="px-4 py-3">
                    {t("pages.packagingRule.form.detailLevelName")}
                  </th>
                  <th className="px-4 py-3">
                    {t("pages.packagingRule.form.detailSpecCode")}
                  </th>
                  <th className="px-4 py-3">
                    {t("pages.packagingRule.form.detailSpecName")}
                  </th>
                  <th className="px-4 py-3">
                    {t("pages.packagingRule.form.detailStandardQuantity")}
                  </th>
                  <th className="px-4 py-3">
                    {t("pages.packagingRule.form.detailMaxQuantity")}
                  </th>
                  <th className="px-4 py-3">
                    {t("pages.packagingRule.form.detailPackagingMethod")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {row.original.details.map((detail, index) => (
                  <tr
                    key={
                      detail.id ??
                      `${row.original.ruleCode}-${detail.specCode}-${index}`
                    }
                    className="border-t"
                  >
                    <td className="px-4 py-3">{detail.levelSequence ?? "-"}</td>
                    <td className="px-4 py-3">{detail.packagingLevelCode}</td>
                    <td className="px-4 py-3">
                      {detail.packagingLevelName || "-"}
                    </td>
                    <td className="px-4 py-3">{detail.specCode}</td>
                    <td className="px-4 py-3">{detail.specName || "-"}</td>
                    <td className="px-4 py-3">{detail.standardQuantity}</td>
                    <td className="px-4 py-3">{detail.maxQuantity}</td>
                    <td className="px-4 py-3">
                      {t(
                        `pages.packagingRule.form.packagingMethodOptions.${detail.packagingMethod}`,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      rowNumber={{
        header: t("pages.packagingRule.table.index"),
        startIndex: (pageIndex - 1) * pageSize + 1,
        columnIndex: 1,
      }}
    />
  );
}
