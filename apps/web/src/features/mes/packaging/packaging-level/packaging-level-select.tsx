import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PackagingLevelOption } from "@/features/mes/packaging/packaging-level/packaging-level-contract";

type PackagingLevelSelectProps = {
  /** Available packaging level options to choose from. */
  options: PackagingLevelOption[];
  /** Currently selected levelCode (controlled value). */
  value: string;
  /** Called when the user selects a different packaging level. Passes the selected levelCode. */
  onValueChange: (value: string) => void;
  /** react-hook-form onBlur callback, forwarded to the Combobox. */
  onBlur?: () => void;
  /**
   * Called whenever the derived display name changes.
   * Enables the parent form to capture the selected level's name for submission.
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
  /** Override the label for the level code Combobox. Falls back to i18n key if not provided. */
  label?: string;
  /** Override the label for the level name Input. Falls back to i18n key if not provided. */
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

export function PackagingLevelSelect({
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
}: PackagingLevelSelectProps) {
  const { t } = useTranslation("common");

  const comboboxOptions = useMemo(
    () =>
      options.map((opt) => ({
        value: opt.levelCode,
        label: `${opt.levelCode}-${opt.levelName}`,
      })),
    [options],
  );

  const selectedLevelName =
    options.find((opt) => opt.levelCode === value)?.levelName ?? "";

  const onSelectedNameChangeRef = useRef(onSelectedNameChange);
  onSelectedNameChangeRef.current = onSelectedNameChange;

  useEffect(() => {
    onSelectedNameChangeRef.current?.(selectedLevelName);
  }, [selectedLevelName]);

  return (
    <>
      <Field data-invalid={invalid}>
        <FieldLabel htmlFor={id}>
          {required ? (
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          ) : null}
          {label ?? t("pages.packagingLevel.filters.parentLevelCode")}
        </FieldLabel>
        <Combobox
          id={id}
          data-testid={dataTestId}
          options={comboboxOptions}
          value={value}
          placeholder={
            placeholder ?? t("pages.packagingLevel.form.parentLevelPlaceholder")
          }
          searchPlaceholder={
            searchPlaceholder ??
            t("pages.packagingLevel.form.searchParentLevel")
          }
          emptyText={
            emptyText ?? t("pages.packagingLevel.form.noParentLevelFound")
          }
          aria-label={
            label ?? t("pages.packagingLevel.filters.parentLevelCode")
          }
          aria-invalid={invalid}
          onValueChange={onValueChange}
          onBlur={onBlur}
        />
        {invalid && error ? <FieldError errors={[error]} /> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-name`}>
          {nameLabel ?? t("pages.packagingLevel.form.parentLevelName")}
        </FieldLabel>
        <Input id={`${id}-name`} value={selectedLevelName} readOnly />
      </Field>
    </>
  );
}
