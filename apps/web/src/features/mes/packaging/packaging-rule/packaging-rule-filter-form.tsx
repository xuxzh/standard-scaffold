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
  packagingRuleDefaultFilters,
  type PackagingRuleFilters,
} from "@/features/mes/packaging/packaging-rule/packaging-rule-contract";

type PackagingRuleFilterFormProps = {
  defaultValues: PackagingRuleFilters;
  onSubmit: (values: PackagingRuleFilters) => void;
  onReset: (values: PackagingRuleFilters) => void;
};

export function PackagingRuleFilterForm({
  defaultValues,
  onSubmit,
  onReset,
}: PackagingRuleFilterFormProps) {
  const [values, setValues] = useState(defaultValues);
  const { t } = useTranslation("common");

  return (
    <form
      className="grid gap-4 rounded-md border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_180px_auto_auto]"
      data-testid="packaging-rule-filter-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <Input
        aria-label={t("pages.packagingRule.filters.ruleCode")}
        placeholder={t("pages.packagingRule.filters.ruleCodePlaceholder")}
        value={values.ruleCode}
        onChange={(event) =>
          setValues((current) => ({ ...current, ruleCode: event.target.value }))
        }
      />
      <Input
        aria-label={t("pages.packagingRule.filters.ruleName")}
        placeholder={t("pages.packagingRule.filters.ruleNamePlaceholder")}
        value={values.ruleName}
        onChange={(event) =>
          setValues((current) => ({ ...current, ruleName: event.target.value }))
        }
      />
      <Select
        value={
          values.isDefault === undefined
            ? ""
            : values.isDefault
              ? "true"
              : "false"
        }
        onValueChange={(value) =>
          setValues((current) => ({
            ...current,
            // 不传值（空字符串）=> undefined => 搜索全部
            isDefault:
              value === ""
                ? undefined
                : (value === "true") as PackagingRuleFilters["isDefault"],
          }))
        }
      >
        <SelectTrigger
          aria-label={t("pages.packagingRule.filters.isDefault")}
          className="w-full"
        >
          <SelectValue
            placeholder={t("pages.packagingRule.filters.isDefaultPlaceholder")}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="true">
              {t("pages.packagingRule.filters.options.true")}
            </SelectItem>
            <SelectItem value="false">
              {t("pages.packagingRule.filters.options.false")}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
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
                : (value === "true") as PackagingRuleFilters["isEnabled"],
          }))
        }
      >
        <SelectTrigger
          aria-label={t("pages.packagingRule.filters.isEnabled")}
          className="w-full"
        >
          <SelectValue
            placeholder={t("pages.packagingRule.filters.isEnabledPlaceholder")}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="true">
              {t("pages.packagingRule.filters.statusEnabled")}
            </SelectItem>
            <SelectItem value="false">
              {t("pages.packagingRule.filters.statusDisabled")}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button type="submit">
        <SearchIcon data-icon="inline-start" />
        {t("pages.packagingRule.actions.search")}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setValues(packagingRuleDefaultFilters);
          onReset(packagingRuleDefaultFilters);
        }}
      >
        <RotateCcwIcon data-icon="inline-start" />
        {t("pages.packagingRule.actions.reset")}
      </Button>
    </form>
  );
}
