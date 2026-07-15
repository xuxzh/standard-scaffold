import { RotateCcwIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  packagingTypeDefaultFilters,
  type PackagingTypeFilters,
} from "@/features/mes/packaging/packaging-type/packaging-contract";

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

  const recyclableOptions = useMemo(
    () => [
      {
        value: "true",
        label: t("pages.packagingType.filters.options.true"),
      },
      {
        value: "false",
        label: t("pages.packagingType.filters.options.false"),
      },
    ],
    [t],
  );

  return (
    <form
      data-testid="packaging-type-filter-form"
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
            setValues((current) => ({
              ...current,
              typeCode: event.target.value,
            }))
          }
          placeholder={t("pages.packagingType.filters.typeCodePlaceholder")}
        />
      </div>
      <div>
        <Input
          aria-label={t("pages.packagingType.filters.typeName")}
          value={values.typeName}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              typeName: event.target.value,
            }))
          }
          placeholder={t("pages.packagingType.filters.typeNamePlaceholder")}
        />
      </div>
      <div>
        <Combobox
          options={recyclableOptions}
          value={
            values.isRecyclable === undefined
              ? ""
              : values.isRecyclable
                ? "true"
                : "false"
          }
          onValueChange={(value) =>
            setValues((current) => ({
              ...current,
              // 不传值（空字符串）=> undefined => 搜索全部
              isRecyclable:
                value === ""
                  ? undefined
                  : (value === "true") as PackagingTypeFilters["isRecyclable"],
            }))
          }
          id="packaging-type-filter-is-recyclable"
          data-testid="packaging-type-filter-is-recyclable"
          aria-label={t("pages.packagingType.filters.isRecyclable")}
          placeholder={t("pages.packagingType.filters.isRecyclablePlaceholder")}
          showSearch={false}
          className="w-full"
        />
      </div>
      <Button type="submit">
        <SearchIcon data-icon="inline-start" />
        {t("pages.packagingType.actions.search")}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          console.log("FilterForm onReset clicked", { currentValues: values, defaultFilters: packagingTypeDefaultFilters });
          setValues(packagingTypeDefaultFilters);
          onReset(packagingTypeDefaultFilters);
        }}
      >
        <RotateCcwIcon data-icon="inline-start" />
        {t("pages.packagingType.actions.reset")}
      </Button>
    </form>
  );
}
