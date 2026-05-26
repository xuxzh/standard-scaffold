import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type {
  PackagingTypeFormValues,
  PackagingTypeRecord,
} from "@/features/wms/packaging/packaging-type/packaging-contract";

const formSchema = z.object({
  typeCode: z.string().trim().min(1, "请输入类型编码").max(32, "类型编码不能超过 32 个字符"),
  typeName: z.string().trim().min(1, "请输入类型名称").max(32, "类型名称不能超过 32 个字符"),
  isRecyclable: z.boolean(),
  description: z.string().max(200, "描述不能超过 200 个字符"),
});

type PackagingTypeFormSheetProps = {
  open: boolean;
  mode: "create" | "edit";
  record: PackagingTypeRecord | null;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PackagingTypeFormValues) => Promise<void> | void;
};

function getDefaultValues(record: PackagingTypeRecord | null): PackagingTypeFormValues {
  if (!record) {
    return {
      typeCode: "",
      typeName: "",
      isRecyclable: false,
      description: "",
    };
  }

  return {
    typeCode: record.typeCode,
    typeName: record.typeName,
    isRecyclable: record.isRecyclable,
    description: record.description,
  };
}

export function PackagingTypeFormSheet({
  open,
  mode,
  record,
  submitting,
  onOpenChange,
  onSubmit,
}: PackagingTypeFormSheetProps) {
  const { t } = useTranslation("common");
  const form = useForm<PackagingTypeFormValues>({
    resolver: zodResolver(formSchema),
    values: getDefaultValues(record),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {mode === "create"
              ? t("pages.packagingType.form.createTitle")
              : t("pages.packagingType.form.editTitle")}
          </SheetTitle>
          <SheetDescription>{t("pages.packagingType.form.descriptionText")}</SheetDescription>
        </SheetHeader>

        <form
          id="packaging-type-form"
          className="flex flex-1 flex-col gap-6 px-4"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <FieldGroup>
            <Controller
              name="typeCode"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="packaging-type-form-type-code">类型编码</FieldLabel>
                  <FieldLabel htmlFor="packaging-type-form-type-code">
                    {t("pages.packagingType.filters.typeCode")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="packaging-type-form-type-code"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    disabled={mode === "edit"}
                    placeholder={t("pages.packagingType.filters.typeCodePlaceholder")}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="typeName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="packaging-type-form-type-name">
                    {t("pages.packagingType.filters.typeName")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="packaging-type-form-type-name"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    placeholder={t("pages.packagingType.filters.typeNamePlaceholder")}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="isRecyclable"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="packaging-type-form-is-recyclable">
                    {t("pages.packagingType.filters.isRecyclable")}
                  </FieldLabel>
                  <input
                    id="packaging-type-form-is-recyclable"
                    type="checkbox"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                </Field>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="packaging-type-form-description">
                    {t("pages.packagingType.table.description")}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="packaging-type-form-description"
                    aria-invalid={fieldState.invalid}
                    placeholder={t("pages.packagingType.form.descriptionPlaceholder")}
                    rows={4}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <SheetFooter className="border-t sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("pages.packagingType.actions.back")}
          </Button>
          <Button type="button" variant="outline" onClick={() => form.reset(getDefaultValues(record))}>
            {t("pages.packagingType.actions.reset")}
          </Button>
          <Button type="submit" form="packaging-type-form" disabled={submitting}>
            {t("pages.packagingType.actions.confirm")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}