import {
  CheckIcon,
  ChevronLeftIcon,
  CirclePlusIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  PackagingRuleDetailFormValues,
  PackagingRuleFormValues,
  PackagingRuleLevelOption,
  PackagingRuleRecord,
  PackagingRuleSpecOption,
} from "@/features/mes/packaging/packaging-rule/packaging-rule-contract";

const emptyPackagingRuleLevelValue = "__empty_packaging_rule_level__";
const emptyPackagingRuleSpecValue = "__empty_packaging_rule_spec__";

type PackagingRuleFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  record: PackagingRuleRecord | null;
  levelOptions: PackagingRuleLevelOption[];
  specOptions: PackagingRuleSpecOption[];
  optionLoadErrors: Array<{
    title: string;
    description: string | null;
  }>;
  submitting: boolean;
  onRetryOptions: () => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PackagingRuleFormValues) => Promise<void> | void;
};

function getDefaultValues(
  record: PackagingRuleRecord | null,
): PackagingRuleFormValues {
  if (!record) {
    return {
      ruleCode: "",
      ruleName: "",
      isDefault: false,
      isEnabled: true,
      remark: "",
      details: [],
    };
  }

  return {
    ruleCode: record.ruleCode,
    ruleName: record.ruleName,
    isDefault: record.isDefault,
    isEnabled: record.isEnabled,
    remark: record.remark,
    details: record.details.map((detail) => ({
      id: detail.id,
      packagingLevelCode: detail.packagingLevelCode,
      specCode: detail.specCode,
      standardQuantity: String(detail.standardQuantity),
      maxQuantity: String(detail.maxQuantity),
      packagingMethod: detail.packagingMethod,
    })),
  };
}

function getEmptyDetail(): PackagingRuleDetailFormValues {
  return {
    packagingLevelCode: "",
    specCode: "",
    standardQuantity: "",
    maxQuantity: "",
    packagingMethod: "auto",
  };
}

export function PackagingRuleFormDialog({
  open,
  mode,
  record,
  levelOptions,
  specOptions,
  optionLoadErrors,
  submitting,
  onRetryOptions,
  onOpenChange,
  onSubmit,
}: PackagingRuleFormDialogProps) {
  const { t } = useTranslation("common");
  const formSchema = useMemo(
    () =>
      z.object({
        ruleCode: z
          .string()
          .trim()
          .min(1, t("pages.packagingRule.validation.ruleCodeRequired"))
          .max(32, t("pages.packagingRule.validation.ruleCodeMax")),
        ruleName: z
          .string()
          .trim()
          .min(1, t("pages.packagingRule.validation.ruleNameRequired"))
          .max(64, t("pages.packagingRule.validation.ruleNameMax")),
        isDefault: z.boolean(),
        isEnabled: z.boolean(),
        remark: z
          .string()
          .max(200, t("pages.packagingRule.validation.remarkMax")),
        details: z.array(
          z
            .object({
              id: z.number().optional(),
              packagingLevelCode: z
                .string()
                .trim()
                .min(
                  1,
                  t("pages.packagingRule.validation.detailLevelRequired"),
                ),
              specCode: z
                .string()
                .trim()
                .min(1, t("pages.packagingRule.validation.detailSpecRequired")),
              standardQuantity: z
                .string()
                .trim()
                .min(
                  1,
                  t("pages.packagingRule.validation.standardQuantityRequired"),
                )
                .refine(
                  (value) =>
                    Number.isInteger(Number(value)) && Number(value) > 0,
                  t("pages.packagingRule.validation.quantityPositive"),
                ),
              maxQuantity: z
                .string()
                .trim()
                .min(1, t("pages.packagingRule.validation.maxQuantityRequired"))
                .refine(
                  (value) =>
                    Number.isInteger(Number(value)) && Number(value) > 0,
                  t("pages.packagingRule.validation.quantityPositive"),
                ),
              packagingMethod: z.enum(["auto", "manual"]),
            })
            .superRefine((value, context) => {
              if (Number(value.maxQuantity) < Number(value.standardQuantity)) {
                context.addIssue({
                  code: "custom",
                  path: ["maxQuantity"],
                  message: t("pages.packagingRule.validation.maxQuantityMin"),
                });
              }
            }),
        ),
      }),
    [t],
  );

  const detailSchema = useMemo(
    () =>
      z
        .object({
          id: z.number().optional(),
          packagingLevelCode: z
            .string()
            .trim()
            .min(1, t("pages.packagingRule.validation.detailLevelRequired")),
          specCode: z
            .string()
            .trim()
            .min(1, t("pages.packagingRule.validation.detailSpecRequired")),
          standardQuantity: z
            .string()
            .trim()
            .min(1, t("pages.packagingRule.validation.standardQuantityRequired"))
            .refine(
              (value) =>
                Number.isInteger(Number(value)) && Number(value) > 0,
              t("pages.packagingRule.validation.quantityPositive"),
            ),
          maxQuantity: z
            .string()
            .trim()
            .min(1, t("pages.packagingRule.validation.maxQuantityRequired"))
            .refine(
              (value) =>
                Number.isInteger(Number(value)) && Number(value) > 0,
              t("pages.packagingRule.validation.quantityPositive"),
            ),
          packagingMethod: z.enum(["auto", "manual"]),
        })
        .superRefine((value, context) => {
          if (Number(value.maxQuantity) < Number(value.standardQuantity)) {
            context.addIssue({
              code: "custom",
              path: ["maxQuantity"],
              message: t("pages.packagingRule.validation.maxQuantityMin"),
            });
          }
        }),
    [t],
  );

  const form = useForm<PackagingRuleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(record),
  });
  const detailFields = useFieldArray({
    control: form.control,
    name: "details",
  });
  const watchedDetails = form.watch("details");
  const [emptyDetailsConfirmationVisible, setEmptyDetailsConfirmationVisible] =
    useState(false);
  const hasOptionLoadError = optionLoadErrors.length > 0;

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailEditingIndex, setDetailEditingIndex] = useState<number | null>(
    null,
  );

  const detailForm = useForm<PackagingRuleDetailFormValues>({
    resolver: zodResolver(detailSchema),
    defaultValues: getEmptyDetail(),
  });
  const watchedDraftLevel = detailForm.watch("packagingLevelCode");
  const watchedDraftSpec = detailForm.watch("specCode");
  const draftLevel = levelOptions.find(
    (option) => option.levelCode === watchedDraftLevel,
  );
  const draftSpec = specOptions.find(
    (option) => option.specCode === watchedDraftSpec,
  );

  async function submitValues(
    values: PackagingRuleFormValues,
    options: { allowEmptyDetails?: boolean } = {},
  ) {
    if (!values.details.length && !options.allowEmptyDetails) {
      setEmptyDetailsConfirmationVisible(true);
      return;
    }

    setEmptyDetailsConfirmationVisible(false);
    await onSubmit(values);
  }

  const closeDetailDialog = useCallback(() => {
    setDetailDialogOpen(false);
    setDetailEditingIndex(null);
    detailForm.reset(getEmptyDetail());
  }, [detailForm]);

  function openCreateDetailDialog() {
    setDetailEditingIndex(null);
    detailForm.reset(getEmptyDetail());
    setDetailDialogOpen(true);
  }

  function openEditDetailDialog(index: number) {
    setDetailEditingIndex(index);
    detailForm.reset(form.getValues(`details.${index}`));
    setDetailDialogOpen(true);
  }

  async function submitDetail(values: PackagingRuleDetailFormValues) {
    if (detailEditingIndex === null) {
      detailFields.append(values);
    } else {
      detailFields.update(detailEditingIndex, values);
    }

    closeDetailDialog();
  }

  useEffect(() => {
    form.reset(getDefaultValues(record));
    setEmptyDetailsConfirmationVisible(false);
    closeDetailDialog();
  }, [form, record, open, closeDetailDialog]);

  useEffect(() => {
    if (watchedDetails.length) {
      setEmptyDetailsConfirmationVisible(false);
    }
  }, [watchedDetails.length]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(100%-2rem,72rem)] max-w-none gap-0 overflow-hidden p-0"
        data-testid="packaging-rule-form-dialog"
        showCloseButton
      >
        <DialogHeader className="border-b px-8 py-6">
          <DialogTitle className="text-4xl/none font-semibold">
            {mode === "create"
              ? t("pages.packagingRule.form.createTitle")
              : t("pages.packagingRule.form.editTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("pages.packagingRule.form.description")}
          </DialogDescription>
        </DialogHeader>

        <form
          id="packaging-rule-form"
          className="flex flex-col"
          onSubmit={form.handleSubmit(async (values) => {
            await submitValues(values);
          })}
        >
          <FieldGroup className="max-h-[calc(100vh-18rem)] overflow-y-auto px-8 py-6">
            {hasOptionLoadError ? (
              <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <div>
                  <p className="font-medium text-destructive">
                    {t("pages.packagingRule.form.optionLoadErrorTitle")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("pages.packagingRule.form.optionLoadErrorDescription")}
                  </p>
                </div>
                <div className="space-y-2">
                  {optionLoadErrors.map((error) => (
                    <div
                      key={`${error.title}-${error.description ?? ""}`}
                      className="rounded-md border bg-background/80 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{error.title}</p>
                      {error.description ? (
                        <p className="text-muted-foreground">
                          {error.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onRetryOptions}
                  >
                    {t("pages.packagingRule.actions.retry")}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <Controller
                name="ruleCode"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="packaging-rule-form-rule-code">
                      <span aria-hidden="true" className="text-destructive">
                        *
                      </span>
                      {t("pages.packagingRule.filters.ruleCode")}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="packaging-rule-form-rule-code"
                      data-testid="packaging-rule-form-rule-code"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      placeholder={t(
                        "pages.packagingRule.filters.ruleCodePlaceholder",
                      )}
                      readOnly={mode === "edit"}
                    />
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </Field>
                )}
              />

              <Controller
                name="ruleName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="packaging-rule-form-rule-name">
                      <span aria-hidden="true" className="text-destructive">
                        *
                      </span>
                      {t("pages.packagingRule.filters.ruleName")}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="packaging-rule-form-rule-name"
                      data-testid="packaging-rule-form-rule-name"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      placeholder={t(
                        "pages.packagingRule.filters.ruleNamePlaceholder",
                      )}
                    />
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </Field>
                )}
              />

              <Controller
                name="isDefault"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="packaging-rule-form-is-default">
                      {t("pages.packagingRule.filters.isDefault")}
                    </FieldLabel>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        id="packaging-rule-form-is-default"
                        type="checkbox"
                        checked={field.value}
                        onChange={(event) =>
                          field.onChange(event.target.checked)
                        }
                      />
                      <span>
                        {t("pages.packagingRule.form.isDefaultLabel")}
                      </span>
                    </label>
                  </Field>
                )}
              />

              <Controller
                name="isEnabled"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="packaging-rule-form-is-enabled">
                      {t("pages.packagingRule.filters.isEnabled")}
                    </FieldLabel>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        id="packaging-rule-form-is-enabled"
                        type="checkbox"
                        checked={field.value}
                        onChange={(event) =>
                          field.onChange(event.target.checked)
                        }
                      />
                      <span>
                        {t("pages.packagingRule.form.isEnabledLabel")}
                      </span>
                    </label>
                  </Field>
                )}
              />
            </div>

            <Controller
              name="remark"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="packaging-rule-form-remark">
                    {t("pages.packagingRule.form.remark")}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="packaging-rule-form-remark"
                    data-testid="packaging-rule-form-remark"
                    aria-invalid={fieldState.invalid}
                    rows={3}
                    placeholder={t(
                      "pages.packagingRule.form.remarkPlaceholder",
                    )}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <div className="space-y-4 rounded-md border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-medium">
                    {t("pages.packagingRule.form.detailsTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("pages.packagingRule.form.detailsDescription")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={openCreateDetailDialog}
                >
                  <CirclePlusIcon data-icon="inline-start" />
                  {t("pages.packagingRule.actions.addDetail")}
                </Button>
              </div>

              {detailFields.fields.length ? (
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-4 py-3">
                          {t("pages.packagingRule.table.index")}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.packagingRule.form.detailLevelSequence")}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.packagingRule.form.detailLevelCode")}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.packagingRule.form.detailLevelName")}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.packagingRule.form.detailSpecCode")}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.packagingRule.form.detailSpecName")}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.packagingRule.form.detailStandardQuantity")}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.packagingRule.form.detailMaxQuantity")}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.packagingRule.form.detailPackagingMethod")}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.packagingRule.table.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailFields.fields.map((detailField, index) => {
                        const currentDetail = watchedDetails[index];
                        const level = levelOptions.find(
                          (option) =>
                            option.levelCode ===
                            currentDetail?.packagingLevelCode,
                        );
                        const spec = specOptions.find(
                          (option) =>
                            option.specCode === currentDetail?.specCode,
                        );

                        return (
                          <tr
                            key={detailField.id}
                            data-testid={`packaging-rule-detail-row-${index}`}
                          >
                            <td className="px-4 py-3">{index + 1}</td>
                            <td className="px-4 py-3">
                              {level?.levelSequence ?? "-"}
                            </td>
                            <td className="px-4 py-3">
                              {currentDetail?.packagingLevelCode || "-"}
                            </td>
                            <td className="px-4 py-3">
                              {level?.levelName ?? "-"}
                            </td>
                            <td className="px-4 py-3">
                              {currentDetail?.specCode || "-"}
                            </td>
                            <td className="px-4 py-3">
                              {spec?.specName ?? "-"}
                            </td>
                            <td className="px-4 py-3">
                              {currentDetail?.standardQuantity || "-"}
                            </td>
                            <td className="px-4 py-3">
                              {currentDetail?.maxQuantity || "-"}
                            </td>
                            <td className="px-4 py-3">
                              {t(
                                `pages.packagingRule.form.packagingMethodOptions.${currentDetail?.packagingMethod ?? "auto"}`,
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  data-testid={`packaging-rule-detail-edit-${index}`}
                                  onClick={() => openEditDetailDialog(index)}
                                >
                                  {t("pages.packagingRule.actions.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="text-destructive"
                                  data-testid={`packaging-rule-detail-delete-${index}`}
                                  onClick={() => detailFields.remove(index)}
                                >
                                  {t("pages.packagingRule.actions.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  {t("pages.packagingRule.form.emptyDetails")}
                </div>
              )}

              {emptyDetailsConfirmationVisible ? (
                <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4">
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-300">
                      {t("pages.packagingRule.form.emptyDetailsConfirmTitle")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("pages.packagingRule.feedback.emptyDetailsWarning")}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEmptyDetailsConfirmationVisible(false)}
                    >
                      {t("pages.packagingRule.form.emptyDetailsConfirmCancel")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        void form.handleSubmit(async (values) => {
                          await submitValues(values, {
                            allowEmptyDetails: true,
                          });
                        })();
                      }}
                    >
                      {t(
                        "pages.packagingRule.form.emptyDetailsConfirmContinue",
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </FieldGroup>

          <DialogFooter className="border-t px-8 py-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              {t("pages.packagingRule.actions.back")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => form.reset(getDefaultValues(record))}
            >
              <RotateCcwIcon data-icon="inline-start" />
              {t("pages.packagingRule.actions.reset")}
            </Button>
            <Button
              data-testid="packaging-rule-form-submit"
              type="submit"
              form="packaging-rule-form"
              disabled={submitting || hasOptionLoadError}
            >
              <CheckIcon data-icon="inline-start" />
              {t("pages.packagingRule.actions.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog
      open={detailDialogOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeDetailDialog();
        } else {
          setDetailDialogOpen(true);
        }
      }}
    >
      <DialogContent
        className="w-[min(100%-2rem,56rem)] max-w-none"
        data-testid="packaging-rule-detail-dialog"
      >
        <DialogHeader>
          <DialogTitle>
            {detailEditingIndex === null
              ? t("pages.packagingRule.form.detailCreateTitle")
              : t("pages.packagingRule.form.detailEditTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("pages.packagingRule.form.detailsDescription")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={detailForm.handleSubmit(submitDetail)}
          className="space-y-4"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <Controller
              name="packagingLevelCode"
              control={detailForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="packaging-rule-detail-level-code">
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                    {t("pages.packagingRule.form.detailLevelCode")}
                  </FieldLabel>
                  <Select
                    value={field.value || emptyPackagingRuleLevelValue}
                    onValueChange={(value) =>
                      field.onChange(
                        value === emptyPackagingRuleLevelValue ? "" : value,
                      )
                    }
                  >
                    <SelectTrigger
                      id="packaging-rule-detail-level-code"
                      data-testid="packaging-rule-detail-level-code"
                      aria-invalid={fieldState.invalid}
                      className="w-full"
                      onBlur={field.onBlur}
                    >
                      <SelectValue
                        placeholder={t(
                          "pages.packagingRule.form.levelPlaceholder",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={emptyPackagingRuleLevelValue}>
                          {t("pages.packagingRule.form.levelPlaceholder")}
                        </SelectItem>
                        {levelOptions.map((option) => (
                          <SelectItem key={option.id} value={option.levelCode}>
                            {option.levelCode}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Field>
              <FieldLabel htmlFor="packaging-rule-detail-level-name">
                {t("pages.packagingRule.form.detailLevelName")}
              </FieldLabel>
              <Input
                id="packaging-rule-detail-level-name"
                value={draftLevel?.levelName ?? ""}
                readOnly
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="packaging-rule-detail-level-sequence">
                {t("pages.packagingRule.form.detailLevelSequence")}
              </FieldLabel>
              <Input
                id="packaging-rule-detail-level-sequence"
                value={draftLevel ? String(draftLevel.levelSequence) : ""}
                readOnly
              />
            </Field>

            <Controller
              name="specCode"
              control={detailForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="packaging-rule-detail-spec-code">
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                    {t("pages.packagingRule.form.detailSpecCode")}
                  </FieldLabel>
                  <Select
                    value={field.value || emptyPackagingRuleSpecValue}
                    onValueChange={(value) =>
                      field.onChange(
                        value === emptyPackagingRuleSpecValue ? "" : value,
                      )
                    }
                  >
                    <SelectTrigger
                      id="packaging-rule-detail-spec-code"
                      data-testid="packaging-rule-detail-spec-code"
                      aria-invalid={fieldState.invalid}
                      className="w-full"
                      onBlur={field.onBlur}
                    >
                      <SelectValue
                        placeholder={t(
                          "pages.packagingRule.form.specPlaceholder",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={emptyPackagingRuleSpecValue}>
                          {t("pages.packagingRule.form.specPlaceholder")}
                        </SelectItem>
                        {specOptions.map((option) => (
                          <SelectItem key={option.id} value={option.specCode}>
                            {option.specCode}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Field>
              <FieldLabel htmlFor="packaging-rule-detail-spec-name">
                {t("pages.packagingRule.form.detailSpecName")}
              </FieldLabel>
              <Input
                id="packaging-rule-detail-spec-name"
                value={draftSpec?.specName ?? ""}
                readOnly
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="packaging-rule-detail-unit">
                {t("pages.packagingRule.form.detailUnit")}
              </FieldLabel>
              <Input
                id="packaging-rule-detail-unit"
                value={draftSpec?.unit ?? ""}
                readOnly
              />
            </Field>

            <Controller
              name="standardQuantity"
              control={detailForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="packaging-rule-detail-standard-quantity">
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                    {t("pages.packagingRule.form.detailStandardQuantity")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="packaging-rule-detail-standard-quantity"
                    data-testid="packaging-rule-detail-standard-quantity"
                    aria-invalid={fieldState.invalid}
                    inputMode="numeric"
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="maxQuantity"
              control={detailForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="packaging-rule-detail-max-quantity">
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                    {t("pages.packagingRule.form.detailMaxQuantity")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="packaging-rule-detail-max-quantity"
                    data-testid="packaging-rule-detail-max-quantity"
                    aria-invalid={fieldState.invalid}
                    inputMode="numeric"
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="packagingMethod"
              control={detailForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="packaging-rule-detail-method">
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                    {t("pages.packagingRule.form.detailPackagingMethod")}
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="packaging-rule-detail-method"
                      data-testid="packaging-rule-detail-method"
                      aria-invalid={fieldState.invalid}
                      className="w-full"
                      onBlur={field.onBlur}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="auto">
                          {t(
                            "pages.packagingRule.form.packagingMethodOptions.auto",
                          )}
                        </SelectItem>
                        <SelectItem value="manual">
                          {t(
                            "pages.packagingRule.form.packagingMethodOptions.manual",
                          )}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Field>
              <FieldLabel htmlFor="packaging-rule-detail-packaging-type">
                {t("pages.packagingRule.form.detailPackagingTypeName")}
              </FieldLabel>
              <Input
                id="packaging-rule-detail-packaging-type"
                value={draftSpec?.packagingTypeName ?? ""}
                readOnly
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDetailDialog}
            >
              {t("pages.packagingRule.actions.cancel")}
            </Button>
            <Button type="submit" data-testid="packaging-rule-detail-submit">
              {t("pages.packagingRule.actions.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
