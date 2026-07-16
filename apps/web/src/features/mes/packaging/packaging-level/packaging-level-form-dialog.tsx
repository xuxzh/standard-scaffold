import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { AppDialog } from "@/components/app-dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PackagingLevelSelect } from "@/features/mes/packaging/packaging-level/packaging-level-select";
import { Textarea } from "@/components/ui/textarea";
import type {
  PackagingLevelFormValues,
  PackagingLevelOption,
  PackagingLevelRecord,
} from "@/features/mes/packaging/packaging-level/packaging-level-contract";
import { useFormSessionInitializer } from "@/hooks/use-form-session-initializer";

type PackagingLevelFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  record: PackagingLevelRecord | null;
  parentOptions: PackagingLevelOption[];
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    values: PackagingLevelFormValues & { parentLevelName?: string },
  ) => Promise<void> | void;
};

function getDefaultValues(
  record: PackagingLevelRecord | null,
): PackagingLevelFormValues {
  if (!record) {
    return {
      levelCode: "",
      levelName: "",
      parentLevelCode: "",
      description: "",
    };
  }

  return {
    levelCode: record.levelCode,
    levelName: record.levelName,
    parentLevelCode: record.parentLevelCode,
    description: record.description,
  };
}

export function PackagingLevelFormDialog({
  open,
  mode,
  record,
  parentOptions,
  submitting,
  onOpenChange,
  onSubmit,
}: PackagingLevelFormDialogProps) {
  const { t } = useTranslation("common");
  const formSchema = useMemo(
    () =>
      z.object({
        levelCode: z
          .string()
          .trim()
          .min(1, t("pages.packagingLevel.validation.levelCodeRequired"))
          .max(32, t("pages.packagingLevel.validation.levelCodeMax")),
        levelName: z
          .string()
          .trim()
          .min(1, t("pages.packagingLevel.validation.levelNameRequired"))
          .max(32, t("pages.packagingLevel.validation.levelNameMax")),
        parentLevelCode: z.string(),
        description: z
          .string()
          .max(200, t("pages.packagingLevel.validation.descriptionMax")),
      }),
    [t],
  );

  const form = useForm<PackagingLevelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(record),
  });
  const { reset } = form;

  useFormSessionInitializer({
    open,
    sessionKey: mode === "create" ? "create" : `edit:${record?.id ?? "unknown"}`,
    initialize: () => reset(getDefaultValues(record)),
  });

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        mode === "create"
          ? t("pages.packagingLevel.form.createTitle")
          : t("pages.packagingLevel.form.editTitle")
      }
      testId="packaging-level-form-dialog"
      bodyClassName="max-h-[calc(100vh-18rem)]"
      resetAction={{
        onClick: () => form.reset(getDefaultValues(record)),
      }}
      confirmAction={{
        formId: "packaging-level-form",
        disabled: submitting,
        testId: "packaging-level-form-submit",
      }}
    >
      <form
        id="packaging-level-form"
        onSubmit={form.handleSubmit(async (values) => {
          const parentLevelName =
            parentOptions.find(
              (option) => option.levelCode === values.parentLevelCode,
            )?.levelName ?? "";

          await onSubmit({
            ...values,
            parentLevelName,
          });
        })}
      >
        <FieldGroup>
          <Controller
            name="levelCode"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="packaging-level-form-level-code">
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                  {t("pages.packagingLevel.filters.levelCode")}
                </FieldLabel>
                <Input
                  {...field}
                  id="packaging-level-form-level-code"
                  data-testid="packaging-level-form-level-code"
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                  disabled={mode === "edit"}
                  placeholder={t(
                    "pages.packagingLevel.filters.levelCodePlaceholder",
                  )}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />

          <Controller
            name="levelName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="packaging-level-form-level-name">
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                  {t("pages.packagingLevel.filters.levelName")}
                </FieldLabel>
                <Input
                  {...field}
                  id="packaging-level-form-level-name"
                  data-testid="packaging-level-form-level-name"
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                  placeholder={t(
                    "pages.packagingLevel.filters.levelNamePlaceholder",
                  )}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />

          <Controller
            name="parentLevelCode"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="packaging-level-form-parent-level-code">
                  {t("pages.packagingLevel.filters.parentLevelCode")}
                </FieldLabel>
                <PackagingLevelSelect
                  options={parentOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  id="packaging-level-form-parent-level-code"
                  data-testid="packaging-level-form-parent-level-code"
                  aria-label={t(
                    "pages.packagingLevel.filters.parentLevelCode",
                  )}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && fieldState.error ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />

          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="packaging-level-form-description">
                  {t("pages.packagingLevel.table.description")}
                </FieldLabel>
                <Textarea
                  {...field}
                  id="packaging-level-form-description"
                  data-testid="packaging-level-form-description"
                  aria-invalid={fieldState.invalid}
                  placeholder={t(
                    "pages.packagingLevel.form.descriptionPlaceholder",
                  )}
                  rows={4}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
        </FieldGroup>
      </form>
    </AppDialog>
  );
}