import type { Customer } from "@spaceinvoices/js-sdk";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Autocomplete } from "@/ui/common/autocomplete";
import { useDebounce } from "@/ui/hooks/use-debounce";

import { useCustomerSearch, useRecentCustomers } from "./customers.hooks";

const MAX_TEXT_LENGTH = 100;

const truncateText = (text: string, maxLength: number = MAX_TEXT_LENGTH): string => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

type CustomerAutocompleteProps = {
  entityId: string;
  value?: string | null;
  committedDisplayName?: string;
  onValueChange?: (value: string, customer: Customer) => void;
  onCommitInlineName?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onBlur?: () => void; // Added onBlur prop
  /** Initial display name when pre-populating with a customer (e.g., for duplication) */
  initialDisplayName?: string;
  inputTestId?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  commitOnBlurMode?: "none" | "create" | "update-inline";
};

export function CustomerAutocomplete({
  entityId,
  value,
  committedDisplayName,
  onValueChange,
  onCommitInlineName,
  placeholder = "Name",
  className,
  disabled,
  onBlur: onBlurPropFromParent, // Destructure the onBlur prop from parent
  initialDisplayName,
  inputTestId,
  inputRef,
  commitOnBlurMode = "none",
}: CustomerAutocompleteProps) {
  const [search, setSearch] = useState(initialDisplayName || "");
  const [displayValue, setDisplayValue] = useState(initialDisplayName || "");
  const preserveSearchOnClearRef = useRef(false);
  const debouncedSearch = useDebounce(search, 300);

  const handleSearch = (value: string) => {
    setSearch(value);
    // Clear displayValue when user starts typing to allow free editing
    if (displayValue && value !== displayValue) {
      setDisplayValue("");
    }
  };

  // Fetch recent customers (non-blocking, cached)
  const { data: recentData } = useRecentCustomers(entityId);
  const recentCustomers = recentData?.data || [];

  // Fetch search results
  const { data: searchData, isLoading } = useCustomerSearch(entityId, debouncedSearch);
  const searchResults = searchData?.data || [];

  // Use search results if searching, otherwise show recent customers
  const customers = useMemo(() => {
    if (debouncedSearch) {
      return searchResults;
    }
    return recentCustomers;
  }, [debouncedSearch, searchResults, recentCustomers]);

  const options = customers.map((customer) => {
    const truncatedName = truncateText(customer.name);
    const address = [customer.address, customer.city, customer.country].filter(Boolean).join(", ");
    const truncatedAddress = truncateText(address);

    return {
      value: customer.id,
      label: (
        <div className="flex flex-col overflow-hidden">
          <span className="truncate">{truncatedName}</span>
          {truncatedAddress && <span className="truncate text-muted-foreground text-xs">{truncatedAddress}</span>}
        </div>
      ),
    };
  });

  // Always add "Create new" option at the top
  const createNewLabel = debouncedSearch?.trim() ? `Create "${debouncedSearch}"` : "Create new";

  options.unshift({
    value: `__create__:${debouncedSearch || ""}`,
    label: (
      <span className="flex items-center gap-2">
        <Plus className="size-4" />
        {createNewLabel}
      </span>
    ) as any,
  });

  const handleValueChange = (selectedValue: string) => {
    // Handle "create new" selection
    if (selectedValue.startsWith("__create__:")) {
      const customerName = selectedValue.replace("__create__:", "");
      const truncatedName = truncateText(customerName);

      if (onValueChange) {
        // Pass pseudo-customer with just name, empty id to indicate new customer
        onValueChange("", {
          name: customerName || "",
          address: null,
          address_2: null,
          post_code: null,
          city: null,
          state: null,
          country: null,
          tax_number: null,
        } as Customer);
      }

      // Set search to the customer name so it shows in the input
      setSearch(truncatedName);
      setDisplayValue(truncatedName);
      return;
    }

    // Find customer in both recent and search results
    const selectedCustomer =
      customers.find((c) => c.id === selectedValue) ||
      recentCustomers.find((c) => c.id === selectedValue) ||
      searchResults.find((c) => c.id === selectedValue);

    if (selectedCustomer) {
      if (onValueChange) {
        onValueChange(selectedValue, selectedCustomer);
      }
      // Set search to the customer name (truncated) so it shows in the input
      const truncatedName = truncateText(selectedCustomer.name);
      setSearch(truncatedName);
      setDisplayValue(truncatedName);
    }
  };

  const commitCustomerName = (customerName: string) => {
    const trimmedName = customerName.trim();
    if (!trimmedName) return;

    if (commitOnBlurMode === "update-inline") {
      onCommitInlineName?.(trimmedName);
      const truncatedName = truncateText(trimmedName);
      setSearch(truncatedName);
      setDisplayValue(truncatedName);
      return;
    }

    if (onValueChange) {
      onValueChange("", {
        name: trimmedName,
        address: null,
        address_2: null,
        post_code: null,
        city: null,
        state: null,
        country: null,
        tax_number: null,
      } as Customer);
    }

    const truncatedName = truncateText(trimmedName);
    setSearch(truncatedName);
    setDisplayValue(truncatedName);
  };

  const handleBlur = () => {
    onBlurPropFromParent?.();
  };

  // Sync visible input when committed customer state changes externally
  useEffect(() => {
    if (value) {
      const nextDisplayValue = committedDisplayName || initialDisplayName || "";
      if (nextDisplayValue) {
        setSearch(nextDisplayValue);
        setDisplayValue(nextDisplayValue);
      }
      return;
    }

    if (!committedDisplayName) {
      if (!preserveSearchOnClearRef.current) {
        setSearch("");
      }
      preserveSearchOnClearRef.current = false;
      setDisplayValue("");
    }
  }, [committedDisplayName, initialDisplayName, value]);

  return (
    <Autocomplete
      searchValue={search}
      onSearch={handleSearch}
      value={value ?? undefined}
      onValueChange={handleValueChange}
      onCommitUnselectedInput={commitCustomerName}
      commitUnselectedOnBlur={commitOnBlurMode !== "none"}
      onBlur={handleBlur} // Pass the new handleBlur to Autocomplete
      options={options}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      loading={isLoading}
      emptyText={debouncedSearch ? "No customers found" : "Recent customers"}
      displayValue={displayValue}
      inputTestId={inputTestId}
      committedDisplayValue={committedDisplayName}
      inputRef={inputRef}
    />
  );
}
