import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import type { PackagingTypeOptionDto } from "@/features/mes/packaging/packaging-type/packaging-contract";

export type PackagingTypeSelectProps = {
  /** Available packaging type options. */
  options: PackagingTypeOptionDto[];
  /** Currently selected TypeCode (controlled value). */
  value: string;
  /** Called when the user selects a different packaging type. */
  onValueChange: (value: string) => void;
  /** When true, disables both the trigger and the clear button. */
  disabled?: boolean;
  /** DOM id for the Combobox trigger. */
  id?: string;
  /** data-testid for the Combobox trigger. */
  "data-testid"?: string;
  /** Override the accessible label. Falls back to the packagingType.typeCode i18n key. */
  "aria-label"?: string;
  /** Override the Combobox placeholder. */
  placeholder?: string;
  /** Override the search input placeholder. */
  searchPlaceholder?: string;
  /** Override the empty results text. */
  emptyText?: string;
  /** Override the clear button label. */
  clearLabel?: string;
};

export function PackagingTypeSelect({
  options,
  value,
  onValueChange,
  disabled = false,
  id,
  "data-testid": dataTestId,
  "aria-label": ariaLabel,
  placeholder,
  searchPlaceholder,
  emptyText,
  clearLabel,
}: PackagingTypeSelectProps) {
  const { t } = useTranslation("common");

  const comboboxOptions = useMemo(
    () =>
      options.map((opt) => ({
        value: opt.TypeCode,
        label: `${opt.TypeCode}-${opt.TypeName}`,
      })),
    [options],
  );

  return (
    <Combobox
      options={comboboxOptions}
      value={value}
      placeholder={
        placeholder ?? t("pages.packagingType.select.placeholder")
      }
      searchPlaceholder={
        searchPlaceholder ??
        t("pages.packagingType.select.searchPlaceholder")
      }
      emptyText={
        emptyText ?? t("pages.packagingType.select.emptyText")
      }
      clearLabel={
        clearLabel ?? t("pages.packagingType.select.clearLabel")
      }
      aria-label={
        ariaLabel ?? t("pages.packagingType.filters.typeCode")
      }
      disabled={disabled}
      id={id}
      data-testid={dataTestId}
      onValueChange={onValueChange}
    />
  );
}
