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
        <div role="radiogroup" aria-label={messages.title} className="grid gap-2">
          {options.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                option.disabled && "cursor-not-allowed opacity-50",
                mode === option.value
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-background hover:bg-accent/40",
              )}
            >
              <input
                type="radio"
                name="data-export-mode"
                value={option.value}
                checked={mode === option.value}
                disabled={option.disabled}
                onChange={() => setMode(option.value)}
                className="sr-only"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

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
