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
  packagingLevelDefaultFilters,
  type PackagingLevelFilters,
  type PackagingLevelOption,
} from "@/features/mes/packaging/packaging-level/packaging-level-contract";

type PackagingLevelFilterFormProps = {
  defaultValues: PackagingLevelFilters;
  parentOptions: PackagingLevelOption[];
  onSubmit: (values: PackagingLevelFilters) => void;
  onReset: (values: PackagingLevelFilters) => void;
};

export function PackagingLevelFilterForm({
  defaultValues,
  parentOptions,
  onSubmit,
  onReset,
}: PackagingLevelFilterFormProps) {
  const [values, setValues] = useState(defaultValues);
  const { t } = useTranslation("common");

  return (
    <form
      data-testid="packaging-level-filter-form"
      className="grid gap-4 rounded-md border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_auto_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <Input
        aria-label={t("pages.packagingLevel.filters.levelCode")}
        value={values.levelCode}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            levelCode: event.target.value,
          }))
        }
        placeholder={t("pages.packagingLevel.filters.levelCodePlaceholder")}
      />
      <Input
        aria-label={t("pages.packagingLevel.filters.levelName")}
        value={values.levelName}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            levelName: event.target.value,
          }))
        }
        placeholder={t("pages.packagingLevel.filters.levelNamePlaceholder")}
      />
      <Select
        value={values.parentLevelCode ?? ""}
        onValueChange={(value) =>
          setValues((current) => ({
            ...current,
            parentLevelCode: value === "" ? undefined : value,
          }))
        }
      >
        <SelectTrigger
          aria-label={t("pages.packagingLevel.filters.parentLevelCode")}
          className="w-full"
        >
          <SelectValue
            placeholder={t(
              "pages.packagingLevel.filters.parentLevelCodePlaceholder",
            )}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {parentOptions.map((option) => (
              <SelectItem key={option.id} value={option.levelCode}>
                {option.levelCode}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button type="submit">
        <SearchIcon data-icon="inline-start" />
        {t("pages.packagingLevel.actions.search")}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setValues(packagingLevelDefaultFilters);
          onReset(packagingLevelDefaultFilters);
        }}
      >
        <RotateCcwIcon data-icon="inline-start" />
        {t("pages.packagingLevel.actions.reset")}
      </Button>
    </form>
  );
}
