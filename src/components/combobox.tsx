import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { Button } from "@/ui/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/ui/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { cn } from "@/ui/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  disabled?: boolean;
  tooltip?: string;
};

type ComboboxProps = {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onSearch?: (value: string) => void;
  selectedLabel?: string;
};

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  emptyText = "No results found.",
  className,
  disabled,
  loading,
  onSearch,
  selectedLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {value ? selectedLabel || options.find((option) => option.value === value)?.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder} onValueChange={onSearch} className="h-9" disabled={disabled} />
          <CommandEmpty>{loading ? "Loading..." : emptyText}</CommandEmpty>
          <CommandGroup>
            {options.map((option) => {
              const item = (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  onSelect={() => {
                    if (option.disabled) return;
                    onValueChange?.(option.value);
                    setOpen(false);
                  }}
                  className={cn(option.disabled && "cursor-not-allowed opacity-50")}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              );

              if (option.disabled && option.tooltip) {
                return (
                  <Tooltip key={option.value}>
                    <TooltipTrigger asChild>{item}</TooltipTrigger>
                    <TooltipContent>{option.tooltip}</TooltipContent>
                  </Tooltip>
                );
              }

              return item;
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
