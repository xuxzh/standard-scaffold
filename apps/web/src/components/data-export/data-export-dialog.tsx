import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type DataExportMode = "all" | "current" | "selected";

export type DataExportDialogOptionLabels = {
  all: string;
  current: string;
  selected: string;
};

export type DataExportDialogMessages = {
  title: string;
  description: string;
  confirm: string;
  cancel: string;
  exporting: string;
  selectedDisabledHint: string;
};

export type DataExportDialogProps = {
  open: boolean;
  exporting?: boolean;
  selectedCount: number;
  defaultMode?: DataExportMode;
  optionLabels: DataExportDialogOptionLabels;
  messages: DataExportDialogMessages;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: DataExportMode) => void;
};

const modeOrder: DataExportMode[] = ["all", "current", "selected"];

type DataExportDialogBodyProps = Omit<DataExportDialogProps, "open"> & {
  defaultMode: DataExportMode;
};

function DataExportDialogBody({
  exporting = false,
  selectedCount,
  defaultMode,
  optionLabels,
  messages,
  onOpenChange,
  onConfirm,
}: DataExportDialogBodyProps) {
  const [mode, setMode] = useState<DataExportMode>(defaultMode);

  const options = useMemo(
    () =>
      modeOrder.map((option) => ({
        value: option,
        label: optionLabels[option],
        disabled: option === "selected" && selectedCount === 0,
      })),
    [optionLabels, selectedCount],
  );

  return (
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>{messages.title}</DialogTitle>
        <DialogDescription>{messages.description}</DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <RadioGroup
          aria-label={messages.title}
          value={mode}
          onValueChange={(value) => setMode(value as DataExportMode)}
          className="gap-2"
        >
          {options.map((option) => (
            <label
              key={option.value}
              htmlFor={`data-export-mode-${option.value}`}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                "border-border bg-background hover:bg-accent/40",
                "has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:text-foreground",
                "has-[button[data-disabled]]:cursor-not-allowed has-[button[data-disabled]]:opacity-50",
              )}
            >
              <RadioGroupItem
                id={`data-export-mode-${option.value}`}
                value={option.value}
                disabled={option.disabled}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </RadioGroup>

        {selectedCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            {messages.selectedDisabledHint}
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          {messages.cancel}
        </Button>
        <Button
          type="button"
          disabled={exporting}
          onClick={() => onConfirm(mode)}
        >
          {exporting ? messages.exporting : messages.confirm}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function DataExportDialog({
  open,
  exporting = false,
  selectedCount,
  defaultMode = "all",
  optionLabels,
  messages,
  onOpenChange,
  onConfirm,
}: DataExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DataExportDialogBody
          exporting={exporting}
          selectedCount={selectedCount}
          defaultMode={defaultMode}
          optionLabels={optionLabels}
          messages={messages}
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
        />
      ) : null}
    </Dialog>
  );
}
