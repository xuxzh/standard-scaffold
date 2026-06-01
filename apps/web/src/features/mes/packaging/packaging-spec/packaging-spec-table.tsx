import { SquarePenIcon, TrashIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
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

const baseHeaderClassName = "px-3 py-2 align-top";
const longHeaderClassName = "min-w-28";
const headerLabelClassName =
  "overflow-hidden text-left leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]";

export function PackagingSpecTable({
  data,
  loading = false,
  selectedIds,
  onToggleOne,
  onEdit,
  onDelete,
}: PackagingSpecTableProps) {
  const { t } = useTranslation("common");
  const headers = [
    { key: "select", label: t("pages.packagingSpec.table.select") },
    { key: "specCode", label: t("pages.packagingSpec.table.specCode") },
    { key: "specName", label: t("pages.packagingSpec.table.specName") },
    {
      key: "packagingTypeCode",
      label: t("pages.packagingSpec.table.packagingTypeCode"),
      className: longHeaderClassName,
    },
    {
      key: "packagingTypeName",
      label: t("pages.packagingSpec.table.packagingTypeName"),
      className: longHeaderClassName,
    },
    {
      key: "packagingLevelCode",
      label: t("pages.packagingSpec.table.packagingLevelCode"),
      className: longHeaderClassName,
    },
    {
      key: "packagingLevelName",
      label: t("pages.packagingSpec.table.packagingLevelName"),
      className: longHeaderClassName,
    },
    {
      key: "barcodeRuleCode",
      label: t("pages.packagingSpec.table.barcodeRuleCode"),
      className: longHeaderClassName,
    },
    {
      key: "barcodeRuleName",
      label: t("pages.packagingSpec.table.barcodeRuleName"),
      className: longHeaderClassName,
    },
    { key: "length", label: t("pages.packagingSpec.table.length") },
    { key: "width", label: t("pages.packagingSpec.table.width") },
    { key: "height", label: t("pages.packagingSpec.table.height") },
    { key: "volume", label: t("pages.packagingSpec.table.volume") },
    { key: "maxWeight", label: t("pages.packagingSpec.table.maxWeight") },
    {
      key: "grossWeight",
      label: t("pages.packagingSpec.table.grossWeight"),
    },
    { key: "tareWeight", label: t("pages.packagingSpec.table.tareWeight") },
    {
      key: "standardCapacity",
      label: t("pages.packagingSpec.table.standardCapacity"),
    },
    { key: "unit", label: t("pages.packagingSpec.table.unit") },
    { key: "stackLimit", label: t("pages.packagingSpec.table.stackLimit") },
    { key: "isEnabled", label: t("pages.packagingSpec.table.isEnabled") },
    { key: "actions", label: t("pages.packagingSpec.table.actions") },
  ];

  if (loading) {
    return <div>{t("pages.packagingSpec.states.loading")}</div>;
  }

  if (!data.length) {
    return <div>{t("pages.packagingSpec.states.empty")}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-full w-max text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            {headers.map((header) => (
              <th
                key={header.key}
                className={cn(baseHeaderClassName, header.className)}
              >
                <span className={headerLabelClassName}>{header.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((record) => (
            <tr key={record.id} className="border-b">
              <td className="px-3 py-2">
                <input
                  data-testid={`packaging-spec-select-${record.specCode}`}
                  type="checkbox"
                  checked={selectedIds.includes(record.id)}
                  onChange={(event) =>
                    onToggleOne(record.id, event.target.checked)
                  }
                />
              </td>
              <td className="px-3 py-2">{record.specCode}</td>
              <td className="px-3 py-2">{record.specName}</td>
              <td className="px-3 py-2">{record.packagingTypeCode}</td>
              <td className="px-3 py-2">{record.packagingTypeName}</td>
              <td className="px-3 py-2">{record.packagingLevelCode}</td>
              <td className="px-3 py-2">{record.packagingLevelName}</td>
              <td className="px-3 py-2">{record.barcodeRuleCode}</td>
              <td className="px-3 py-2">{record.barcodeRuleName}</td>
              <td className="px-3 py-2">{record.length}</td>
              <td className="px-3 py-2">{record.width}</td>
              <td className="px-3 py-2">{record.height}</td>
              <td className="px-3 py-2">{record.volume}</td>
              <td className="px-3 py-2">{record.maxWeight}</td>
              <td className="px-3 py-2">{record.grossWeight}</td>
              <td className="px-3 py-2">{record.tareWeight}</td>
              <td className="px-3 py-2">{record.standardCapacity}</td>
              <td className="px-3 py-2">{record.unit}</td>
              <td className="px-3 py-2">{record.stackLimit}</td>
              <td className="px-3 py-2">
                {record.isEnabled
                  ? t("pages.packagingSpec.filters.options.true")
                  : t("pages.packagingSpec.filters.options.false")}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Button
                    data-testid={`packaging-spec-edit-${record.specCode}`}
                    type="button"
                    variant="link"
                    className="px-0"
                    onClick={() => onEdit(record)}
                  >
                    <SquarePenIcon data-icon="inline-start" />
                    {t("pages.packagingSpec.actions.edit")}
                  </Button>
                  <Button
                    data-testid={`packaging-spec-delete-${record.specCode}`}
                    type="button"
                    variant="link"
                    className="px-0 text-destructive"
                    onClick={() => onDelete(record)}
                  >
                    <TrashIcon data-icon="inline-start" />
                    {t("pages.packagingSpec.actions.delete")}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
