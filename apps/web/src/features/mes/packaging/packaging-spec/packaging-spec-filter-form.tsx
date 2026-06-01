import { RotateCcwIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  packagingSpecDefaultFilters,
  type PackagingSpecFilters,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-contract";

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
      <select
        aria-label={t("pages.packagingSpec.filters.packagingTypeCode")}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        value={values.packagingTypeCode}
        onChange={(event) =>
          setValues((current) => ({ ...current, packagingTypeCode: event.target.value }))
        }
      >
        <option value="">{t("pages.packagingSpec.filters.options.all")}</option>
        <option value="TYPE-001">TYPE-001</option>
        <option value="TYPE-002">TYPE-002</option>
        <option value="TYPE-003">TYPE-003</option>
      </select>
      <select
        aria-label={t("pages.packagingSpec.filters.isEnabled")}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        value={values.isEnabled}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            isEnabled: event.target.value as PackagingSpecFilters["isEnabled"],
          }))
        }
      >
        <option value="all">{t("pages.packagingSpec.filters.options.all")}</option>
        <option value="true">{t("pages.packagingSpec.filters.options.true")}</option>
        <option value="false">{t("pages.packagingSpec.filters.options.false")}</option>
      </select>
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