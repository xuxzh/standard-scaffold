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
  selectedIds: number[];
  onToggleOne: (id: number, checked: boolean) => void;
  onEdit: (record: PackagingSpecRecord) => void;
  onDelete: (record: PackagingSpecRecord) => void;
};

const baseHeaderClassName = "bg-muted/40 px-3 py-2 align-top";
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
  selectedIds,
  onToggleOne,
  onEdit,
  onDelete,
}: PackagingSpecTableProps) {
  const { t } = useTranslation("common");
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
        header: () => renderHeader(t("pages.packagingSpec.table.select")),
        cell: ({ row }) => (
          <input
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
        accessorKey: "packagingLevelCode",
        header: () =>
          renderHeader(t("pages.packagingSpec.table.packagingLevelCode")),
        meta: longHeaderMeta,
      },
      {
        accessorKey: "packagingLevelName",
        header: () =>
          renderHeader(t("pages.packagingSpec.table.packagingLevelName")),
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
            ? t("pages.packagingSpec.filters.options.true")
            : t("pages.packagingSpec.filters.options.false"),
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
      defaultMeta,
      longHeaderMeta,
      onDelete,
      onEdit,
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
      className="overflow-x-auto"
    />
  );
}
