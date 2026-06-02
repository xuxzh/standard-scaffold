import { RotateCcwIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  materialPackagingRelationDefaultFilters,
  type MaterialPackagingRelationFilters,
} from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";

type MaterialPackagingRelationFilterFormProps = {
  defaultValues: MaterialPackagingRelationFilters;
  onSubmit: (values: MaterialPackagingRelationFilters) => void;
  onReset: (values: MaterialPackagingRelationFilters) => void;
};

export function MaterialPackagingRelationFilterForm({
  defaultValues,
  onSubmit,
  onReset,
}: MaterialPackagingRelationFilterFormProps) {
  const [values, setValues] = useState(defaultValues);
  const { t } = useTranslation("common");

  return (
    <form
      className="grid gap-4 rounded-md border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
      data-testid="material-packaging-relation-filter-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <Input
        aria-label={t("pages.materialPackagingRelation.filters.materialCode")}
        placeholder={t(
          "pages.materialPackagingRelation.filters.materialCodePlaceholder",
        )}
        value={values.materialCode}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            materialCode: event.target.value,
          }))
        }
      />
      <Input
        aria-label={t("pages.materialPackagingRelation.filters.materialName")}
        placeholder={t(
          "pages.materialPackagingRelation.filters.materialNamePlaceholder",
        )}
        value={values.materialName}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            materialName: event.target.value,
          }))
        }
      />
      <Input
        aria-label={t(
          "pages.materialPackagingRelation.filters.packagingRuleCode",
        )}
        placeholder={t(
          "pages.materialPackagingRelation.filters.packagingRuleCodePlaceholder",
        )}
        value={values.packagingRuleCode}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            packagingRuleCode: event.target.value,
          }))
        }
      />
      <Input
        aria-label={t(
          "pages.materialPackagingRelation.filters.packagingRuleName",
        )}
        placeholder={t(
          "pages.materialPackagingRelation.filters.packagingRuleNamePlaceholder",
        )}
        value={values.packagingRuleName}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            packagingRuleName: event.target.value,
          }))
        }
      />
      <Button type="submit">
        <SearchIcon data-icon="inline-start" />
        {t("pages.materialPackagingRelation.actions.search")}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setValues(materialPackagingRelationDefaultFilters);
          onReset(materialPackagingRelationDefaultFilters);
        }}
      >
        <RotateCcwIcon data-icon="inline-start" />
        {t("pages.materialPackagingRelation.actions.reset")}
      </Button>
    </form>
  );
}
