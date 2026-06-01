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
  packagingSpecDefaultFilters,
  type PackagingSpecFilters,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-contract";

const allPackagingTypeCodeValue = "__all_packaging_type_code__";

type PackagingSpecFilterFormProps = {
  defaultValues: PackagingSpecFilters;
  onSubmit: (values: PackagingSpecFilters) => void;
  onReset: (values: PackagingSpecFilters) => void;
};

export function PackagingSpecFilterForm({
  defaultValues,
  onSubmit,
  onReset,
}: PackagingSpecFilterFormProps) {
  const [values, setValues] = useState(defaultValues);
  const { t } = useTranslation("common");

  return (
    <form
      className="grid gap-4 rounded-md border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_220px_auto_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <Input
        aria-label={t("pages.packagingSpec.filters.specCode")}
        value={values.specCode}
        onChange={(event) =>
          setValues((current) => ({ ...current, specCode: event.target.value }))
        }
        placeholder={t("pages.packagingSpec.filters.specCodePlaceholder")}
      />
      <Input
        aria-label={t("pages.packagingSpec.filters.specName")}
        value={values.specName}
        onChange={(event) =>
          setValues((current) => ({ ...current, specName: event.target.value }))
        }
        placeholder={t("pages.packagingSpec.filters.specNamePlaceholder")}
      />
      <Select
        value={values.packagingTypeCode || allPackagingTypeCodeValue}
        onValueChange={(value) =>
          setValues((current) => ({
            ...current,
            packagingTypeCode: value === allPackagingTypeCodeValue ? "" : value,
          }))
        }
      >
        <SelectTrigger
          aria-label={t("pages.packagingSpec.filters.packagingTypeCode")}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={allPackagingTypeCodeValue}>
              {t("pages.packagingSpec.filters.options.all")}
            </SelectItem>
            <SelectItem value="TYPE-001">TYPE-001</SelectItem>
            <SelectItem value="TYPE-002">TYPE-002</SelectItem>
            <SelectItem value="TYPE-003">TYPE-003</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        value={values.isEnabled}
        onValueChange={(value) =>
          setValues((current) => ({
            ...current,
            isEnabled: value as PackagingSpecFilters["isEnabled"],
          }))
        }
      >
        <SelectTrigger
          aria-label={t("pages.packagingSpec.filters.isEnabled")}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">
              {t("pages.packagingSpec.filters.options.all")}
            </SelectItem>
            <SelectItem value="true">
              {t("pages.packagingSpec.filters.options.true")}
            </SelectItem>
            <SelectItem value="false">
              {t("pages.packagingSpec.filters.options.false")}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button type="submit">
        <SearchIcon data-icon="inline-start" />
        {t("pages.packagingSpec.actions.search")}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setValues(packagingSpecDefaultFilters);
          onReset(packagingSpecDefaultFilters);
        }}
      >
        <RotateCcwIcon data-icon="inline-start" />
        {t("pages.packagingSpec.actions.reset")}
      </Button>
    </form>
  );
}
