import { Popover } from "@base-ui/react/popover";
import * as React from "react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/ui/components/ui/command";
import { Input } from "@/ui/components/ui/input";
import { cn } from "@/ui/lib/utils";

export type AutocompleteOption = {
  value: string;
  label: string | React.ReactNode;
  testId?: string;
  dataDemo?: string;
};

type AutocompleteProps = {
  options: AutocompleteOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void; // Added onBlur prop
  onCommitUnselectedInput?: (value: string) => void;
  commitUnselectedOnBlur?: boolean;
  committedDisplayValue?: string;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onSearch?: (value: string) => void;
  searchValue?: string;
  displayValue?: string;
  inputTestId?: string;
  inputDataDemo?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  ariaInvalid?: boolean;
};

export function Autocomplete({
  options,
  value,
  onValueChange,
  onBlur: onBlurProp, // Destructure the new onBlur prop
  onCommitUnselectedInput,
  commitUnselectedOnBlur = false,
  committedDisplayValue,
  placeholder = "Type to search...",
  emptyText = "No results found.",
  className,
  disabled,
  loading,
  onSearch,
  searchValue: externalSearchValue,
  displayValue,
  inputTestId,
  inputDataDemo,
  inputRef: externalInputRef,
  ariaInvalid = false,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [internalSearchValue, setInternalSearchValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const suppressAutoOpenRef = React.useRef(false);
  const blurCloseRef = React.useRef(false);
  const selectedValueRef = React.useRef<string | null>(null);

  const searchValue = externalSearchValue ?? internalSearchValue;
  // Show displayValue when not typing, otherwise show what user is typing
  const inputValue = searchValue || displayValue;

  const finalizePendingInput = () => {
    const typedValue = searchValue?.trim();
    const shouldCommitTypedValue =
      !!typedValue &&
      typedValue !== displayValue &&
      selectedValueRef.current == null &&
      commitUnselectedOnBlur &&
      !!onCommitUnselectedInput;

    if (shouldCommitTypedValue) {
      onCommitUnselectedInput(typedValue);
      selectedValueRef.current = "__implicit_commit__";
      return;
    }

    if (selectedValueRef.current == null) {
      const restoredValue = committedDisplayValue ?? displayValue ?? "";
      setInternalSearchValue("");
      onSearch?.(restoredValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    suppressAutoOpenRef.current = false;
    setInternalSearchValue(value);
    onSearch?.(value);

    // Open popover when user starts typing (only if there are options)
    if (!open && options.length > 0) {
      setOpen(true);
    }
  };

  // Close popover when options become empty, open when they appear
  React.useEffect(() => {
    if (!displayValue && !value) {
      suppressAutoOpenRef.current = false;
    }

    if (options.length === 0) {
      setOpen(false);
    } else if (suppressAutoOpenRef.current) {
      return;
    } else if (document.activeElement === inputRef.current && searchValue) {
      setOpen(true);
    }
  }, [displayValue, options.length, searchValue, value]);

  const handleSelect = (selectedValue: string) => {
    selectedValueRef.current = selectedValue;
    suppressAutoOpenRef.current = true;
    onValueChange?.(selectedValue);
    setOpen(false);
  };

  const handleInputFocus = () => {
    if (!displayValue) {
      suppressAutoOpenRef.current = false;
    }
    if (suppressAutoOpenRef.current) return;
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

    finalizePendingInput();

    blurCloseRef.current = true;
    suppressAutoOpenRef.current = false;
    setOpen(false);
    requestAnimationFrame(() => {
      blurCloseRef.current = false;
      selectedValueRef.current = null;
    });

    onBlurProp?.(e); // Call the passed onBlur prop after internal logic
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && open) {
      e.preventDefault();
    }
  };

  // Ignore synthetic "outside press" close events that originate from the anchor input itself.
  const handleOpenChange = (newOpen: boolean, eventDetails?: { reason?: string; event?: Event }) => {
    if (!newOpen && eventDetails?.reason === "outside-press" && eventDetails.event?.target === inputRef.current) {
      return;
    }

    if (!newOpen && eventDetails?.reason === "outside-press" && eventDetails.event?.target !== inputRef.current) {
      finalizePendingInput();
    }

    setOpen(newOpen);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Input
        ref={(node) => {
          inputRef.current = node;
          if (typeof externalInputRef === "function") {
            externalInputRef(node);
          } else if (externalInputRef) {
            (externalInputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }
        }}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
        data-testid={inputTestId}
        data-demo={inputDataDemo}
        aria-invalid={ariaInvalid || undefined}
      />
      <Popover.Portal>
        <Popover.Positioner
          anchor={inputRef}
          align="start"
          sideOffset={4}
          positionMethod="fixed"
          className="isolate z-50"
        >
          <Popover.Popup
            initialFocus={false}
            finalFocus={false}
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
                      data-testid={option.testId}
                      data-demo={option.dataDemo}
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
