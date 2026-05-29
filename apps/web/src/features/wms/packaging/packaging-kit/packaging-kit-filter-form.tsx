import { RotateCcwIcon, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  packagingKitDefaultFilters,
  type PackagingKitFilters,
} from "@/features/wms/packaging/packaging-kit/packaging-kit-contract";

type PackagingKitFilterFormProps = {
  defaultValues: PackagingKitFilters;
  onSubmit: (values: PackagingKitFilters) => void;
  onReset: (values: PackagingKitFilters) => void;
};

export function PackagingKitFilterForm({
  defaultValues,
  onSubmit,
  onReset,
}: PackagingKitFilterFormProps) {
  const { t } = useTranslation("common");
  const [values, setValues] = useState(defaultValues);

  useEffect(() => {
    setValues(defaultValues);
  }, [defaultValues]);

  return (
    <form
      className="grid gap-4 rounded-md border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
      data-testid="packaging-kit-filter-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <Input
        aria-label={t("pages.packagingKit.filters.kitCode")}
        placeholder={t("pages.packagingKit.filters.kitCodePlaceholder")}
        value={values.kitCode}
        onChange={(event) => {
          setValues((current) => ({ ...current, kitCode: event.target.value }));
        }}
      />
      <Input
        aria-label={t("pages.packagingKit.filters.kitName")}
        placeholder={t("pages.packagingKit.filters.kitNamePlaceholder")}
        value={values.kitName}
        onChange={(event) => {
          setValues((current) => ({ ...current, kitName: event.target.value }));
        }}
      />
      <Button type="submit">
        <SearchIcon data-icon="inline-start" />
        {t("pages.packagingKit.actions.search")}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setValues(packagingKitDefaultFilters);
          onReset(packagingKitDefaultFilters);
        }}
      >
        <RotateCcwIcon data-icon="inline-start" />
        {t("pages.packagingKit.actions.reset")}
      </Button>
    </form>
  );
}