import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  placeholder?: string;
};

export function MaterialPickerField({
  value,
  onChange,
  dataSource,
  disabled = false,
  invalid = false,
  inputId,
  placeholder,
}: MaterialPickerFieldProps) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const selectLabel = t("pages.materialPicker.field.select");

  return (
    <>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={value?.materialCode ?? ""}
          placeholder={placeholder ?? t("pages.materialPicker.field.placeholder")}
          readOnly
          disabled={disabled}
          aria-invalid={invalid}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={selectLabel}
                disabled={disabled}
                onClick={() => setOpen(true)}
              >
                <SearchIcon />
                <span className="sr-only">{selectLabel}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{selectLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <MaterialPickerDialog
        open={open}
        dataSource={dataSource}
        onSelect={onChange}
        onOpenChange={setOpen}
      />
    </>
  );
}
