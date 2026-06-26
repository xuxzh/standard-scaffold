import { RotateCcwIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        <Select
          value={values.isRecyclable}
          onValueChange={(value) =>
            setValues((current) => ({
              ...current,
              isRecyclable: value as PackagingTypeFilters["isRecyclable"],
            }))
          }
        >
          <SelectTrigger
            aria-label={t("pages.packagingType.filters.isRecyclable")}
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">
                {t("pages.packagingType.filters.options.all")}
              </SelectItem>
              <SelectItem value="true">
                {t("pages.packagingType.filters.options.true")}
              </SelectItem>
              <SelectItem value="false">
                {t("pages.packagingType.filters.options.false")}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
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
