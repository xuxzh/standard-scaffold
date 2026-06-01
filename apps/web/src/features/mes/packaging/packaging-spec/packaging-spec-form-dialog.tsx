import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [values, setValues] = useState<PackagingSpecFormValues>(
    getDefaultValues(record),
  );
  const [volumeManuallyEdited, setVolumeManuallyEdited] = useState(false);

  useEffect(() => {
    setValues(getDefaultValues(record));
    setVolumeManuallyEdited(false);
  }, [record, open]);

  const typeName = useMemo(
    () =>
      typeOptions.find((item) => item.TypeCode === values.packagingTypeCode)
        ?.TypeName ?? "",
    [typeOptions, values.packagingTypeCode],
  );
  const levelName = useMemo(
    () =>
      levelOptions.find((item) => item.LevelCode === values.packagingLevelCode)
        ?.LevelName ?? "",
    [levelOptions, values.packagingLevelCode],
  );

  useEffect(() => {
    if (typeName !== values.packagingTypeName) {
      setValues((current) => ({ ...current, packagingTypeName: typeName }));
    }
  }, [typeName, values.packagingTypeName]);

  useEffect(() => {
    if (levelName !== values.packagingLevelName) {
      setValues((current) => ({ ...current, packagingLevelName: levelName }));
    }
  }, [levelName, values.packagingLevelName]);

  useEffect(() => {
    if (volumeManuallyEdited) {
      return;
    }

    const nextVolume = toFixedVolume(
      values.length,
      values.width,
      values.height,
    );
    setValues((current) => ({ ...current, volume: nextVolume }));
  }, [values.height, values.length, values.width, volumeManuallyEdited]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="packaging-spec-form-dialog"
        className="max-h-[90vh] w-[min(100%-2rem,64rem)] max-w-none overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? t("pages.packagingSpec.form.createTitle")
              : t("pages.packagingSpec.form.editTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("pages.packagingSpec.form.description")}
          </DialogDescription>
        </DialogHeader>

        {optionsError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {t("pages.packagingSpec.feedback.optionsLoadFailed")}
          </div>
        ) : null}

        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit(values);
          }}
        >
          <Input
            data-testid="packaging-spec-form-spec-code"
            aria-label={t("pages.packagingSpec.filters.specCode")}
            value={values.specCode}
            disabled={mode === "edit"}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                specCode: event.target.value,
              }))
            }
          />
          <Input
            data-testid="packaging-spec-form-spec-name"
            aria-label={t("pages.packagingSpec.filters.specName")}
            value={values.specName}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                specName: event.target.value,
              }))
            }
          />
          <Select
            value={values.packagingTypeCode}
            onValueChange={(value) =>
              setValues((current) => ({
                ...current,
                packagingTypeCode:
                  value === emptyPackagingTypeCodeValue ? "" : value,
              }))
            }
          >
            <SelectTrigger
              data-testid="packaging-spec-form-packaging-type-code"
              aria-label={t("pages.packagingSpec.filters.packagingTypeCode")}
              className="w-full"
            >
              <SelectValue
                placeholder={t("pages.packagingSpec.filters.options.all")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={emptyPackagingTypeCodeValue}>
                  {t("pages.packagingSpec.filters.options.all")}
                </SelectItem>
                {typeOptions.map((option) => (
                  <SelectItem key={option.Id} value={option.TypeCode}>
                    {option.TypeCode}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input value={values.packagingTypeName} readOnly />
          <Select
            value={values.packagingLevelCode}
            onValueChange={(value) =>
              setValues((current) => ({
                ...current,
                packagingLevelCode:
                  value === emptyPackagingLevelCodeValue ? "" : value,
              }))
            }
          >
            <SelectTrigger
              data-testid="packaging-spec-form-packaging-level-code"
              aria-label={t("pages.packagingSpec.form.packagingLevelCode")}
              className="w-full"
            >
              <SelectValue
                placeholder={t("pages.packagingSpec.filters.options.all")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={emptyPackagingLevelCodeValue}>
                  {t("pages.packagingSpec.filters.options.all")}
                </SelectItem>
                {levelOptions.map((option) => (
                  <SelectItem key={option.Id} value={option.LevelCode}>
                    {option.LevelCode}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input value={values.packagingLevelName} readOnly />
          <Input
            data-testid="packaging-spec-form-barcode-rule-code"
            value={values.barcodeRuleCode}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                barcodeRuleCode: event.target.value,
              }))
            }
          />
          <Input
            data-testid="packaging-spec-form-barcode-rule-name"
            value={values.barcodeRuleName}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                barcodeRuleName: event.target.value,
              }))
            }
          />
          <Input
            data-testid="packaging-spec-form-length"
            value={values.length}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                length: event.target.value,
              }))
            }
          />
          <Input
            data-testid="packaging-spec-form-width"
            value={values.width}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                width: event.target.value,
              }))
            }
          />
          <Input
            data-testid="packaging-spec-form-height"
            value={values.height}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                height: event.target.value,
              }))
            }
          />
          <Input
            data-testid="packaging-spec-form-volume"
            value={values.volume}
            onChange={(event) => {
              setVolumeManuallyEdited(true);
              setValues((current) => ({
                ...current,
                volume: event.target.value,
              }));
            }}
          />
          <Input
            data-testid="packaging-spec-form-max-weight"
            value={values.maxWeight}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                maxWeight: event.target.value,
              }))
            }
          />
          <Input
            data-testid="packaging-spec-form-gross-weight"
            value={values.grossWeight}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                grossWeight: event.target.value,
              }))
            }
          />
          <Input
            data-testid="packaging-spec-form-tare-weight"
            value={values.tareWeight}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                tareWeight: event.target.value,
              }))
            }
          />
          <Input
            data-testid="packaging-spec-form-standard-capacity"
            value={values.standardCapacity}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                standardCapacity: event.target.value,
              }))
            }
          />
          <Input
            data-testid="packaging-spec-form-stack-limit"
            value={values.stackLimit}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                stackLimit: event.target.value,
              }))
            }
          />
          <Input
            data-testid="packaging-spec-form-unit"
            value={values.unit}
            onChange={(event) =>
              setValues((current) => ({ ...current, unit: event.target.value }))
            }
          />
          <Select
            value={String(values.isEnabled)}
            onValueChange={(value) =>
              setValues((current) => ({
                ...current,
                isEnabled: value === "true",
              }))
            }
          >
            <SelectTrigger
              aria-label={t("pages.packagingSpec.filters.isEnabled")}
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="true">
                  {t("pages.packagingSpec.filters.options.true")}
                </SelectItem>
                <SelectItem value="false">
                  {t("pages.packagingSpec.filters.options.false")}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <DialogFooter className="md:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("pages.packagingSpec.actions.cancel")}
            </Button>
            <Button
              data-testid="packaging-spec-form-submit"
              type="submit"
              disabled={submitting || optionsError}
            >
              {t("pages.packagingSpec.actions.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
