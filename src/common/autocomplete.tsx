import { Popover } from "@base-ui/react/popover";
import * as React from "react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/ui/components/ui/command";
import { Input } from "@/ui/components/ui/input";
import { cn } from "@/ui/lib/utils";

export type AutocompleteOption = {
  value: string;
  label: string | React.ReactNode;
};

type AutocompleteProps = {
  options: AutocompleteOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void; // Added onBlur prop
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onSearch?: (value: string) => void;
  searchValue?: string;
  displayValue?: string;
};

export function Autocomplete({
  options,
  value,
  onValueChange,
  onBlur: onBlurProp, // Destructure the new onBlur prop
  placeholder = "Type to search...",
  emptyText = "No results found.",
  className,
  disabled,
  loading,
  onSearch,
  searchValue: externalSearchValue,
  displayValue,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [internalSearchValue, setInternalSearchValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const searchValue = externalSearchValue ?? internalSearchValue;
  // Show displayValue when not typing, otherwise show what user is typing
  const inputValue = searchValue || displayValue;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInternalSearchValue(value);
    onSearch?.(value);

    // Open popover when user starts typing (only if there are options)
    if (!open && options.length > 0) {
      setOpen(true);
    }
  };

  // Close popover when options become empty, open when they appear
  React.useEffect(() => {
    if (options.length === 0) {
      setOpen(false);
    } else if (document.activeElement === inputRef.current && searchValue) {
      setOpen(true);
    }
  }, [options.length, searchValue]);

  const handleSelect = (selectedValue: string) => {
    onValueChange?.(selectedValue);
    setOpen(false);
  };

  const handleInputFocus = () => {
    // Only open popover on focus if there's no displayValue (no customer selected)
    if (!displayValue && options.length > 0) {
      setOpen(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Don't close if clicking inside the popover
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('[role="dialog"]')) {
      return;
    }
    // Close after a short delay to allow click events to fire
    setTimeout(() => setOpen(false), 200);

    onBlurProp?.(e); // Call the passed onBlur prop after internal logic
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && open) {
      e.preventDefault();
    }
  };

  // Handle popover open/close - prevent closing when input is focused
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && document.activeElement === inputRef.current) {
      // Don't close if the input still has focus (user clicked on input)
      return;
    }
    setOpen(newOpen);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
      />
      <Popover.Portal>
        <Popover.Positioner anchor={inputRef} align="start" sideOffset={4} className="isolate z-50">
          <Popover.Popup
            initialFocus={false}
            className="flex flex-col rounded-md bg-popover p-0 text-popover-foreground shadow-md outline-hidden ring-1 ring-foreground/10"
            style={{ width: inputRef.current?.offsetWidth }}
          >
            <Command shouldFilter={false}>
              <CommandList>
                <CommandEmpty>{loading ? "Loading..." : emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleSelect(option.value)}
                      className={cn(value === option.value && "font-bold")}
                    >
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
