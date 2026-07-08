import {
  CheckIcon,
  ChevronLeftIcon,
  CirclePlusIcon,
  RotateCcwIcon,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
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
  PackagingMethod,
  PackagingRuleDetailFormValues,
  PackagingRuleFormValues,
  PackagingRuleLevelOption,
  PackagingRuleRecord,
  PackagingRuleSpecOption,
} from "@/features/mes/packaging/packaging-rule/packaging-rule-contract";
import { usePackagingRuleLevelChainMutation } from "@/features/mes/packaging/packaging-rule/packaging-rule-queries";
import { PackagingRuleLevelDialog } from "@/features/mes/packaging/packaging-rule/packaging-rule-level-dialog";
import { useFormSessionInitializer } from "@/hooks/use-form-session-initializer";

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

  // State for the level chain selection dialog. `levelDialogOpen` only
  // controls the dialog visibility; the chosen level is held as draft state
  // inside `PackagingRuleLevelDialog`. `levelDialogEpoch` is bumped on each
  // "open" transition so the dialog is remounted with fresh draft state —
  // this avoids setState-in-effect while still resetting selection on every
  // open.
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [levelDialogEpoch, setLevelDialogEpoch] = useState(0);
  // Cache chain-returned name/sequence per level code so the table still
  // shows them when the level is not present in `levelOptions`.
  const [levelChainNamesByCode, setLevelChainNamesByCode] = useState<
    Record<string, string>
  >({});
  const [levelChainSequencesByCode, setLevelChainSequencesByCode] = useState<
    Record<string, number>
  >({});
  const [levelDialogError, setLevelDialogError] = useState<string | null>(null);
  const levelChainMutation = usePackagingRuleLevelChainMutation();

  const detailForm = useForm<PackagingRuleDetailFormValues>({
    resolver: zodResolver(detailSchema),
    defaultValues: getEmptyDetail(),
  });
  const watchedDraftLevel = detailForm.watch("packagingLevelCode");
  const watchedDraftSpec = detailForm.watch("specCode");
  const draftSpec = specOptions.find(
    (option) => option.specCode === watchedDraftSpec,
  );

  // Form-scoped name resolution: lookup `levelOptions` first, fall back to
  // any name returned by the chain. Names from chain lookups are cached in
  // `levelChainNamesByCode` so the table still shows them if the user reopens
  // the dialog.
  const resolveLevelName = useCallback(
    (levelCode: string) =>
      levelOptions.find((option) => option.levelCode === levelCode)
        ?.levelName ?? levelChainNamesByCode[levelCode] ?? "",
    [levelOptions, levelChainNamesByCode],
  );

  // Form-scoped sequence resolution mirrors `resolveLevelName`. The chain
  // payload is the authoritative source for chain-only levels, so its values
  // take precedence over the cached options list.
  const resolveLevelSequence = useCallback(
    (levelCode: string): number | null =>
      levelChainSequencesByCode[levelCode] ??
      levelOptions.find((option) => option.levelCode === levelCode)
        ?.levelSequence ??
      null,
    [levelChainSequencesByCode, levelOptions],
  );

  // View-model rows for the details `DataTable`. We resolve display values up
  // front so each column cell stays free of duplicated option lookups.
  const detailRows = useMemo<PackagingRuleDetailRowVM[]>(() => {
    return watchedDetails.map((currentDetail, index) => {
      const levelCode = currentDetail?.packagingLevelCode ?? "";
      const resolvedLevelName = levelCode ? resolveLevelName(levelCode) : "";
      const resolvedLevelSequence = levelCode
        ? resolveLevelSequence(levelCode)
        : null;
      const spec = specOptions.find(
        (option) => option.specCode === currentDetail?.specCode,
      );

      return {
        index,
        levelSequence: resolvedLevelSequence,
        levelCode: currentDetail?.packagingLevelCode ?? "",
        levelName: resolvedLevelName,
        specCode: currentDetail?.specCode ?? "",
        specName: spec?.specName ?? "",
        standardQuantity: currentDetail?.standardQuantity ?? "",
        maxQuantity: currentDetail?.maxQuantity ?? "",
        packagingMethod: currentDetail?.packagingMethod ?? "auto",
      };
    });
  }, [
    watchedDetails,
    resolveLevelName,
    resolveLevelSequence,
    levelOptions,
    specOptions,
  ]);

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

  // Open the level chain selection dialog only in `create` mode. The legacy
  // single-row detail dialog is still retained as `openCreateDetailDialog`
  // fallback for `edit` mode (and any code path that bypasses the button),
  // keeping `submitDetail.append` available for portability.
  function openLevelSelectionDialog() {
    if (mode !== "create") {
      openCreateDetailDialog();
      return;
    }

    setLevelDialogError(null);
    levelChainMutation.reset();
    setLevelDialogEpoch((epoch) => epoch + 1);
    setLevelDialogOpen(true);
  }

  /**
   * Load the level chain triggered from the selection dialog confirmation.
   *
   * On success: normalize chain nodes → write to `details` field array
   *             replacing its existing entries; close the dialog; cache
   *             returned `levelName`s for the table fallback.
   * On failure: keep the dialog open, surface the error and leave the main
   *              form untouched.
   */
  async function handleLevelDialogConfirm(levelCode: string) {
    try {
      const options = await levelChainMutation.mutateAsync({
        innerLevelCode: levelCode,
      });

      if (!options.length) {
        setLevelDialogError(
          t("pages.packagingRule.levelDialog.loadError"),
        );
        return;
      }

      const chainNames = options.reduce<Record<string, string>>(
        (acc, option) => {
          acc[option.levelCode] = option.levelName;
          return acc;
        },
        {},
      );

      const chainSequences = options.reduce<Record<string, number>>(
        (acc, option) => {
          acc[option.levelCode] = option.levelSequence;
          return acc;
        },
        {},
      );

      const nextDetails: PackagingRuleDetailFormValues[] = options.map(
        (option) => ({
          id: undefined,
          packagingLevelCode: option.levelCode,
          specCode: "",
          standardQuantity: "",
          maxQuantity: "",
          packagingMethod: "auto",
        }),
      );

      setLevelChainNamesByCode((current) => ({ ...current, ...chainNames }));
      setLevelChainSequencesByCode((current) => ({
        ...current,
        ...chainSequences,
      }));
      setLevelDialogError(null);
      detailFields.replace(nextDetails);
      setLevelDialogOpen(false);
    } catch (error) {
      setLevelDialogError(
        error instanceof Error
          ? error.message
          : t("pages.packagingRule.levelDialog.loadError"),
      );
    }
  }

  useFormSessionInitializer({
    open,
    sessionKey: mode === "create" ? "create" : `edit:${record?.id ?? "unknown"}`,
    initialize: () => {
      form.reset(getDefaultValues(record));
      setEmptyDetailsConfirmationVisible(false);
      closeDetailDialog();
      setLevelDialogOpen(false);
      setLevelDialogError(null);
      setLevelDialogEpoch((epoch) => epoch + 1);
      setLevelChainNamesByCode({});
      setLevelChainSequencesByCode({});
      levelChainMutation.reset();
    },
  });

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
          <DialogTitle>
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
                  onClick={openLevelSelectionDialog}
                >
                  <CirclePlusIcon data-icon="inline-start" />
                  {t("pages.packagingRule.actions.addDetail")}
                </Button>
              </div>

              <PackagingRuleDetailsTable
                rows={detailRows}
                onEdit={openEditDetailDialog}
                onDelete={(index) => detailFields.remove(index)}
                editLabel={t("pages.packagingRule.actions.edit")}
                deleteLabel={t("pages.packagingRule.actions.delete")}
                packagingMethodAutoLabel={t(
                  "pages.packagingRule.form.packagingMethodOptions.auto",
                )}
                packagingMethodManualLabel={t(
                  "pages.packagingRule.form.packagingMethodOptions.manual",
                )}
                emptyLabel={t("pages.packagingRule.form.emptyDetails")}
              />

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

    <PackagingRuleLevelDialog
      key={levelDialogEpoch}
      open={levelDialogOpen}
      levelOptions={levelOptions}
      loading={levelChainMutation.isPending}
      error={levelDialogError}
      onOpenChange={(nextOpen) => {
        setLevelDialogOpen(nextOpen);
        // On close only reset local error and mutation caches; leave the
        // main form untouched so cancel-vs-failure paths stay independent.
        if (!nextOpen) {
          setLevelDialogError(null);
          levelChainMutation.reset();
        }
      }}
      onConfirm={(levelCode) => {
        void handleLevelDialogConfirm(levelCode);
      }}
    />

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
            <Field>
              <FieldLabel htmlFor="packaging-rule-detail-level-code">
                {t("pages.packagingRule.form.detailLevelCode")}
              </FieldLabel>
              <Input
                id="packaging-rule-detail-level-code"
                data-testid="packaging-rule-detail-level-code"
                value={watchedDraftLevel || ""}
                readOnly
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="packaging-rule-detail-level-name">
                {t("pages.packagingRule.form.detailLevelName")}
              </FieldLabel>
              <Input
                id="packaging-rule-detail-level-name"
                data-testid="packaging-rule-detail-level-name"
                value={resolveLevelName(watchedDraftLevel || "")}
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

/**
 * Flat row view-model consumed by `PackagingRuleDetailsTable`. All display
 * fields are pre-resolved so column cells stay declarative.
 */
type PackagingRuleDetailRowVM = {
  index: number;
  levelSequence: number | null;
  levelCode: string;
  levelName: string;
  specCode: string;
  specName: string;
  standardQuantity: string;
  maxQuantity: string;
  packagingMethod: PackagingMethod;
};

type PackagingRuleDetailsTableProps = {
  rows: PackagingRuleDetailRowVM[];
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  editLabel: string;
  deleteLabel: string;
  packagingMethodAutoLabel: string;
  packagingMethodManualLabel: string;
  emptyLabel: string;
};

/**
 * Inner-state table for the packaging-rule detail rows. Built on the shared
 * `DataTable` so column pinning and overflow behavior stay consistent with
 * the rest of the app.
 */
function PackagingRuleDetailsTable({
  rows,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  packagingMethodAutoLabel,
  packagingMethodManualLabel,
  emptyLabel,
}: PackagingRuleDetailsTableProps) {
  const { t } = useTranslation("common");
  // Wrap callbacks in stable refs so the `DataTable` columns memo below
  // does not rebuild on every render (warnings + lost memoization).
  const handleEdit = useCallback(
    (index: number) => onEdit(index),
    [onEdit],
  );
  const handleDelete = useCallback(
    (index: number) => onDelete(index),
    [onDelete],
  );
  // Columns are memoized so table options keep stable references between
  // renders — required by `useReactTable`.
  const columns = useMemo<ColumnDef<PackagingRuleDetailRowVM>[]>(
    () => [
      {
        accessorKey: "levelSequence",
        header: t("pages.packagingRule.form.detailLevelSequence"),
        cell: ({ row }) => row.original.levelSequence ?? "-",
      },
      {
        accessorKey: "levelCode",
        header: t("pages.packagingRule.form.detailLevelCode"),
        cell: ({ row }) => row.original.levelCode || "-",
      },
      {
        accessorKey: "levelName",
        header: t("pages.packagingRule.form.detailLevelName"),
        cell: ({ row }) => row.original.levelName || "-",
      },
      {
        accessorKey: "specCode",
        header: t("pages.packagingRule.form.detailSpecCode"),
        cell: ({ row }) => row.original.specCode || "-",
      },
      {
        accessorKey: "specName",
        header: t("pages.packagingRule.form.detailSpecName"),
        cell: ({ row }) => row.original.specName || "-",
      },
      {
        accessorKey: "standardQuantity",
        header: t("pages.packagingRule.form.detailStandardQuantity"),
        cell: ({ row }) => row.original.standardQuantity || "-",
      },
      {
        accessorKey: "maxQuantity",
        header: t("pages.packagingRule.form.detailMaxQuantity"),
        cell: ({ row }) => row.original.maxQuantity || "-",
      },
      {
        accessorKey: "packagingMethod",
        header: t("pages.packagingRule.form.detailPackagingMethod"),
        cell: ({ row }) =>
          row.original.packagingMethod === "manual"
            ? packagingMethodManualLabel
            : packagingMethodAutoLabel,
      },
      {
        id: "actions",
        header: t("pages.packagingRule.table.actions"),
        cell: ({ row }) => {
          const actionIndex = row.original.index;
          return (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                data-testid={`packaging-rule-detail-edit-${actionIndex}`}
                onClick={() => handleEdit(actionIndex)}
              >
                {editLabel}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                data-testid={`packaging-rule-detail-delete-${actionIndex}`}
                onClick={() => handleDelete(actionIndex)}
              >
                {deleteLabel}
              </Button>
            </div>
          );
        },
      },
    ],
    [
      t,
      editLabel,
      deleteLabel,
      packagingMethodAutoLabel,
      packagingMethodManualLabel,
      handleEdit,
      handleDelete,
    ],
  );

  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <DataTable<PackagingRuleDetailRowVM, unknown>
      columns={columns}
      data={rows}
      getRowId={(row) => String(row.index)}
      emptyLabel={emptyLabel}
      rowNumber={false}
      className="rounded-md border"
    />
  );
}
