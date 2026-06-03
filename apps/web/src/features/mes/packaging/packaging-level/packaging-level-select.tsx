import { useEffect, useMemo } from "react";
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

  useEffect(() => {
    onSelectedNameChange?.(selectedLevelName);
  }, [selectedLevelName, onSelectedNameChange]);

  return (
    <>
      <Field data-invalid={invalid}>
        <FieldLabel htmlFor={id}>
          {t("pages.packagingLevel.filters.parentLevelCode")}
        </FieldLabel>
        <Combobox
          id={id}
          data-testid={dataTestId}
          options={comboboxOptions}
          value={value}
          placeholder={t("pages.packagingLevel.form.parentLevelPlaceholder")}
          searchPlaceholder={t(
            "pages.packagingLevel.form.searchParentLevel",
          )}
          emptyText={t("pages.packagingLevel.form.noParentLevelFound")}
          aria-label={t("pages.packagingLevel.filters.parentLevelCode")}
          aria-invalid={invalid}
          onValueChange={onValueChange}
          onBlur={onBlur}
        />
        {invalid && error ? <FieldError errors={[error]} /> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-name`}>
          {t("pages.packagingLevel.form.parentLevelName")}
        </FieldLabel>
        <Input id={`${id}-name`} value={selectedLevelName} readOnly />
      </Field>
    </>
  );
}
