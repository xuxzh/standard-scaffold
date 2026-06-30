import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ComboboxOption = {
  value: string;
  label: string;
};

type ComboboxProps = {
  options: ComboboxOption[];
  value: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  clearable?: boolean;
  className?: string;
  triggerClassName?: string;
  id?: string;
  "data-testid"?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
};

export function Combobox({
  options,
  value,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  clearable = true,
  className,
  triggerClassName,
  id,
  "data-testid": dataTestId,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  onValueChange,
  onBlur,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const showClear = clearable && !!value;

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            id={id}
            data-testid={dataTestId}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            aria-invalid={ariaInvalid}
            className={cn(
              "w-full justify-between",
              showClear && "pr-8",
              !selectedOption && "text-muted-foreground",
              triggerClassName,
            )}
            onBlur={onBlur}
          >
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronsUpDownIcon
              className={cn(
                "ml-2 size-4 shrink-0 opacity-50",
                showClear && "invisible",
              )}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "w-(--radix-popover-trigger-width) min-w-[280px] p-0",
          )}
          align="start"
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "size-4",
                        option.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {showClear && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 size-9"
          aria-label="Clear selection"
          onClick={() => {
            onValueChange("");
            setOpen(false);
          }}
        >
          <XIcon className="size-4 opacity-50 hover:opacity-100" />
        </Button>
      )}
    </div>
  );
}
