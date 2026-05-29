import { CheckIcon, ChevronLeftIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  PackagingLevelFormValues,
  PackagingLevelOption,
  PackagingLevelRecord,
} from "@/features/wms/packaging/packaging-level/packaging-level-contract";

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

function getDefaultValues(record: PackagingLevelRecord | null): PackagingLevelFormValues {
  if (!record) {
    return {
      levelCode: "",
      levelSequence: "",
      levelName: "",
      parentLevelCode: "",
      description: "",
    };
  }

  return {
    levelCode: record.levelCode,
    levelSequence: String(record.levelSequence),
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
      z
        .object({
          levelCode: z
            .string()
            .trim()
            .min(1, t("pages.packagingLevel.validation.levelCodeRequired"))
            .max(32, t("pages.packagingLevel.validation.levelCodeMax")),
          levelSequence: z
            .string()
            .trim()
            .min(1, t("pages.packagingLevel.validation.levelSequenceRequired"))
            .refine(
              (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
              t("pages.packagingLevel.validation.levelSequenceMin"),
            ),
          levelName: z
            .string()
            .trim()
            .min(1, t("pages.packagingLevel.validation.levelNameRequired"))
            .max(32, t("pages.packagingLevel.validation.levelNameMax")),
          parentLevelCode: z.string(),
          description: z
            .string()
            .max(200, t("pages.packagingLevel.validation.descriptionMax")),
        })
        .superRefine((values, context) => {
          const levelSequence = Number.parseInt(values.levelSequence, 10);

          if (levelSequence === 1 && values.parentLevelCode) {
            context.addIssue({
              code: "custom",
              path: ["parentLevelCode"],
              message: t("pages.packagingLevel.validation.parentMustBeEmpty"),
            });
            return;
          }

          if (!values.parentLevelCode) {
            return;
          }

          const parent = parentOptions.find(
            (option) => option.levelCode === values.parentLevelCode,
          );

          if (parent && parent.levelSequence >= levelSequence) {
            context.addIssue({
              code: "custom",
              path: ["parentLevelCode"],
              message: t("pages.packagingLevel.validation.parentSequence"),
            });
          }
        }),
    [parentOptions, t],
  );

  const form = useForm<PackagingLevelFormValues>({
    resolver: zodResolver(formSchema),
    values: getDefaultValues(record),
  });

  const currentSequence = form.watch("levelSequence");
  const currentParentLevelCode = form.watch("parentLevelCode");
  const currentSequenceNumber = Number.parseInt(currentSequence, 10);

  const availableParentOptions = useMemo(() => {
    if (!Number.isInteger(currentSequenceNumber) || currentSequenceNumber <= 1) {
      return [];
    }

    return parentOptions.filter(
      (option) =>
        option.levelSequence < currentSequenceNumber &&
        (mode !== "edit" || option.levelCode !== record?.levelCode),
    );
  }, [currentSequenceNumber, mode, parentOptions, record?.levelCode]);

  const parentLevelName =
    parentOptions.find((option) => option.levelCode === currentParentLevelCode)?.levelName ??
    "";

  useEffect(() => {
    if (currentSequenceNumber === 1 && currentParentLevelCode) {
      form.setValue("parentLevelCode", "", { shouldValidate: true, shouldDirty: true });
      return;
    }

    if (
      currentParentLevelCode &&
      !availableParentOptions.some(
        (option) => option.levelCode === currentParentLevelCode,
      )
    ) {
      form.setValue("parentLevelCode", "", { shouldValidate: true, shouldDirty: true });
    }
  }, [availableParentOptions, currentParentLevelCode, currentSequenceNumber, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(100%-2rem,56rem)] max-w-none gap-0 overflow-hidden p-0"
        data-testid="packaging-level-form-dialog"
        showCloseButton
      >
        <DialogHeader className="border-b px-8 py-6">
          <DialogTitle className="text-4xl/none font-semibold">
            {mode === "create"
              ? t("pages.packagingLevel.form.createTitle")
              : t("pages.packagingLevel.form.editTitle")}
          </DialogTitle>
        </DialogHeader>

        <form
          id="packaging-level-form"
          className="flex flex-col"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit({
              ...values,
              parentLevelName,
            });
          })}
        >
          <FieldGroup className="max-h-[calc(100vh-18rem)] overflow-y-auto px-8 py-6">
            <Controller
              name="levelCode"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="packaging-level-form-level-code">
                    <span aria-hidden="true" className="text-destructive">*</span>
                    {t("pages.packagingLevel.filters.levelCode")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="packaging-level-form-level-code"
                    data-testid="packaging-level-form-level-code"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    disabled={mode === "edit"}
                    placeholder={t("pages.packagingLevel.filters.levelCodePlaceholder")}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="levelSequence"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="packaging-level-form-level-sequence">
                    <span aria-hidden="true" className="text-destructive">*</span>
                    {t("pages.packagingLevel.filters.levelSequence")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="packaging-level-form-level-sequence"
                    data-testid="packaging-level-form-level-sequence"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    inputMode="numeric"
                    placeholder={t("pages.packagingLevel.form.levelSequencePlaceholder")}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="levelName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="packaging-level-form-level-name">
                    <span aria-hidden="true" className="text-destructive">*</span>
                    {t("pages.packagingLevel.filters.levelName")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="packaging-level-form-level-name"
                    data-testid="packaging-level-form-level-name"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    placeholder={t("pages.packagingLevel.filters.levelNamePlaceholder")}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
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
                  <select
                    {...field}
                    id="packaging-level-form-parent-level-code"
                    data-testid="packaging-level-form-parent-level-code"
                    aria-invalid={fieldState.invalid}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    disabled={currentSequenceNumber === 1}
                  >
                    <option value="">
                      {t("pages.packagingLevel.form.parentLevelPlaceholder")}
                    </option>
                    {availableParentOptions.map((option) => (
                      <option key={option.id} value={option.levelCode}>
                        {option.levelCode}
                      </option>
                    ))}
                  </select>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Field>
              <FieldLabel htmlFor="packaging-level-form-parent-level-name">
                {t("pages.packagingLevel.form.parentLevelName")}
              </FieldLabel>
              <Input
                id="packaging-level-form-parent-level-name"
                value={parentLevelName}
                readOnly
              />
            </Field>

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
                    placeholder={t("pages.packagingLevel.form.descriptionPlaceholder")}
                    rows={4}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className="border-t px-8 py-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <ChevronLeftIcon data-icon="inline-start" />
              {t("pages.packagingLevel.actions.back")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => form.reset(getDefaultValues(record))}
            >
              <RotateCcwIcon data-icon="inline-start" />
              {t("pages.packagingLevel.actions.reset")}
            </Button>
            <Button
              data-testid="packaging-level-form-submit"
              type="submit"
              form="packaging-level-form"
              disabled={submitting}
            >
              <CheckIcon data-icon="inline-start" />
              {t("pages.packagingLevel.actions.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
