import { CheckIcon, ChevronLeftIcon, RotateCcwIcon } from "lucide-react";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  PackagingTypeFormValues,
  PackagingTypeRecord,
} from "@/features/mes/packaging/packaging-type/packaging-contract";
import { useFormSessionInitializer } from "@/hooks/use-form-session-initializer";

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
    defaultValues: getDefaultValues(record),
  });
  const { reset } = form;

  useFormSessionInitializer({
    open,
    sessionKey: mode === "create" ? "create" : `edit:${record?.id ?? "unknown"}`,
    initialize: () => reset(getDefaultValues(record)),
  });

  const recyclableSwitchId = "packaging-type-form-is-recyclable";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="packaging-type-form-sheet"
        className="w-[min(100%-2rem,56rem)] max-w-none gap-0 overflow-hidden p-0"
        showCloseButton
      >
        <DialogHeader className="border-b px-8 py-6">
          <DialogTitle>
            {mode === "create"
              ? t("pages.packagingType.form.createTitle")
              : t("pages.packagingType.form.editTitle")}
          </DialogTitle>
        </DialogHeader>

        <form
          id="packaging-type-form"
          className="flex flex-col"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <FieldGroup className="max-h-[calc(100vh-18rem)] overflow-y-auto px-8 py-6">
            <Controller
              name="typeCode"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="packaging-type-form-type-code">
                    <span aria-hidden="true" className="text-destructive">*</span>
                    {t("pages.packagingType.filters.typeCode")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="packaging-type-form-type-code"
                    data-testid="packaging-type-form-type-code"
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
                    <span aria-hidden="true" className="text-destructive">*</span>
                    {t("pages.packagingType.filters.typeName")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="packaging-type-form-type-name"
                    data-testid="packaging-type-form-type-name"
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
                <Field orientation="horizontal" className="items-center gap-4">
                  <FieldLabel htmlFor={recyclableSwitchId}>
                    {t("pages.packagingType.filters.isRecyclable")}
                  </FieldLabel>
                  <Switch
                    id={recyclableSwitchId}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-label={t("pages.packagingType.filters.isRecyclable")}
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
                    data-testid="packaging-type-form-description"
                    aria-invalid={fieldState.invalid}
                    placeholder={t("pages.packagingType.form.descriptionPlaceholder")}
                    rows={4}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className="border-t px-8 py-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <ChevronLeftIcon data-icon="inline-start" />
              {t("pages.packagingType.actions.back")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => form.reset(getDefaultValues(record))}
            >
              <RotateCcwIcon data-icon="inline-start" />
              {t("pages.packagingType.actions.reset")}
            </Button>
            <Button
              data-testid="packaging-type-form-submit"
              type="submit"
              form="packaging-type-form"
              disabled={submitting}
            >
              <CheckIcon data-icon="inline-start" />
              {t("pages.packagingType.actions.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
