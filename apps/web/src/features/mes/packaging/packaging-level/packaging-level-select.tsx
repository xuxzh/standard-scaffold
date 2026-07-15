import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import type { PackagingLevelOption } from "@/features/mes/packaging/packaging-level/packaging-level-contract";

type PackagingLevelSelectProps = {
  /** Available packaging level options to choose from. */
  options: PackagingLevelOption[];
  /** Currently selected levelCode (controlled value). Pass "" to clear. */
  value: string;
  /**
   * Called when the user selects a different packaging level.
   * Passes the selected levelCode; receives "" when the clear button is clicked.
   */
  onValueChange: (value: string) => void;
  /** react-hook-form onBlur callback, forwarded to the Combobox trigger. */
  onBlur?: () => void;
  /** DOM id for the Combobox trigger. */
  id: string;
  /** data-testid for the Combobox trigger. */
  "data-testid": string;
  /** Override the placeholder text. Falls back to i18n key when omitted. */
  placeholder?: string;
  /** Override the search input placeholder. Falls back to i18n key when omitted. */
  searchPlaceholder?: string;
  /** Override the empty results text. Falls back to i18n key when omitted. */
  emptyText?: string;
  /** Override the aria-label on the Combobox trigger. Falls back to i18n key when omitted. */
  "aria-label"?: string;
  /** Forwarded to the underlying Combobox trigger. */
  "aria-invalid"?: boolean;
  /** Forwarded to the underlying Combobox trigger and clear button. */
  disabled?: boolean;
  /** When true, a clear (×) button is shown next to the trigger when a value is selected. */
  clearable?: boolean;
  /** Extra className merged onto the Combobox root container. */
  className?: string;
};

/**
 * Domain-specific Combobox wrapper for `PackagingLevelOption`.
 *
 * Owns only the option-shape translation (`levelCode` → Combobox value,
 * `${levelCode}-${levelName}` → Combobox label) and i18n defaults.
 * Callers compose it with `Field` / `FieldLabel` / `FieldError` themselves.
 */
export function PackagingLevelSelect({
  options,
  value,
  onValueChange,
  onBlur,
  id,
  "data-testid": dataTestId,
  placeholder,
  searchPlaceholder,
  emptyText,
  "aria-label": ariaLabel,
  "aria-invalid": invalid,
  disabled,
  clearable,
  className,
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

  return (
    <Combobox
      id={id}
      data-testid={dataTestId}
      options={comboboxOptions}
      value={value}
      placeholder={
        placeholder ?? t("pages.packagingLevel.form.parentLevelPlaceholder")
      }
      searchPlaceholder={
        searchPlaceholder ?? t("pages.packagingLevel.form.searchParentLevel")
      }
      emptyText={
        emptyText ?? t("pages.packagingLevel.form.noParentLevelFound")
      }
      aria-label={ariaLabel ?? t("pages.packagingLevel.filters.parentLevelCode")}
      aria-invalid={invalid}
      disabled={disabled}
      clearable={clearable}
      className={className}
      onValueChange={onValueChange}
      onBlur={onBlur}
    />
  );
}
