import { SquarePenIcon, TrashIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { PackagingSpecRecord } from "@/features/mes/packaging/packaging-spec/packaging-spec-contract";

type PackagingSpecTableProps = {
  data: PackagingSpecRecord[];
  loading?: boolean;
  selectedIds: number[];
  onToggleOne: (id: number, checked: boolean) => void;
  onEdit: (record: PackagingSpecRecord) => void;
  onDelete: (record: PackagingSpecRecord) => void;
};

export function PackagingSpecTable({
  data,
  loading = false,
  selectedIds,
  onToggleOne,
  onEdit,
  onDelete,
}: PackagingSpecTableProps) {
  const { t } = useTranslation("common");

  if (loading) {
    return <div>{t("pages.packagingSpec.states.loading")}</div>;
  }

  if (!data.length) {
    return <div>{t("pages.packagingSpec.states.empty")}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.select")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.specCode")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.specName")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.packagingTypeCode")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.packagingTypeName")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.packagingLevelCode")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.packagingLevelName")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.barcodeRuleCode")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.barcodeRuleName")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.length")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.width")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.height")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.volume")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.maxWeight")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.grossWeight")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.tareWeight")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.standardCapacity")}
            </th>
            <th className="px-3 py-2">{t("pages.packagingSpec.table.unit")}</th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.stackLimit")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.isEnabled")}
            </th>
            <th className="px-3 py-2">
              {t("pages.packagingSpec.table.actions")}
            </th>
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
