import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { LabelRuleOption } from "@/features/mes/packaging/label-rule/label-rule-contract";

type LabelRuleSelectProps = {
  /** Available label rule options to choose from. */
  options: LabelRuleOption[];
  /** Currently selected ruleId (controlled value). */
  value: string;
  /** Called when the user selects a different label rule. Passes the selected ruleId. */
  onValueChange: (value: string) => void;
  /** react-hook-form onBlur callback, forwarded to the Combobox. */
  onBlur?: () => void;
  /**
   * Called whenever the derived display name changes.
   * Enables the parent form to capture the selected rule's name for submission.
   */
  onSelectedNameChange?: (name: string) => void;
  /** DOM id for the Combobox element. */
  id: string;
  /** data-testid for the Combobox element. The name Input uses `${dataTestId}-name`. */
  "data-testid": string;
  /** When true, marks the Combobox as invalid and renders a FieldError if `error` is provided. */
  "aria-invalid"?: boolean;
  /** react-hook-form FieldError to display below the Combobox. */
  error?: { message?: string };
  /** Override the label for the rule code Combobox. Falls back to i18n key if not provided. */
  label?: string;
  /** Override the label for the rule name Input. Falls back to i18n key if not provided. */
  nameLabel?: string;
  /** Override the Combobox placeholder. Falls back to i18n key if not provided. */
  placeholder?: string;
  /** Override the search input placeholder. Falls back to i18n key if not provided. */
  searchPlaceholder?: string;
  /** Override the empty results text. Falls back to i18n key if not provided. */
  emptyText?: string;
  /** When true, renders a red asterisk next to the label to indicate a required field. */
  required?: boolean;
};

export function LabelRuleSelect({
  options,
  value,
  onValueChange,
  onBlur,
  onSelectedNameChange,
  id,
  "data-testid": dataTestId,
  "aria-invalid": invalid,
  error,
  label,
  nameLabel,
  placeholder,
  searchPlaceholder,
  emptyText,
  required = false,
}: LabelRuleSelectProps) {
  const { t } = useTranslation("common");

  const comboboxOptions = useMemo(
    () =>
      options.map((opt) => ({
        value: opt.ruleId,
        label: `${opt.ruleId}-${opt.ruleName}`,
      })),
    [options],
  );

  const selectedRuleName =
    options.find((opt) => opt.ruleId === value)?.ruleName ?? "";

  const onSelectedNameChangeRef = useRef(onSelectedNameChange);
  useEffect(() => {
    onSelectedNameChangeRef.current = onSelectedNameChange;
  });

  useEffect(() => {
    onSelectedNameChangeRef.current?.(selectedRuleName);
  }, [selectedRuleName]);

  return (
    <>
      <Field data-invalid={invalid}>
        <FieldLabel htmlFor={id}>
          {required ? (
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          ) : null}
          {label ?? t("pages.packagingSpec.form.barcodeRuleCode")}
        </FieldLabel>
        <Combobox
          id={id}
          data-testid={dataTestId}
          options={comboboxOptions}
          value={value}
          placeholder={
            placeholder ?? t("pages.packagingSpec.form.selectPlaceholder")
          }
          searchPlaceholder={
            searchPlaceholder ??
            t("pages.packagingSpec.form.selectPlaceholder")
          }
          emptyText={
            emptyText ?? t("pages.packagingSpec.form.selectPlaceholder")
          }
          aria-label={
            label ?? t("pages.packagingSpec.form.barcodeRuleCode")
          }
          aria-invalid={invalid}
          onValueChange={onValueChange}
          onBlur={onBlur}
        />
        {invalid && error ? <FieldError errors={[error]} /> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-name`}>
          {nameLabel ?? t("pages.packagingSpec.form.barcodeRuleName")}
        </FieldLabel>
        <Input
          id={`${id}-name`}
          data-testid={`${dataTestId}-name`}
          value={selectedRuleName}
          readOnly
        />
      </Field>
    </>
  );
}
