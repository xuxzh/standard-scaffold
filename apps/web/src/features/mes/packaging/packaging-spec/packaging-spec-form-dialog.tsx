import {
  CheckIcon,
  ChevronLeftIcon,
  RotateCcwIcon,
  SearchIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  PackagingSpecFormValues,
  PackagingSpecRecord,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-contract";

const emptyPackagingTypeCodeValue = "__empty_packaging_type_code__";
const emptyPackagingLevelCodeValue = "__empty_packaging_level_code__";

type PackagingTypeOption = {
  Id: number;
  TypeCode: string;
  TypeName: string;
};

type PackagingLevelOption = {
  Id: number;
  LevelCode: string;
  LevelName: string;
};

type PackagingSpecFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  record: PackagingSpecRecord | null;
  typeOptions: PackagingTypeOption[];
  levelOptions: PackagingLevelOption[];
  optionsError: boolean;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PackagingSpecFormValues) => Promise<void> | void;
};

function toFixedVolume(length: string, width: string, height: string) {
  const lengthNumber = Number(length);
  const widthNumber = Number(width);
  const heightNumber = Number(height);

  if (lengthNumber <= 0 || widthNumber <= 0 || heightNumber <= 0) {
    return "";
  }

  return String(
    Number(
      ((lengthNumber * widthNumber * heightNumber) / 1_000_000).toFixed(6),
    ),
  );
}

function getDefaultValues(
  record: PackagingSpecRecord | null,
): PackagingSpecFormValues {
  if (!record) {
    return {
      specCode: "",
      specName: "",
      packagingTypeCode: "",
      packagingTypeName: "",
      packagingLevelCode: "",
      packagingLevelName: "",
      barcodeRuleCode: "",
      barcodeRuleName: "",
      length: "",
      width: "",
      height: "",
      volume: "",
      maxWeight: "",
      grossWeight: "",
      tareWeight: "",
      standardCapacity: "",
      stackLimit: "",
      unit: "",
      isEnabled: true,
    };
  }

  return {
    specCode: record.specCode,
    specName: record.specName,
    packagingTypeCode: record.packagingTypeCode,
    packagingTypeName: record.packagingTypeName,
    packagingLevelCode: record.packagingLevelCode,
    packagingLevelName: record.packagingLevelName,
    barcodeRuleCode: record.barcodeRuleCode,
    barcodeRuleName: record.barcodeRuleName,
    length: String(record.length),
    width: String(record.width),
    height: String(record.height),
    volume: String(record.volume),
    maxWeight: String(record.maxWeight),
    grossWeight: String(record.grossWeight),
    tareWeight: String(record.tareWeight),
    standardCapacity: String(record.standardCapacity),
    stackLimit: String(record.stackLimit),
    unit: record.unit,
    isEnabled: record.isEnabled,
  };
}

function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-destructive">
      *
    </span>
  );
}

function getValuesWithDimensionChange(
  values: PackagingSpecFormValues,
  field: "height" | "length" | "width",
  value: string,
  volumeManuallyEdited: boolean,
) {
  const nextValues = { ...values, [field]: value };

  if (volumeManuallyEdited) {
    return nextValues;
  }

  return {
    ...nextValues,
    volume: toFixedVolume(
      nextValues.length,
      nextValues.width,
      nextValues.height,
    ),
  };
}

export function PackagingSpecFormDialog({
  open,
  mode,
  record,
  typeOptions,
  levelOptions,
  optionsError,
  submitting,
  onOpenChange,
  onSubmit,
}: PackagingSpecFormDialogProps) {
  const { t } = useTranslation("common");
  const formKey = `${mode}-${record?.id ?? "new"}-${open ? "open" : "closed"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="packaging-spec-form-dialog"
        className="grid max-h-[90vh] w-[min(calc(100%-2rem),85rem)] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-b px-8 py-6">
          <DialogTitle className="text-2xl font-semibold">
            {mode === "create"
              ? t("pages.packagingSpec.form.createTitle")
              : t("pages.packagingSpec.form.editTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("pages.packagingSpec.form.description")}
          </DialogDescription>
        </DialogHeader>

        <PackagingSpecDialogForm
          key={formKey}
          mode={mode}
          record={record}
          typeOptions={typeOptions}
          levelOptions={levelOptions}
          optionsError={optionsError}
          submitting={submitting}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

function PackagingSpecDialogForm({
  mode,
  record,
  typeOptions,
  levelOptions,
  optionsError,
  submitting,
  onOpenChange,
  onSubmit,
}: Omit<PackagingSpecFormDialogProps, "open">) {
  const { t } = useTranslation("common");
  const [values, setValues] = useState<PackagingSpecFormValues>(
    getDefaultValues(record),
  );
  const [volumeManuallyEdited, setVolumeManuallyEdited] = useState(false);

  function handleReset() {
    setValues(getDefaultValues(record));
    setVolumeManuallyEdited(false);
  }

  return (
    <form
      id="packaging-spec-form"
      className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(values);
      }}
    >
          <div className="min-h-0 overflow-y-auto px-8 py-6">
            {optionsError ? (
              <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {t("pages.packagingSpec.feedback.optionsLoadFailed")}
              </div>
            ) : null}

            <FieldGroup className="gap-6">
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="packaging-spec-form-spec-code">
                    <RequiredMark />
                    {t("pages.packagingSpec.filters.specCode")}
                  </FieldLabel>
                  <Input
                    id="packaging-spec-form-spec-code"
                    data-testid="packaging-spec-form-spec-code"
                    aria-label={t("pages.packagingSpec.filters.specCode")}
                    value={values.specCode}
                    autoComplete="off"
                    disabled={mode === "edit"}
                    placeholder={t("pages.packagingSpec.form.inputPlaceholder")}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        specCode: event.target.value,
                      }))
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="packaging-spec-form-spec-name">
                    <RequiredMark />
                    {t("pages.packagingSpec.filters.specName")}
                  </FieldLabel>
                  <Input
                    id="packaging-spec-form-spec-name"
                    data-testid="packaging-spec-form-spec-name"
                    aria-label={t("pages.packagingSpec.filters.specName")}
                    value={values.specName}
                    autoComplete="off"
                    placeholder={t("pages.packagingSpec.form.inputPlaceholder")}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        specName: event.target.value,
                      }))
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="packaging-spec-form-packaging-type-code">
                    <RequiredMark />
                    {t("pages.packagingSpec.filters.packagingTypeCode")}
                  </FieldLabel>
                  <Select
                    value={values.packagingTypeCode}
                    onValueChange={(value) =>
                      setValues((current) => {
                        const packagingTypeCode =
                          value === emptyPackagingTypeCodeValue ? "" : value;
                        const packagingTypeName =
                          typeOptions.find(
                            (option) =>
                              option.TypeCode === packagingTypeCode,
                          )?.TypeName ?? "";

                        return {
                          ...current,
                          packagingTypeCode,
                          packagingTypeName,
                        };
                      })
                    }
                  >
                    <SelectTrigger
                      id="packaging-spec-form-packaging-type-code"
                      data-testid="packaging-spec-form-packaging-type-code"
                      aria-label={t(
                        "pages.packagingSpec.filters.packagingTypeCode",
                      )}
                      className="w-full"
                    >
                      <SelectValue
                        placeholder={t(
                          "pages.packagingSpec.form.selectPlaceholder",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={emptyPackagingTypeCodeValue}>
                          {t("pages.packagingSpec.form.selectPlaceholder")}
                        </SelectItem>
                        {typeOptions.map((option) => (
                          <SelectItem key={option.Id} value={option.TypeCode}>
                            {option.TypeCode}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="packaging-spec-form-packaging-type-name">
                    {t("pages.packagingSpec.form.packagingTypeName")}
                  </FieldLabel>
                  <Input
                    id="packaging-spec-form-packaging-type-name"
                    value={values.packagingTypeName}
                    readOnly
                    className="bg-muted/40"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="packaging-spec-form-packaging-level-code">
                    <RequiredMark />
                    {t("pages.packagingSpec.form.packagingLevelCode")}
                  </FieldLabel>
                  <Select
                    value={values.packagingLevelCode}
                    onValueChange={(value) =>
                      setValues((current) => {
                        const packagingLevelCode =
                          value === emptyPackagingLevelCodeValue ? "" : value;
                        const packagingLevelName =
                          levelOptions.find(
                            (option) =>
                              option.LevelCode === packagingLevelCode,
                          )?.LevelName ?? "";

                        return {
                          ...current,
                          packagingLevelCode,
                          packagingLevelName,
                        };
                      })
                    }
                  >
                    <SelectTrigger
                      id="packaging-spec-form-packaging-level-code"
                      data-testid="packaging-spec-form-packaging-level-code"
                      aria-label={t(
                        "pages.packagingSpec.form.packagingLevelCode",
                      )}
                      className="w-full"
                    >
                      <SelectValue
                        placeholder={t(
                          "pages.packagingSpec.form.selectPlaceholder",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={emptyPackagingLevelCodeValue}>
                          {t("pages.packagingSpec.form.selectPlaceholder")}
                        </SelectItem>
                        {levelOptions.map((option) => (
                          <SelectItem key={option.Id} value={option.LevelCode}>
                            {option.LevelCode}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="packaging-spec-form-packaging-level-name">
                    {t("pages.packagingSpec.form.packagingLevelName")}
                  </FieldLabel>
                  <Input
                    id="packaging-spec-form-packaging-level-name"
                    value={values.packagingLevelName}
                    readOnly
                    className="bg-muted/40"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="packaging-spec-form-barcode-rule-code">
                    {t("pages.packagingSpec.form.barcodeRuleCode")}
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="packaging-spec-form-barcode-rule-code"
                      data-testid="packaging-spec-form-barcode-rule-code"
                      value={values.barcodeRuleCode}
                      placeholder={t("pages.packagingSpec.form.clickSelect")}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          barcodeRuleCode: event.target.value,
                        }))
                      }
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        aria-label={t(
                          "pages.packagingSpec.form.barcodeRuleCode",
                        )}
                        size="icon-sm"
                      >
                        <SearchIcon />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>

                <Field>
                  <FieldLabel htmlFor="packaging-spec-form-barcode-rule-name">
                    {t("pages.packagingSpec.form.barcodeRuleName")}
                  </FieldLabel>
                  <Input
                    id="packaging-spec-form-barcode-rule-name"
                    data-testid="packaging-spec-form-barcode-rule-name"
                    value={values.barcodeRuleName}
                    className="bg-muted/40"
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        barcodeRuleName: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <FieldSet className="gap-5 border-t pt-6">
                <FieldLegend className="mb-0 text-lg">
                  {t("pages.packagingSpec.form.dimensionsSection")}
                </FieldLegend>

                <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Field>
                    <FieldLabel htmlFor="packaging-spec-form-length">
                      {t("pages.packagingSpec.form.length")}
                    </FieldLabel>
                    <Input
                      id="packaging-spec-form-length"
                      data-testid="packaging-spec-form-length"
                      value={values.length}
                      inputMode="decimal"
                      onChange={(event) =>
                        setValues((current) =>
                          getValuesWithDimensionChange(
                            current,
                            "length",
                            event.target.value,
                            volumeManuallyEdited,
                          ),
                        )
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="packaging-spec-form-width">
                      {t("pages.packagingSpec.form.width")}
                    </FieldLabel>
                    <Input
                      id="packaging-spec-form-width"
                      data-testid="packaging-spec-form-width"
                      value={values.width}
                      inputMode="decimal"
                      onChange={(event) =>
                        setValues((current) =>
                          getValuesWithDimensionChange(
                            current,
                            "width",
                            event.target.value,
                            volumeManuallyEdited,
                          ),
                        )
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="packaging-spec-form-height">
                      {t("pages.packagingSpec.form.height")}
                    </FieldLabel>
                    <Input
                      id="packaging-spec-form-height"
                      data-testid="packaging-spec-form-height"
                      value={values.height}
                      inputMode="decimal"
                      onChange={(event) =>
                        setValues((current) =>
                          getValuesWithDimensionChange(
                            current,
                            "height",
                            event.target.value,
                            volumeManuallyEdited,
                          ),
                        )
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="packaging-spec-form-volume">
                      {t("pages.packagingSpec.form.volume")}
                    </FieldLabel>
                    <Input
                      id="packaging-spec-form-volume"
                      data-testid="packaging-spec-form-volume"
                      value={values.volume}
                      inputMode="decimal"
                      onChange={(event) => {
                        setVolumeManuallyEdited(true);
                        setValues((current) => ({
                          ...current,
                          volume: event.target.value,
                        }));
                      }}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="packaging-spec-form-max-weight">
                      {t("pages.packagingSpec.form.maxWeight")}
                    </FieldLabel>
                    <Input
                      id="packaging-spec-form-max-weight"
                      data-testid="packaging-spec-form-max-weight"
                      value={values.maxWeight}
                      inputMode="decimal"
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          maxWeight: event.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="packaging-spec-form-gross-weight">
                      {t("pages.packagingSpec.form.grossWeight")}
                    </FieldLabel>
                    <Input
                      id="packaging-spec-form-gross-weight"
                      data-testid="packaging-spec-form-gross-weight"
                      value={values.grossWeight}
                      inputMode="decimal"
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          grossWeight: event.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="packaging-spec-form-tare-weight">
                      {t("pages.packagingSpec.form.tareWeight")}
                    </FieldLabel>
                    <Input
                      id="packaging-spec-form-tare-weight"
                      data-testid="packaging-spec-form-tare-weight"
                      value={values.tareWeight}
                      inputMode="decimal"
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          tareWeight: event.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="packaging-spec-form-stack-limit">
                      {t("pages.packagingSpec.form.stackLimit")}
                    </FieldLabel>
                    <Input
                      id="packaging-spec-form-stack-limit"
                      data-testid="packaging-spec-form-stack-limit"
                      value={values.stackLimit}
                      inputMode="numeric"
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          stackLimit: event.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field className="sm:col-span-2 lg:col-span-1">
                    <FieldLabel htmlFor="packaging-spec-form-standard-capacity">
                      {t("pages.packagingSpec.form.standardCapacity")}
                    </FieldLabel>
                    <div className="grid grid-cols-[minmax(0,1fr)_7rem] overflow-hidden rounded-md border border-input shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                      <Input
                        id="packaging-spec-form-standard-capacity"
                        data-testid="packaging-spec-form-standard-capacity"
                        value={values.standardCapacity}
                        inputMode="numeric"
                        className="rounded-none border-0 shadow-none focus-visible:ring-0"
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            standardCapacity: event.target.value,
                          }))
                        }
                      />
                      <Input
                        data-testid="packaging-spec-form-unit"
                        value={values.unit}
                        aria-label={t("pages.packagingSpec.form.unit")}
                        className="rounded-none border-y-0 border-r-0 shadow-none focus-visible:ring-0"
                        placeholder={t("pages.packagingSpec.form.unit")}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            unit: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </Field>
                </div>

                <Field orientation="horizontal" className="items-center gap-4">
                  <FieldLabel htmlFor="packaging-spec-form-is-enabled">
                    {t("pages.packagingSpec.form.enabled")}
                  </FieldLabel>
                  <button
                    id="packaging-spec-form-is-enabled"
                    type="button"
                    role="switch"
                    aria-checked={values.isEnabled}
                    aria-label={t("pages.packagingSpec.form.enabled")}
                    className={cn(
                      "relative inline-flex h-9 w-14 items-center rounded-full border transition-colors",
                      values.isEnabled
                        ? "border-primary bg-primary"
                        : "border-border bg-muted",
                    )}
                    onClick={() =>
                      setValues((current) => ({
                        ...current,
                        isEnabled: !current.isEnabled,
                      }))
                    }
                  >
                    <span
                      className={cn(
                        "inline-block size-7 rounded-full bg-background shadow transition-transform",
                        values.isEnabled ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                </Field>
              </FieldSet>
            </FieldGroup>
          </div>

          <DialogFooter className="border-t px-8 py-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              {t("pages.packagingSpec.actions.back")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={handleReset}
            >
              <RotateCcwIcon data-icon="inline-start" />
              {t("pages.packagingSpec.actions.reset")}
            </Button>
            <Button
              data-testid="packaging-spec-form-submit"
              type="submit"
              disabled={submitting || optionsError}
            >
              <CheckIcon data-icon="inline-start" />
              {t("pages.packagingSpec.actions.confirm")}
            </Button>
          </DialogFooter>
    </form>
  );
}
