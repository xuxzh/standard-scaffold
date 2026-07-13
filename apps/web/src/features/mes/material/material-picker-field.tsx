import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { MaterialPickerRecord } from "@/features/mes/material/material-picker-contract";
import {
  MaterialPickerDialog,
  type MaterialPickerDataSource,
} from "@/features/mes/material/material-picker-dialog";

export type MaterialPickerFieldProps = {
  value?: MaterialPickerRecord | null;
  onChange: (material: MaterialPickerRecord) => void;
  dataSource?: MaterialPickerDataSource;
  disabled?: boolean;
  invalid?: boolean;
  inputId?: string;
  inputTestId?: string;
  placeholder?: string;
};

export function MaterialPickerField({
  value,
  onChange,
  dataSource,
  disabled = false,
  invalid = false,
  inputId,
  inputTestId,
  placeholder,
}: MaterialPickerFieldProps) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const selectLabel = t("pages.materialPicker.field.select");

  return (
    <>
      <InputGroup data-disabled={disabled || undefined}>
        <InputGroupInput
          id={inputId}
          data-testid={inputTestId}
          value={value?.materialCode ?? ""}
          placeholder={placeholder ?? t("pages.materialPicker.field.placeholder")}
          readOnly
          disabled={disabled}
          aria-invalid={invalid}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="button"
            size="icon-xs"
            aria-label={selectLabel}
            disabled={disabled}
            onClick={() => setOpen(true)}
          >
            <SearchIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      <MaterialPickerDialog
        open={open}
        dataSource={dataSource}
        onSelect={onChange}
        onOpenChange={setOpen}
      />
    </>
  );
}
