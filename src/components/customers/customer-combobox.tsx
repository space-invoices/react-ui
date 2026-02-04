import type { Customer } from "@spaceinvoices/js-sdk";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Combobox } from "@/ui/components/combobox";
import { useDebounce } from "@/ui/hooks/use-debounce";

import { useCustomerSearch, useRecentCustomers } from "./customers.hooks";

type CustomerComboboxProps = {
  entityId: string;
  value?: string | null;
  onValueChange?: (value: string, customer: Customer) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function CustomerCombobox({
  entityId,
  value,
  onValueChange,
  placeholder = "Search customer...",
  className,
  disabled,
}: CustomerComboboxProps) {
  const [search, setSearch] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(undefined);
  const debouncedSearch = useDebounce(search, 300);

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

  const options = customers.map((customer) => ({
    value: customer.id,
    label: customer.name,
  }));

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

      // Clear display
      setSelectedLabel(undefined);
      setSearch("");
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
    }

    // Clear display after selection
    setSelectedLabel(undefined);
    setSearch("");
  };

  // Reset search and label when value changes externally
  useEffect(() => {
    setSearch("");
    if (!value) {
      setSelectedLabel(undefined);
    }
  }, [value]);

  return (
    <Combobox
      value={value ?? undefined}
      onValueChange={handleValueChange}
      onSearch={setSearch}
      options={options}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      loading={isLoading}
      emptyText={debouncedSearch ? "No customers found" : "Recent customers"}
      selectedLabel={selectedLabel}
    />
  );
}
