import { RotateCcwIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  packagingRuleDefaultFilters,
  type PackagingRuleFilters,
} from "@/features/wms/packaging/packaging-rule/packaging-rule-contract";

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
      <select
        aria-label={t("pages.packagingRule.filters.isDefault")}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        value={values.isDefault}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            isDefault: event.target.value as PackagingRuleFilters["isDefault"],
          }))
        }
      >
        <option value="all">{t("pages.packagingRule.filters.options.all")}</option>
        <option value="true">{t("pages.packagingRule.filters.options.true")}</option>
        <option value="false">{t("pages.packagingRule.filters.options.false")}</option>
      </select>
      <select
        aria-label={t("pages.packagingRule.filters.isEnabled")}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        value={values.isEnabled}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            isEnabled: event.target.value as PackagingRuleFilters["isEnabled"],
          }))
        }
      >
        <option value="all">{t("pages.packagingRule.filters.options.all")}</option>
        <option value="true">{t("pages.packagingRule.filters.statusEnabled")}</option>
        <option value="false">{t("pages.packagingRule.filters.statusDisabled")}</option>
      </select>
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