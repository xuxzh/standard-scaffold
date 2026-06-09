import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import type { MaterialUnitOption } from "@/features/mes/material-unit/material-unit-contract";

type MaterialUnitSelectProps = {
  /** Available material unit options to choose from. */
  options: MaterialUnitOption[];
  /** Currently selected materialUnitCode (controlled value). */
  value: string;
  /** Called when the user selects a different material unit. Passes the selected materialUnitCode. */
  onValueChange: (value: string) => void;
  /** react-hook-form onBlur callback, forwarded to the Combobox. */
  onBlur?: () => void;
  /**
   * Called whenever the derived display name changes.
   * Enables the parent form to capture the selected unit's name for submission.
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
  /** Override the label for the unit code Combobox. Falls back to i18n key if not provided. */
  label?: string;
  /** Override the Combobox placeholder. Falls back to i18n key if not provided. */
  placeholder?: string;
  /** Override the search input placeholder. Falls back to i18n key if not provided. */
  searchPlaceholder?: string;
  /** Override the empty results text. Falls back to i18n key if not provided. */
  emptyText?: string;
  /** When true, renders a red asterisk next to the label to indicate a required field. */
  required?: boolean;
};

export function MaterialUnitSelect({
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
  placeholder,
  searchPlaceholder,
  emptyText,
  required = false,
}: MaterialUnitSelectProps) {
  const { t } = useTranslation("common");

  const comboboxOptions = useMemo(
    () =>
      options.map((opt) => ({
        value: opt.materialUnitCode,
        label: `${opt.materialUnitCode}-${opt.materialUnitName}`,
      })),
    [options],
  );

  const selectedUnitName =
    options.find((opt) => opt.materialUnitCode === value)?.materialUnitName ??
    "";

  const onSelectedNameChangeRef = useRef(onSelectedNameChange);

  useEffect(() => {
    onSelectedNameChangeRef.current = onSelectedNameChange;
  });

  useEffect(() => {
    onSelectedNameChangeRef.current?.(selectedUnitName);
  }, [selectedUnitName]);

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
        {label ?? t("pages.materialUnit.form.unitCode")}
      </FieldLabel>
      <Combobox
        id={id}
        data-testid={dataTestId}
        options={comboboxOptions}
        value={value}
        placeholder={
          placeholder ?? t("pages.materialUnit.form.unitPlaceholder")
        }
        searchPlaceholder={
          searchPlaceholder ?? t("pages.materialUnit.form.searchUnit")
        }
        emptyText={
          emptyText ?? t("pages.materialUnit.form.noUnitFound")
        }
        aria-label={label ?? t("pages.materialUnit.form.unitCode")}
        aria-invalid={invalid}
        onValueChange={onValueChange}
        onBlur={onBlur}
      />
      {invalid && error ? <FieldError errors={[error]} /> : null}
    </Field>
  );
}
