import { SquarePenIcon, TrashIcon } from "lucide-react";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { PackagingSpecRecord } from "@/features/mes/packaging/packaging-spec/packaging-spec-contract";
import { cn } from "@/lib/utils";

type PackagingSpecTableProps = {
  data: PackagingSpecRecord[];
  loading?: boolean;
  pageIndex: number;
  pageSize: number;
  selectedIds: number[];
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: number, checked: boolean) => void;
  onEdit: (record: PackagingSpecRecord) => void;
  onDelete: (record: PackagingSpecRecord) => void;
};

const baseHeaderClassName = "px-3 py-2 align-top";
const cellClassName = "px-3 py-2";
const longHeaderClassName = "min-w-28";
const headerLabelClassName =
  "overflow-hidden text-left leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]";

function renderHeader(label: string) {
  return <span className={headerLabelClassName}>{label}</span>;
}

export function PackagingSpecTable({
  data,
  loading = false,
  pageIndex,
  pageSize,
  selectedIds,
  onToggleAll,
  onToggleOne,
  onEdit,
  onDelete,
}: PackagingSpecTableProps) {
  const { t } = useTranslation("common");
  const allSelected =
    data.length > 0 && data.every((row) => selectedIds.includes(row.id));
  const defaultMeta = useMemo(
    () => ({
      headerClassName: baseHeaderClassName,
      cellClassName,
    }),
    [],
  );
  const longHeaderMeta = useMemo(
    () => ({
      headerClassName: cn(baseHeaderClassName, longHeaderClassName),
      cellClassName,
    }),
    [],
  );
  const columns = useMemo<ColumnDef<PackagingSpecRecord>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            aria-label={t("pages.packagingSpec.table.selectAll")}
            type="checkbox"
            checked={allSelected}
            onChange={(event) => onToggleAll(event.target.checked)}
          />
        ),
        cell: ({ row }) => (
          <input
            aria-label={`${t("pages.packagingSpec.table.selectOne", { name: row.original.specName })}`}
            data-testid={`packaging-spec-select-${row.original.specCode}`}
            type="checkbox"
            checked={selectedIds.includes(row.original.id)}
            onChange={(event) =>
              onToggleOne(row.original.id, event.target.checked)
            }
          />
        ),
        meta: defaultMeta,
      },
      {
        accessorKey: "specCode",
        header: () => renderHeader(t("pages.packagingSpec.table.specCode")),
        meta: defaultMeta,
      },
      {
        accessorKey: "specName",
        header: () => renderHeader(t("pages.packagingSpec.table.specName")),
        meta: defaultMeta,
      },
      {
        accessorKey: "packagingTypeCode",
        header: () =>
          renderHeader(t("pages.packagingSpec.table.packagingTypeCode")),
        meta: longHeaderMeta,
      },
      {
        accessorKey: "packagingTypeName",
        header: () =>
          renderHeader(t("pages.packagingSpec.table.packagingTypeName")),
        meta: longHeaderMeta,
      },
      {
        accessorKey: "barcodeRuleCode",
        header: () =>
          renderHeader(t("pages.packagingSpec.table.barcodeRuleCode")),
        meta: longHeaderMeta,
      },
      {
        accessorKey: "barcodeRuleName",
        header: () =>
          renderHeader(t("pages.packagingSpec.table.barcodeRuleName")),
        meta: longHeaderMeta,
      },
      {
        accessorKey: "length",
        header: () => renderHeader(t("pages.packagingSpec.table.length")),
        meta: defaultMeta,
      },
      {
        accessorKey: "width",
        header: () => renderHeader(t("pages.packagingSpec.table.width")),
        meta: defaultMeta,
      },
      {
        accessorKey: "height",
        header: () => renderHeader(t("pages.packagingSpec.table.height")),
        meta: defaultMeta,
      },
      {
        accessorKey: "volume",
        header: () => renderHeader(t("pages.packagingSpec.table.volume")),
        meta: defaultMeta,
      },
      {
        accessorKey: "maxWeight",
        header: () => renderHeader(t("pages.packagingSpec.table.maxWeight")),
        meta: defaultMeta,
      },
      {
        accessorKey: "grossWeight",
        header: () => renderHeader(t("pages.packagingSpec.table.grossWeight")),
        meta: defaultMeta,
      },
      {
        accessorKey: "tareWeight",
        header: () => renderHeader(t("pages.packagingSpec.table.tareWeight")),
        meta: defaultMeta,
      },
      {
        accessorKey: "standardCapacity",
        header: () =>
          renderHeader(t("pages.packagingSpec.table.standardCapacity")),
        meta: defaultMeta,
      },
      {
        accessorKey: "unit",
        header: () => renderHeader(t("pages.packagingSpec.table.unit")),
        meta: defaultMeta,
      },
      {
        accessorKey: "stackLimit",
        header: () => renderHeader(t("pages.packagingSpec.table.stackLimit")),
        meta: defaultMeta,
      },
      {
        accessorKey: "isEnabled",
        header: () => renderHeader(t("pages.packagingSpec.table.isEnabled")),
        cell: ({ row }) =>
          row.original.isEnabled
            ? t("pages.packagingSpec.table.isEnabledTrue")
            : t("pages.packagingSpec.table.isEnabledFalse"),
        meta: defaultMeta,
      },
      {
        id: "actions",
        header: () => renderHeader(t("pages.packagingSpec.table.actions")),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              data-testid={`packaging-spec-edit-${row.original.specCode}`}
              type="button"
              variant="link"
              className="px-0"
              onClick={() => onEdit(row.original)}
            >
              <SquarePenIcon data-icon="inline-start" />
              {t("pages.packagingSpec.actions.edit")}
            </Button>
            <Button
              data-testid={`packaging-spec-delete-${row.original.specCode}`}
              type="button"
              variant="link"
              className="px-0 text-destructive"
              onClick={() => onDelete(row.original)}
            >
              <TrashIcon data-icon="inline-start" />
              {t("pages.packagingSpec.actions.delete")}
            </Button>
          </div>
        ),
        meta: defaultMeta,
      },
    ],
    [
      allSelected,
      defaultMeta,
      longHeaderMeta,
      onDelete,
      onEdit,
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
      loading={loading}
      loadingLabel={t("pages.packagingSpec.states.loading")}
      emptyLabel={t("pages.packagingSpec.states.empty")}
      rowNumber={{
        header: renderHeader(t("pages.packagingSpec.table.index")),
        startIndex: (pageIndex - 1) * pageSize + 1,
        columnIndex: 1,
        headerClassName: baseHeaderClassName,
        cellClassName,
      }}
      className="overflow-x-auto"
    />
  );
}
