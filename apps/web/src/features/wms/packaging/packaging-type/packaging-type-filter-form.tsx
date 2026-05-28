import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  packagingTypeDefaultFilters,
  type PackagingTypeFilters,
} from "@/features/wms/packaging/packaging-type/packaging-contract";

type PackagingTypeFilterFormProps = {
  defaultValues: PackagingTypeFilters;
  onSubmit: (values: PackagingTypeFilters) => void;
  onReset: (values: PackagingTypeFilters) => void;
};

export function PackagingTypeFilterForm({
  defaultValues,
  onSubmit,
  onReset,
}: PackagingTypeFilterFormProps) {
  const [values, setValues] = useState(defaultValues);
  const { t } = useTranslation("common");

  return (
    <form
      className="grid gap-4 rounded-md border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_auto_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div>
        <Input
          aria-label={t("pages.packagingType.filters.typeCode")}
          value={values.typeCode}
          onChange={(event) =>
            setValues((current) => ({ ...current, typeCode: event.target.value }))
          }
          placeholder={t("pages.packagingType.filters.typeCodePlaceholder")}
        />
      </div>
      <div>
        <Input
          aria-label={t("pages.packagingType.filters.typeName")}
          value={values.typeName}
          onChange={(event) =>
            setValues((current) => ({ ...current, typeName: event.target.value }))
          }
          placeholder={t("pages.packagingType.filters.typeNamePlaceholder")}
        />
      </div>
      <div>
        <select
          aria-label={t("pages.packagingType.filters.isRecyclable")}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          value={values.isRecyclable}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              isRecyclable: event.target.value as PackagingTypeFilters["isRecyclable"],
            }))
          }
        >
          <option value="all">{t("pages.packagingType.filters.options.all")}</option>
          <option value="true">{t("pages.packagingType.filters.options.true")}</option>
          <option value="false">{t("pages.packagingType.filters.options.false")}</option>
        </select>
      </div>
      <Button type="submit">{t("pages.packagingType.actions.search")}</Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setValues(packagingTypeDefaultFilters);
          onReset(packagingTypeDefaultFilters);
        }}
      >
        {t("pages.packagingType.actions.reset")}
      </Button>
    </form>
  );
}