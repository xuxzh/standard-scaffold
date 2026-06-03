import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PrintTemplateOption } from "@/features/mes/packaging/print-template/print-template-contract";

type PrintTemplateSelectProps = {
  /** Available print template options to choose from. */
  options: PrintTemplateOption[];
  /** Currently selected templateCode (controlled value). */
  value: string;
  /** Called when the user selects a different template. Passes the selected templateCode. */
  onValueChange: (value: string) => void;
  /** react-hook-form onBlur callback, forwarded to the Combobox. */
  onBlur?: () => void;
  /**
   * Called whenever the derived display name changes.
   * Enables the parent form to capture the selected template's name for submission.
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
  /** Override the label for the template code Combobox. Falls back to i18n key if not provided. */
  label?: string;
  /** Override the label for the template name Input. Falls back to i18n key if not provided. */
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

export function PrintTemplateSelect({
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
}: PrintTemplateSelectProps) {
  const { t } = useTranslation("common");

  const comboboxOptions = useMemo(
    () =>
      options.map((opt) => ({
        value: opt.templateCode,
        label: `${opt.templateCode}-${opt.templateName}`,
      })),
    [options],
  );

  const selectedTemplateName =
    options.find((opt) => opt.templateCode === value)?.templateName ?? "";

  const onSelectedNameChangeRef = useRef(onSelectedNameChange);
  onSelectedNameChangeRef.current = onSelectedNameChange;

  useEffect(() => {
    onSelectedNameChangeRef.current?.(selectedTemplateName);
  }, [selectedTemplateName]);

  return (
    <>
      <Field data-invalid={invalid}>
        <FieldLabel htmlFor={id}>
          {required ? (
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          ) : null}
          {label ?? t("pages.packagingRule.config.fields.printTemplateCode")}
        </FieldLabel>
        <Combobox
          id={id}
          data-testid={dataTestId}
          options={comboboxOptions}
          value={value}
          placeholder={
            placeholder ?? t("pages.packagingRule.config.selectPlaceholder")
          }
          searchPlaceholder={
            searchPlaceholder ??
            t("pages.packagingRule.config.selectPlaceholder")
          }
          emptyText={
            emptyText ?? t("pages.packagingRule.config.selectPlaceholder")
          }
          aria-label={
            label ?? t("pages.packagingRule.config.fields.printTemplateCode")
          }
          aria-invalid={invalid}
          onValueChange={onValueChange}
          onBlur={onBlur}
        />
        {invalid && error ? <FieldError errors={[error]} /> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-name`}>
          {nameLabel ?? t("pages.packagingRule.config.fields.printTemplateName")}
        </FieldLabel>
        <Input
          id={`${id}-name`}
          data-testid={`${dataTestId}-name`}
          value={selectedTemplateName}
          readOnly
        />
      </Field>
    </>
  );
}
