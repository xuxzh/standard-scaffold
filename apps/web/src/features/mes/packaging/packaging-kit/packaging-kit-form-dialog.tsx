import {
  CheckIcon,
  ChevronLeftIcon,
  CirclePlusIcon,
  RotateCcwIcon,
  TrashIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import type {
  PackagingKitFormValues,
  PackagingKitMaterialOption,
  PackagingKitRecord,
} from "@/features/mes/packaging/packaging-kit/packaging-kit-contract";
import { isValidPackagingKitChildQuantity } from "@/features/mes/packaging/packaging-kit/packaging-kit-contract";
import { PackagingKitMaterialDialog } from "@/features/mes/packaging/packaging-kit/packaging-kit-material-dialog";
import { MaterialUnitSelect } from "@/features/mes/material-unit/material-unit-select";
import { useMaterialUnitOptionsQuery } from "@/features/mes/material-unit/material-unit-queries";
import { useFormSessionInitializer } from "@/hooks/use-form-session-initializer";

type PackagingKitFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  record: PackagingKitRecord | null;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PackagingKitFormValues) => Promise<void> | void;
};

function getDefaultValues(
  record: PackagingKitRecord | null,
  defaultUnit: string,
): PackagingKitFormValues {
  if (!record) {
    return {
      kitCode: "",
      kitName: "",
      mainMaterialCode: "",
      mainMaterialName: "",
      unit: defaultUnit,
      isVirtualMain: false,
      children: [],
      remark: "",
    };
  }

  return {
    kitCode: record.kitCode,
    kitName: record.kitName,
    mainMaterialCode: record.mainMaterialCode,
    mainMaterialName: record.mainMaterialName,
    unit: record.unit,
    isVirtualMain: record.isVirtualMain,
    children: record.children.map((child) => ({
      code: child.code,
      name: child.name,
      quantity: String(child.quantity),
      unit: child.unit,
    })),
    remark: record.remark,
  };
}

function resolveDefaultUnitValue(
  defaultUnit: string,
  unitOptions: Array<{
    materialUnitCode: string;
    materialUnitName: string;
  }>,
) {
  const matchedOption = unitOptions.find(
    (option) =>
      option.materialUnitCode === defaultUnit ||
      option.materialUnitName === defaultUnit,
  );

  return matchedOption?.materialUnitCode ?? defaultUnit;
}

export function PackagingKitFormDialog({
  open,
  mode,
  record,
  submitting,
  onOpenChange,
  onSubmit,
}: PackagingKitFormDialogProps) {
  const { t } = useTranslation("common");
  const [materialMode, setMaterialMode] = useState<"main" | "children" | null>(
    null,
  );
  const defaultUnit = t("pages.packagingKit.form.defaultUnit", {
    defaultValue: t("pages.packagingKit.table.defaultUnit"),
  });
  const unitOptionsQuery = useMaterialUnitOptionsQuery();
  const unitOptions = unitOptionsQuery.data ?? [];
  const resolvedDefaultUnit = useMemo(
    () => resolveDefaultUnitValue(defaultUnit, unitOptions),
    [defaultUnit, unitOptions],
  );
  const formSchema = useMemo(
    () =>
      z
        .object({
          kitCode: z
            .string()
            .trim()
            .min(1, t("pages.packagingKit.validation.kitCodeRequired"))
            .max(32, t("pages.packagingKit.validation.kitCodeMax")),
          kitName: z
            .string()
            .trim()
            .min(1, t("pages.packagingKit.validation.kitNameRequired"))
            .max(64, t("pages.packagingKit.validation.kitNameMax")),
          mainMaterialCode: z
            .string()
            .trim()
            .min(
              1,
              t("pages.packagingKit.validation.mainMaterialCodeRequired"),
            ),
          mainMaterialName: z
            .string()
            .trim()
            .min(
              1,
              t("pages.packagingKit.validation.mainMaterialNameRequired"),
            ),
          unit: z
            .string()
            .trim()
            .min(1, t("pages.packagingKit.validation.unitRequired"))
            .max(16, t("pages.packagingKit.validation.unitMax")),
          isVirtualMain: z.boolean(),
          children: z
            .array(
              z.object({
                code: z.string().trim().min(1),
                name: z.string().trim().min(1),
                quantity: z
                  .string()
                  .trim()
                  .min(
                    1,
                    t("pages.packagingKit.validation.childQuantityRequired"),
                  )
                  .refine(
                    (value) => isValidPackagingKitChildQuantity(value),
                    t("pages.packagingKit.validation.childQuantityPositive"),
                  ),
                unit: z
                  .string()
                  .trim()
                  .min(1, t("pages.packagingKit.validation.childUnitRequired"))
                  .max(16, t("pages.packagingKit.validation.unitMax")),
              }),
            )
            .min(1, t("pages.packagingKit.validation.childrenMin")),
          remark: z
            .string()
            .max(200, t("pages.packagingKit.validation.remarkMax")),
        })
        .superRefine((values, context) => {
          const childCodes = new Set<string>();

          values.children.forEach((child, index) => {
            if (child.code === values.mainMaterialCode) {
              context.addIssue({
                code: "custom",
                path: ["children", index, "code"],
                message: t("pages.packagingKit.validation.childMatchesMain"),
              });
            }

            if (childCodes.has(child.code)) {
              context.addIssue({
                code: "custom",
                path: ["children", index, "code"],
                message: t("pages.packagingKit.validation.childDuplicate"),
              });
              return;
            }

            childCodes.add(child.code);
          });
        }),
    [t],
  );

  const form = useForm<PackagingKitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(record, resolvedDefaultUnit),
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "children",
    keyName: "fieldKey",
  });
  const currentValues = form.watch();

  useFormSessionInitializer({
    open: open && (record !== null || !unitOptionsQuery.isLoading),
    sessionKey: mode === "create" ? "create" : `edit:${record?.id ?? "unknown"}`,
    initialize: () =>
      form.reset(getDefaultValues(record, resolvedDefaultUnit)),
  });

  function handleMainMaterialSelect(rows: PackagingKitMaterialOption[]) {
    const selected = rows[0];

    if (!selected) {
      return;
    }

    form.setValue("mainMaterialCode", selected.code, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("mainMaterialName", selected.name, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("unit", selected.unit || form.getValues("unit"), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleChildrenSelect(rows: PackagingKitMaterialOption[]) {
    const existingCodes = new Set(
      form.getValues("children").map((child) => child.code),
    );
    const nextUnit = form.getValues("unit");
    let duplicateCount = 0;

    rows.forEach((row) => {
      if (existingCodes.has(row.code)) {
        duplicateCount += 1;
        return;
      }

      append({
        code: row.code,
        name: row.name,
        quantity: "1",
        unit: row.unit || nextUnit,
      });
      existingCodes.add(row.code);
    });

    if (duplicateCount > 0) {
      toast.error(
        t("pages.packagingKit.feedback.childrenDuplicateSkipped", {
          count: duplicateCount,
        }),
      );
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[min(100%-2rem,72rem)] max-w-none gap-0 overflow-hidden p-0"
          data-testid="packaging-kit-form-dialog"
        >
          <DialogHeader className="border-b px-8 py-6">
            <DialogTitle className="text-3xl font-semibold">
              {mode === "create"
                ? t("pages.packagingKit.form.createTitle")
                : t("pages.packagingKit.form.editTitle")}
            </DialogTitle>
          </DialogHeader>

          <form
            id="packaging-kit-form"
            className="flex flex-col"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
            })}
          >
            <FieldGroup className="max-h-[calc(100vh-18rem)] overflow-y-auto px-8 py-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Controller
                  name="kitCode"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="packaging-kit-form-kit-code">
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                        {t("pages.packagingKit.filters.kitCode")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="packaging-kit-form-kit-code"
                        data-testid="packaging-kit-form-kit-code"
                        aria-invalid={fieldState.invalid}
                        disabled={mode === "edit"}
                        placeholder={t(
                          "pages.packagingKit.filters.kitCodePlaceholder",
                        )}
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  )}
                />

                <Controller
                  name="kitName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="packaging-kit-form-kit-name">
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                        {t("pages.packagingKit.filters.kitName")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="packaging-kit-form-kit-name"
                        data-testid="packaging-kit-form-kit-name"
                        aria-invalid={fieldState.invalid}
                        placeholder={t(
                          "pages.packagingKit.filters.kitNamePlaceholder",
                        )}
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  )}
                />

                <Controller
                  name="mainMaterialCode"
                  control={form.control}
                  render={({ fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="packaging-kit-form-main-material-code">
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                        {t("pages.packagingKit.form.mainMaterialCode")}
                      </FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          id="packaging-kit-form-main-material-code"
                          value={currentValues.mainMaterialCode}
                          readOnly
                        />
                        <Button
                          data-testid="packaging-kit-form-select-main-material"
                          type="button"
                          variant="outline"
                          onClick={() => setMaterialMode("main")}
                        >
                          {t("pages.packagingKit.actions.selectMainMaterial")}
                        </Button>
                      </div>
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  )}
                />

                <Controller
                  name="mainMaterialName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="packaging-kit-form-main-material-name">
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                        {t("pages.packagingKit.form.mainMaterialName")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="packaging-kit-form-main-material-name"
                        readOnly
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  )}
                />

                <Controller
                  name="unit"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <MaterialUnitSelect
                      id="packaging-kit-form-unit"
                      data-testid="packaging-kit-form-unit"
                      options={unitOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      error={fieldState.error}
                      label={t("pages.packagingKit.form.unit")}
                      required
                    />
                  )}
                />

                <Controller
                  name="isVirtualMain"
                  control={form.control}
                  render={({ field }) => (
                    <Field
                      orientation="horizontal"
                      className="items-center gap-4 pt-8"
                    >
                      <FieldLabel htmlFor="packaging-kit-form-virtual-main">
                        {t("pages.packagingKit.form.isVirtualMain")}
                      </FieldLabel>
                      <input
                        id="packaging-kit-form-virtual-main"
                        checked={field.value}
                        type="checkbox"
                        onChange={(event) =>
                          field.onChange(event.target.checked)
                        }
                      />
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="remark"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="packaging-kit-form-remark">
                      {t("pages.packagingKit.form.remark")}
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id="packaging-kit-form-remark"
                      placeholder={t(
                        "pages.packagingKit.form.remarkPlaceholder",
                      )}
                      rows={3}
                    />
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </Field>
                )}
              />

              <FieldGroup className="gap-4 rounded-md border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {t("pages.packagingKit.form.childrenTitle")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("pages.packagingKit.form.childrenDescription")}
                    </p>
                  </div>
                  <Button
                    data-testid="packaging-kit-form-add-children"
                    type="button"
                    onClick={() => setMaterialMode("children")}
                  >
                    <CirclePlusIcon data-icon="inline-start" />
                    {t("pages.packagingKit.actions.addChildren")}
                  </Button>
                </div>

                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-4 py-3">
                          {t("pages.packagingKit.form.childCode")}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.packagingKit.form.childName")}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.packagingKit.form.childQuantity")}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.packagingKit.form.childUnit")}
                        </th>
                        <th className="px-4 py-3">
                          {t("pages.packagingKit.table.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.length === 0 ? (
                        <tr className="border-t">
                          <td
                            colSpan={5}
                            className="px-4 py-6 text-center text-sm text-muted-foreground"
                          >
                            {t("pages.packagingKit.form.noChildren")}
                          </td>
                        </tr>
                      ) : (
                        fields.map((field, index) => {
                          const childCode =
                            currentValues.children[index]?.code || field.code;
                          const childCodeError =
                            form.formState.errors.children?.[index]?.code;

                          return (
                            <tr key={field.fieldKey} className="border-t">
                              <td className="px-4 py-3 align-top">
                                <div>
                                  <span>
                                    {currentValues.children[index]?.code}
                                  </span>
                                  {childCodeError ? (
                                    <FieldError errors={[childCodeError]} />
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {currentValues.children[index]?.name}
                              </td>
                              <td className="px-4 py-3">
                                <Controller
                                  name={`children.${index}.quantity`}
                                  control={form.control}
                                  render={({
                                    field: quantityField,
                                    fieldState,
                                  }) => (
                                    <div>
                                      <Input
                                        {...quantityField}
                                        data-testid={`packaging-kit-form-child-quantity-${childCode}`}
                                        aria-invalid={fieldState.invalid}
                                        inputMode="numeric"
                                        placeholder={t(
                                          "pages.packagingKit.form.childQuantityPlaceholder",
                                        )}
                                      />
                                      {fieldState.invalid ? (
                                        <FieldError
                                          errors={[fieldState.error]}
                                        />
                                      ) : null}
                                    </div>
                                  )}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Controller
                                  name={`children.${index}.unit`}
                                  control={form.control}
                                  render={({
                                    field: unitField,
                                    fieldState,
                                  }) => (
                                    <div>
                                      <Input
                                        {...unitField}
                                        aria-invalid={fieldState.invalid}
                                      />
                                      {fieldState.invalid ? (
                                        <FieldError
                                          errors={[fieldState.error]}
                                        />
                                      ) : null}
                                    </div>
                                  )}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  type="button"
                                  variant="link"
                                  className="px-0 text-destructive"
                                  onClick={() => remove(index)}
                                >
                                  <TrashIcon data-icon="inline-start" />
                                  {t("pages.packagingKit.actions.delete")}
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {form.formState.errors.children ? (
                  <FieldError
                    errors={[
                      form.formState.errors.children as { message?: string },
                    ]}
                  />
                ) : null}
              </FieldGroup>
            </FieldGroup>

            <DialogFooter className="border-t px-8 py-6 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                <ChevronLeftIcon data-icon="inline-start" />
                {t("pages.packagingKit.actions.back")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() =>
                  form.reset(getDefaultValues(record, defaultUnit))
                }
              >
                <RotateCcwIcon data-icon="inline-start" />
                {t("pages.packagingKit.actions.reset")}
              </Button>
              <Button
                data-testid="packaging-kit-form-submit"
                type="submit"
                form="packaging-kit-form"
                disabled={submitting}
              >
                <CheckIcon data-icon="inline-start" />
                {submitting
                  ? t("pages.packagingKit.form.submitting")
                  : t("pages.packagingKit.actions.confirm")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PackagingKitMaterialDialog
        open={materialMode !== null}
        mode={materialMode ?? "main"}
        selectedCodes={
          materialMode === "main"
            ? currentValues.mainMaterialCode
              ? [currentValues.mainMaterialCode]
              : []
            : currentValues.children.map((child) => child.code)
        }
        selectedItems={
          materialMode === "main"
            ? currentValues.mainMaterialCode && currentValues.mainMaterialName
              ? [
                  {
                    code: currentValues.mainMaterialCode,
                    name: currentValues.mainMaterialName,
                    unit: currentValues.unit,
                    typeName: "",
                  },
                ]
              : []
            : currentValues.children.map((child) => ({
                code: child.code,
                name: child.name,
                unit: child.unit,
                typeName: "",
              }))
        }
        onConfirm={(rows) => {
          if (materialMode === "main") {
            handleMainMaterialSelect(rows);
            return;
          }

          handleChildrenSelect(rows);
        }}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setMaterialMode(null);
          }
        }}
      />
    </>
  );
}
