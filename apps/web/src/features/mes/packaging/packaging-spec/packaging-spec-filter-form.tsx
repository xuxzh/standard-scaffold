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
import { PackagingTypeSelect } from "@/features/mes/packaging/packaging-type/packaging-type-select";
import type { PackagingTypeOptionDto } from "@/features/mes/packaging/packaging-type/packaging-contract";

type PackagingSpecFilterFormProps = {
  defaultValues: PackagingSpecFilters;
  typeOptions: PackagingTypeOptionDto[];
  typeOptionsLoading: boolean;
  onSubmit: (values: PackagingSpecFilters) => void;
  onReset: (values: PackagingSpecFilters) => void;
};

export function PackagingSpecFilterForm({
  defaultValues,
  typeOptions,
  typeOptionsLoading,
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
      <PackagingTypeSelect
        options={typeOptions}
        value={values.packagingTypeCode ?? ""}
        disabled={typeOptionsLoading}
        aria-label={t("pages.packagingSpec.filters.packagingTypeCode")}
        placeholder={t(
          "pages.packagingSpec.filters.packagingTypeCodePlaceholder",
        )}
        onValueChange={(value) =>
          setValues((current) => ({
            ...current,
            // Empty value clears the filter so the search returns all rows.
            packagingTypeCode: value === "" ? undefined : value,
          }))
        }
      />
      <Select
        value={
          values.isEnabled === undefined
            ? ""
            : values.isEnabled
              ? "true"
              : "false"
        }
        onValueChange={(value) =>
          setValues((current) => ({
            ...current,
            // 不传值（空字符串）=> undefined => 搜索全部
            isEnabled:
              value === ""
                ? undefined
                : (value === "true") as PackagingSpecFilters["isEnabled"],
          }))
        }
      >
        <SelectTrigger
          aria-label={t("pages.packagingSpec.filters.isEnabled")}
          className="w-full"
        >
          <SelectValue
            placeholder={t("pages.packagingSpec.filters.isEnabledPlaceholder")}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
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
