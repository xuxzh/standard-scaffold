import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PackagingRuleConfigFormValues } from "@/features/wms/packaging/packaging-rule/packaging-rule-contract";

type PackagingRuleConfigDialogProps = {
  open: boolean;
  ruleCode: string;
  ruleName: string;
  values: PackagingRuleConfigFormValues | null;
  loading: boolean;
  errorMessage: string | null;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onSubmit: (values: PackagingRuleConfigFormValues) => Promise<void> | void;
};

type ConfigSection = "mixingRule" | "labelPrintRule" | "sealingRule" | "exceptionRule";
type MixingRuleFieldName = keyof PackagingRuleConfigFormValues["mixingRule"];
type SealingRuleFieldName = Exclude<keyof PackagingRuleConfigFormValues["sealingRule"], "timeoutAlert">;

const configSections: ConfigSection[] = [
  "mixingRule",
  "labelPrintRule",
  "sealingRule",
  "exceptionRule",
];

const mixingRuleFields: Array<{
  name: `mixingRule.${MixingRuleFieldName}`;
  testId: string;
  labelKey: string;
}> = [
  {
    name: "mixingRule.forbidDifferentProduct",
    testId: "packaging-rule-config-forbid-different-product",
    labelKey: "pages.packagingRule.config.fields.forbidDifferentProduct",
  },
  {
    name: "mixingRule.forbidDifferentBatch",
    testId: "packaging-rule-config-forbid-different-batch",
    labelKey: "pages.packagingRule.config.fields.forbidDifferentBatch",
  },
  {
    name: "mixingRule.forbidDifferentWorkOrder",
    testId: "packaging-rule-config-forbid-different-work-order",
    labelKey: "pages.packagingRule.config.fields.forbidDifferentWorkOrder",
  },
  {
    name: "mixingRule.forbidDifferentProductionTask",
    testId: "packaging-rule-config-forbid-different-production-task",
    labelKey: "pages.packagingRule.config.fields.forbidDifferentProductionTask",
  },
  {
    name: "mixingRule.forbidCrossQualityStatus",
    testId: "packaging-rule-config-forbid-cross-quality-status",
    labelKey: "pages.packagingRule.config.fields.forbidCrossQualityStatus",
  },
];

const sealingRuleFields: Array<{
  name: `sealingRule.${SealingRuleFieldName}`;
  labelKey: string;
}> = [
  {
    name: "sealingRule.autoSealOnWorkOrderComplete",
    labelKey: "pages.packagingRule.config.fields.autoSealOnWorkOrderComplete",
  },
  {
    name: "sealingRule.autoSealOnTaskComplete",
    labelKey: "pages.packagingRule.config.fields.autoSealOnTaskComplete",
  },
  {
    name: "sealingRule.autoSealOnFullBox",
    labelKey: "pages.packagingRule.config.fields.autoSealOnFullBox",
  },
];

export function PackagingRuleConfigDialog({
  open,
  ruleCode,
  ruleName,
  values,
  loading,
  errorMessage,
  submitting,
  onOpenChange,
  onRetry,
  onSubmit,
}: PackagingRuleConfigDialogProps) {
  const { t } = useTranslation("common");
  const [activeSection, setActiveSection] = useState<ConfigSection>("mixingRule");
  const schema = z.object({
    ruleCode: z.string(),
    mixingRule: z.object({
      forbidDifferentProduct: z.boolean(),
      forbidDifferentBatch: z.boolean(),
      forbidDifferentWorkOrder: z.boolean(),
      forbidDifferentProductionTask: z.boolean(),
      forbidCrossQualityStatus: z.boolean(),
    }),
    labelPrintRule: z.object({
      reprintLimit: z
        .string()
        .trim()
        .refine(
          (value) => Number.isInteger(Number(value)) && Number(value) >= 0,
          t("pages.packagingRule.validation.nonNegativeInteger"),
        ),
      defaultTemplate: z.string().max(64, t("pages.packagingRule.validation.templateMax")),
    }),
    sealingRule: z.object({
      timeoutAlert: z
        .string()
        .trim()
        .refine(
          (value) => Number.isInteger(Number(value)) && Number(value) >= 0,
          t("pages.packagingRule.validation.nonNegativeInteger"),
        ),
      autoSealOnWorkOrderComplete: z.boolean(),
      autoSealOnTaskComplete: z.boolean(),
      autoSealOnFullBox: z.boolean(),
    }),
    exceptionRule: z.object({
      forceClearOnCycleTool: z.boolean(),
    }),
  });
  const form = useForm<PackagingRuleConfigFormValues>({
    resolver: zodResolver(schema),
    defaultValues: values ?? undefined,
  });

  useEffect(() => {
    if (values) {
      form.reset(values);
    }
  }, [form, values]);

  useEffect(() => {
    if (open) {
      setActiveSection("mixingRule");
    }
  }, [open, ruleCode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100%-2rem,56rem)] max-w-none gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-8 py-6">
          <DialogTitle>{t("pages.packagingRule.config.title")}</DialogTitle>
          <DialogDescription>{t("pages.packagingRule.config.description")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="px-8 py-6 text-sm text-muted-foreground">
            {t("pages.packagingRule.config.loading")}
          </div>
        ) : errorMessage ? (
          <div className="space-y-4 px-8 py-6">
            <p className="text-sm text-destructive">
              {t("pages.packagingRule.config.errorTitle")}
            </p>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button type="button" variant="outline" onClick={onRetry}>
              {t("pages.packagingRule.actions.retry")}
            </Button>
          </div>
        ) : values ? (
          <form
            id="packaging-rule-config-form"
            className="flex flex-col"
            onSubmit={form.handleSubmit(async (nextValues) => {
              await onSubmit(nextValues);
            })}
          >
            <FieldGroup className="max-h-[calc(100vh-18rem)] overflow-y-auto px-8 py-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="packaging-rule-config-rule-code">
                    {t("pages.packagingRule.filters.ruleCode")}
                  </FieldLabel>
                  <Input id="packaging-rule-config-rule-code" value={ruleCode} readOnly />
                </Field>
                <Field>
                  <FieldLabel htmlFor="packaging-rule-config-rule-name">
                    {t("pages.packagingRule.filters.ruleName")}
                  </FieldLabel>
                  <Input id="packaging-rule-config-rule-name" value={ruleName} readOnly />
                </Field>
              </div>

              <div className="flex flex-wrap gap-2">
                {configSections.map((section) => {
                  const active = activeSection === section;

                  return (
                    <Button
                      key={section}
                      type="button"
                      variant={active ? "secondary" : "outline"}
                      aria-pressed={active}
                      onClick={() => setActiveSection(section)}
                    >
                      {t(`pages.packagingRule.config.sections.${section}`)}
                    </Button>
                  );
                })}
              </div>

              {activeSection === "mixingRule" ? (
                <section className="space-y-4 rounded-md border p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-medium">
                    {t("pages.packagingRule.config.sections.mixingRule")}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        for (const field of mixingRuleFields) {
                          form.setValue(field.name, true);
                        }
                      }}
                    >
                      {t("pages.packagingRule.config.selectAll")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        for (const field of mixingRuleFields) {
                          form.setValue(field.name, false);
                        }
                      }}
                    >
                      {t("pages.packagingRule.config.clearAll")}
                    </Button>
                  </div>
                </div>

                {mixingRuleFields.map((fieldConfig) => (
                  <Controller
                    key={fieldConfig.testId}
                    name={fieldConfig.name}
                    control={form.control}
                    render={({ field }) => (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          data-testid={fieldConfig.testId}
                          type="checkbox"
                          checked={Boolean(field.value)}
                          onChange={(event) => field.onChange(event.target.checked)}
                        />
                        <span>{t(fieldConfig.labelKey)}</span>
                      </label>
                    )}
                  />
                ))}
              </section>
              ) : null}

              {activeSection === "labelPrintRule" ? (
                <section className="space-y-4 rounded-md border p-4">
                <h3 className="text-base font-medium">
                  {t("pages.packagingRule.config.sections.labelPrintRule")}
                </h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Controller
                    name="labelPrintRule.reprintLimit"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="packaging-rule-config-reprint-limit">
                          {t("pages.packagingRule.config.fields.reprintLimit")}
                        </FieldLabel>
                        <Input
                          {...field}
                          id="packaging-rule-config-reprint-limit"
                          data-testid="packaging-rule-config-reprint-limit"
                          aria-invalid={fieldState.invalid}
                          inputMode="numeric"
                        />
                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                      </Field>
                    )}
                  />
                  <Controller
                    name="labelPrintRule.defaultTemplate"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="packaging-rule-config-default-template">
                          {t("pages.packagingRule.config.fields.defaultTemplate")}
                        </FieldLabel>
                        <Input
                          {...field}
                          id="packaging-rule-config-default-template"
                          data-testid="packaging-rule-config-default-template"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                      </Field>
                    )}
                  />
                </div>
              </section>
              ) : null}

              {activeSection === "sealingRule" ? (
                <section className="space-y-4 rounded-md border p-4">
                <h3 className="text-base font-medium">
                  {t("pages.packagingRule.config.sections.sealingRule")}
                </h3>
                <Controller
                  name="sealingRule.timeoutAlert"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="packaging-rule-config-timeout-alert">
                        {t("pages.packagingRule.config.fields.timeoutAlert")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="packaging-rule-config-timeout-alert"
                        data-testid="packaging-rule-config-timeout-alert"
                        aria-invalid={fieldState.invalid}
                        inputMode="numeric"
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
                {sealingRuleFields.map((fieldConfig) => (
                  <Controller
                    key={fieldConfig.name}
                    name={fieldConfig.name}
                    control={form.control}
                    render={({ field }) => (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(field.value)}
                          onChange={(event) => field.onChange(event.target.checked)}
                        />
                        <span>{t(fieldConfig.labelKey)}</span>
                      </label>
                    )}
                  />
                ))}
              </section>
              ) : null}

              {activeSection === "exceptionRule" ? (
                <section className="space-y-4 rounded-md border p-4">
                <h3 className="text-base font-medium">
                  {t("pages.packagingRule.config.sections.exceptionRule")}
                </h3>
                <Controller
                  name="exceptionRule.forceClearOnCycleTool"
                  control={form.control}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(field.value)}
                        onChange={(event) => field.onChange(event.target.checked)}
                      />
                      <span>{t("pages.packagingRule.config.fields.forceClearOnCycleTool")}</span>
                    </label>
                  )}
                />
              </section>
              ) : null}
            </FieldGroup>

            <DialogFooter className="border-t px-8 py-6 sm:flex-row sm:justify-end">
              <Button
                data-testid="packaging-rule-config-reset"
                type="button"
                variant="outline"
                onClick={() => form.reset(values)}
              >
                <RotateCcwIcon data-icon="inline-start" />
                {t("pages.packagingRule.actions.reset")}
              </Button>
              <Button
                data-testid="packaging-rule-config-submit"
                type="submit"
                form="packaging-rule-config-form"
                disabled={submitting}
              >
                <CheckIcon data-icon="inline-start" />
                {t("pages.packagingRule.actions.confirm")}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}