import { SearchIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { AppDialog } from "@/components/app-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getFieldErrorMessage } from "@/lib/form-errors";
import type {
  MaterialOption,
  MaterialPackagingRelationDetailFormValues,
  MaterialPackagingRelationFormValues,
  MaterialPackagingRelationRecord,
  PackagingRuleOption,
} from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";
import {
  MaterialPickerField,
  type MaterialPickerRecord,
} from "@/features/mes/material";
import { MaterialPackagingRelationRuleDialog } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-rule-dialog";
import type { PrintTemplateOption } from "@/features/mes/packaging/print-template/print-template-contract";
import { PrintTemplateSelect } from "@/features/mes/packaging/print-template/print-template-select";
import { useFormSessionInitializer } from "@/hooks/use-form-session-initializer";

type MaterialPackagingRelationFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  record: MaterialPackagingRelationRecord | null;
  createMaterial?: MaterialOption | null;
  submitting: boolean;
  printTemplateOptions?: PrintTemplateOption[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    values: MaterialPackagingRelationFormValues,
  ) => Promise<void> | void;
};

function getDefaultValues(
  record: MaterialPackagingRelationRecord | null,
  createMaterial: MaterialOption | null,
): MaterialPackagingRelationFormValues {
  if (!record) {
    return {
      materialCode: createMaterial?.materialCode ?? "",
      materialName: createMaterial?.materialName ?? "",
      packagingRuleCode: "",
      packagingRuleName: "",
      remark: "",
      details: [],
    };
  }

  return {
    materialCode: record.materialCode,
    materialName: record.materialName,
    packagingRuleCode: record.packagingRuleCode,
    packagingRuleName: record.packagingRuleName,
    remark: record.remark,
    details: record.details.map((detail) => ({
      levelSequence: String(detail.levelSequence ?? ""),
      packagingLevelCode: detail.packagingLevelCode,
      packagingLevelName: detail.packagingLevelName,
      specCode: detail.specCode,
      specName: detail.specName,
      quantity: String(detail.quantity),
      unit: detail.unit,
      packagingTypeName: detail.packagingTypeName,
      boxLabelPrintTemplate: detail.boxLabelPrintTemplate,
      packingListPrintTemplate: detail.packingListPrintTemplate,
    })),
  };
}

export function MaterialPackagingRelationFormDialog({
  open,
  mode,
  record,
  createMaterial = null,
  submitting,
  printTemplateOptions = [],
  onOpenChange,
  onSubmit,
}: MaterialPackagingRelationFormDialogProps) {
  const { t } = useTranslation("common");
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  const formSchema = useMemo(
    () =>
      z.object({
        materialCode: z
          .string()
          .trim()
          .min(1, t("pages.materialPackagingRelation.validation.materialRequired")),
        materialName: z
          .string()
          .trim()
          .min(1, t("pages.materialPackagingRelation.validation.materialNameRequired")),
        packagingRuleCode: z
          .string()
          .trim()
          .min(1, t("pages.materialPackagingRelation.validation.ruleRequired")),
        packagingRuleName: z
          .string()
          .trim()
          .min(1, t("pages.materialPackagingRelation.validation.ruleNameRequired")),
        remark: z
          .string()
          .max(200, t("pages.materialPackagingRelation.validation.remarkMax")),
        details: z
          .array(
            z.object({
              levelSequence: z
                .string()
                .trim()
                .min(1, t("pages.materialPackagingRelation.validation.levelSequenceRequired"))
                .refine(
                  (value) =>
                    Number.isInteger(Number(value)) && Number(value) >= 1,
                  t("pages.materialPackagingRelation.validation.levelSequencePositive"),
                ),
              packagingLevelCode: z.string(),
              packagingLevelName: z.string(),
              specCode: z.string(),
              specName: z.string(),
              quantity: z
                .string()
                .trim()
                .min(1, t("pages.materialPackagingRelation.validation.quantityRequired"))
                .refine(
                  (value) =>
                    Number.isInteger(Number(value)) && Number(value) >= 1,
                  t("pages.materialPackagingRelation.validation.quantityPositive"),
                ),
              unit: z
                .string()
                .max(16, t("pages.materialPackagingRelation.validation.unitMax")),
              packagingTypeName: z.string(),
              boxLabelPrintTemplate: z
                .string()
                .max(64, t("pages.materialPackagingRelation.validation.templateMax")),
              packingListPrintTemplate: z
                .string()
                .max(64, t("pages.materialPackagingRelation.validation.templateMax")),
            }),
          )
          .min(1, t("pages.materialPackagingRelation.validation.detailsRequired")),
      }),
    [t],
  );

  const form = useForm<MaterialPackagingRelationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(record, createMaterial),
  });
  const detailFields = useFieldArray({
    control: form.control,
    name: "details",
  });
  const watchedDetails = form.watch("details");
  const detailsErrorMessage = getFieldErrorMessage(
    form.formState.errors.details,
  );

  const resetForm = useCallback(() => {
    form.reset(getDefaultValues(record, createMaterial));
  }, [createMaterial, form, record]);

  useFormSessionInitializer({
    open,
    sessionKey:
      mode === "create"
        ? `create:${createMaterial?.materialCode ?? ""}`
        : `edit:${record?.id ?? "unknown"}`,
    initialize: resetForm,
  });

  function handleMaterialSelected(record: MaterialPickerRecord) {
    form.setValue("materialCode", record.materialCode, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("materialName", record.materialName, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  function handleRuleSelected(rule: PackagingRuleOption) {
    form.setValue("packagingRuleCode", rule.ruleCode);
    form.setValue("packagingRuleName", rule.ruleName);

    // Convert rule details to relation detail form values
    const newDetails: MaterialPackagingRelationDetailFormValues[] =
      rule.details.map((detail) => ({
        levelSequence: String(detail.LevelSequence ?? ""),
        packagingLevelCode: detail.PackagingLevelCode,
        packagingLevelName: detail.PackagingLevelName ?? "",
        specCode: detail.SpecCode,
        specName: detail.SpecName ?? "",
        quantity: String(detail.StandardQuantity),
        unit: detail.Unit ?? "",
        packagingTypeName: detail.PackagingTypeName ?? "",
        boxLabelPrintTemplate: "",
        packingListPrintTemplate: "",
      }));

    // Replace all details
    detailFields.replace(newDetails);
  }

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        title={
          mode === "create"
            ? t("pages.materialPackagingRelation.form.createTitle")
            : t("pages.materialPackagingRelation.form.editTitle")
        }
        description={t("pages.materialPackagingRelation.form.description")}
        testId="material-packaging-relation-form-dialog"
        bodyClassName="max-h-[calc(100vh-18rem)]"
        resetAction={{
          onClick: resetForm,
        }}
        confirmAction={{
          formId: "material-packaging-relation-form",
          disabled: submitting,
          testId: "mpr-form-submit",
        }}
      >
        <form
          id="material-packaging-relation-form"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <FieldGroup className="gap-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Material Code */}
              <Controller
                name="materialCode"
                control={form.control}
                render={({ fieldState }) => {
                  const currentValues = form.watch();
                  const pickerValue: MaterialPickerRecord | null =
                    currentValues.materialCode
                      ? {
                          id: currentValues.materialCode,
                          materialCode: currentValues.materialCode,
                          materialName: currentValues.materialName ?? "",
                          materialSpecification: "",
                          materialType: "",
                          unit: "",
                        }
                      : null;
                  return (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="mpr-form-material-code">
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                        {t(
                          "pages.materialPackagingRelation.form.materialCode",
                        )}
                      </FieldLabel>
                      <MaterialPickerField
                        inputId="mpr-form-material-code"
                        inputTestId="mpr-form-material-code"
                        invalid={fieldState.invalid}
                        value={pickerValue}
                        onChange={handleMaterialSelected}
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  );
                }}
              />

              {/* Material Name (read-only) */}
              <Controller
                name="materialName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="mpr-form-material-name">
                      <span aria-hidden="true" className="text-destructive">
                        *
                      </span>
                      {t(
                        "pages.materialPackagingRelation.form.materialName",
                      )}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="mpr-form-material-name"
                      data-testid="mpr-form-material-name"
                      aria-invalid={fieldState.invalid}
                      readOnly
                      placeholder={t(
                        "pages.materialPackagingRelation.form.materialNamePlaceholder",
                      )}
                    />
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </Field>
                )}
              />

              {/* Packaging Rule Code */}
              <Controller
                name="packagingRuleCode"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="mpr-form-rule-code">
                      <span aria-hidden="true" className="text-destructive">
                        *
                      </span>
                      {t(
                        "pages.materialPackagingRelation.form.packagingRuleCode",
                      )}
                    </FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        {...field}
                        id="mpr-form-rule-code"
                        data-testid="mpr-form-rule-code"
                        aria-invalid={fieldState.invalid}
                        readOnly
                        className="flex-1"
                        placeholder={t(
                          "pages.materialPackagingRelation.form.packagingRuleCodePlaceholder",
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        data-testid="mpr-form-select-rule"
                        onClick={() => setRuleDialogOpen(true)}
                      >
                        <SearchIcon data-icon="inline-start" size={14} />
                        {t(
                          "pages.materialPackagingRelation.actions.select",
                        )}
                      </Button>
                    </div>
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </Field>
                )}
              />

              {/* Packaging Rule Name (read-only) */}
              <Controller
                name="packagingRuleName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="mpr-form-rule-name">
                      <span aria-hidden="true" className="text-destructive">
                        *
                      </span>
                      {t(
                        "pages.materialPackagingRelation.form.packagingRuleName",
                      )}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="mpr-form-rule-name"
                      data-testid="mpr-form-rule-name"
                      aria-invalid={fieldState.invalid}
                      readOnly
                      placeholder={t(
                        "pages.materialPackagingRelation.form.packagingRuleNamePlaceholder",
                      )}
                    />
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </Field>
                )}
              />
            </div>

            {/* Remark */}
            <Controller
              name="remark"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="mpr-form-remark">
                    {t("pages.materialPackagingRelation.form.remark")}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="mpr-form-remark"
                    data-testid="mpr-form-remark"
                    aria-invalid={fieldState.invalid}
                    rows={3}
                    placeholder={t(
                      "pages.materialPackagingRelation.form.remarkPlaceholder",
                    )}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            {/* Details Table */}
            <Field
              data-invalid={Boolean(detailsErrorMessage)}
              className="gap-4 rounded-md border p-4"
            >
              <div>
                <h3 className="text-base font-medium">
                  {t("pages.materialPackagingRelation.form.detailsTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("pages.materialPackagingRelation.form.detailsDescription")}
                </p>
              </div>

              {detailFields.fields.length ? (
                <div className="max-w-full overflow-x-auto">
                  <table className="w-max min-w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-4 py-3">
                          {t(
                            "pages.materialPackagingRelation.table.index",
                          )}
                        </th>
                        <th className="px-4 py-3">
                          {t(
                            "pages.materialPackagingRelation.table.levelSequence",
                          )}
                        </th>
                        <th className="px-4 py-3">
                          {t(
                            "pages.materialPackagingRelation.table.packagingLevelCode",
                          )}
                        </th>
                        <th className="px-4 py-3">
                          {t(
                            "pages.materialPackagingRelation.table.packagingLevelName",
                          )}
                        </th>
                        <th className="px-4 py-3">
                          {t(
                            "pages.materialPackagingRelation.table.specCode",
                          )}
                        </th>
                        <th className="px-4 py-3">
                          {t(
                            "pages.materialPackagingRelation.table.specName",
                          )}
                        </th>
                        <th className="px-4 py-3">
                          <span aria-hidden="true" className="text-destructive">
                            *
                          </span>
                          {t(
                            "pages.materialPackagingRelation.table.quantity",
                          )}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.materialPackagingRelation.table.unit")}
                        </th>
                        <th className="px-4 py-3">
                          {t(
                            "pages.materialPackagingRelation.table.packagingTypeName",
                          )}
                        </th>
                        <th className="px-4 py-3">
                          {t(
                            "pages.materialPackagingRelation.table.boxLabelPrintTemplate",
                          )}
                        </th>
                        <th className="px-4 py-3">
                          {t(
                            "pages.materialPackagingRelation.table.packingListPrintTemplate",
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailFields.fields.map((detailField, index) => {
                        const currentDetail = watchedDetails[index];

                        if (!currentDetail) {
                          return null;
                        }

                        const quantityError =
                          form.formState.errors.details?.[index]?.quantity;
                        const levelSequenceError = getFieldErrorMessage(
                          form.formState.errors.details?.[index]
                            ?.levelSequence,
                        );
                        const quantityErrorMessage =
                          getFieldErrorMessage(quantityError);
                        const unitErrorMessage = getFieldErrorMessage(
                          form.formState.errors.details?.[index]?.unit,
                        );

                        return (
                          <tr key={detailField.id} className="border-t">
                            <td className="px-4 py-3">{index + 1}</td>
                            <td className="px-4 py-3">
                              <div>
                                <span>{currentDetail.levelSequence || "-"}</span>
                                {levelSequenceError ? (
                                  <FieldError
                                    className="mt-1 text-xs"
                                    errors={[
                                      { message: levelSequenceError },
                                    ]}
                                  />
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {currentDetail.packagingLevelCode || "-"}
                            </td>
                            <td className="px-4 py-3">
                              {currentDetail.packagingLevelName || "-"}
                            </td>
                            <td className="px-4 py-3">
                              {currentDetail.specCode || "-"}
                            </td>
                            <td className="px-4 py-3">
                              {currentDetail.specName || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <Input
                                  data-testid={`mpr-form-detail-quantity-${index}`}
                                  aria-label={t(
                                    "pages.materialPackagingRelation.table.quantity",
                                  )}
                                  aria-invalid={Boolean(quantityError)}
                                  inputMode="numeric"
                                  className="w-24"
                                  {...form.register(
                                    `details.${index}.quantity`,
                                  )}
                                />
                                {quantityErrorMessage ? (
                                  <FieldError
                                    className="mt-1 text-xs"
                                    errors={[
                                      { message: quantityErrorMessage },
                                    ]}
                                  />
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <span>{currentDetail.unit || "-"}</span>
                                {unitErrorMessage ? (
                                  <FieldError
                                    className="mt-1 text-xs"
                                    errors={[{ message: unitErrorMessage }]}
                                  />
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {currentDetail.packagingTypeName || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <Controller
                                name={`details.${index}.boxLabelPrintTemplate`}
                                control={form.control}
                                render={({ field, fieldState }) => (
                                  <PrintTemplateSelect
                                    id={`mpr-form-detail-box-label-${index}`}
                                    data-testid={`mpr-form-detail-box-label-${index}`}
                                    options={printTemplateOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    onBlur={field.onBlur}
                                    aria-invalid={fieldState.invalid}
                                    error={fieldState.error}
                                    label=""
                                  />
                                )}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Controller
                                name={`details.${index}.packingListPrintTemplate`}
                                control={form.control}
                                render={({ field, fieldState }) => (
                                  <PrintTemplateSelect
                                    id={`mpr-form-detail-packing-list-${index}`}
                                    data-testid={`mpr-form-detail-packing-list-${index}`}
                                    options={printTemplateOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    onBlur={field.onBlur}
                                    aria-invalid={fieldState.invalid}
                                    error={fieldState.error}
                                    label=""
                                  />
                                )}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  {t(
                    "pages.materialPackagingRelation.form.emptyDetails",
                  )}
                </div>
              )}
              {detailsErrorMessage ? (
                <FieldError errors={[{ message: detailsErrorMessage }]} />
              ) : null}
            </Field>
          </FieldGroup>
        </form>
      </AppDialog>

      {/* Packaging Rule Selection Dialog */}
      <MaterialPackagingRelationRuleDialog
        open={ruleDialogOpen}
        onConfirm={handleRuleSelected}
        onOpenChange={setRuleDialogOpen}
      />
    </>
  );
}