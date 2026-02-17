import type { Item } from "@spaceinvoices/js-sdk";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Autocomplete } from "@/ui/common/autocomplete";
import { useDebounce } from "@/ui/hooks/use-debounce";

import { useItemSearch, useRecentItems } from "./items.hooks";

type ItemComboboxProps = {
  entityId: string;
  value?: string;
  onSelect?: (item: Item | null, customName?: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Autocomplete for selecting saved catalog items
 * Shows recent items, allows search, and supports custom names
 */
export function ItemCombobox({
  entityId,
  value,
  onSelect,
  placeholder = "Search or enter item name...",
  className,
  disabled,
}: ItemComboboxProps) {
  const [search, setSearch] = useState("");
  const [displayValue, setDisplayValue] = useState(value || "");
  const debouncedSearch = useDebounce(search, 300);

  // Fetch recent items (non-blocking, cached)
  const { data: recentData } = useRecentItems(entityId);
  const recentItems = recentData?.data || [];

  // Fetch search results
  const { data: searchData, isLoading } = useItemSearch(entityId, debouncedSearch);
  const searchResults = searchData?.data || [];

  // Use search results if searching, otherwise show recent items
  const items = useMemo(() => {
    if (debouncedSearch) {
      return searchResults;
    }
    return recentItems;
  }, [debouncedSearch, searchResults, recentItems]);

  // Format price for display
  const formatPrice = (item: Item) => {
    const price = item.gross_price ?? item.price;
    if (price === null || price === undefined) return "";
    return ` - ${price.toFixed(2)}`;
  };

  const options = items.map((item) => ({
    value: item.id,
    label: (
      <div className="flex flex-col overflow-hidden">
        <span className="truncate">{item.name}</span>
        <span className="truncate text-muted-foreground text-xs">
          {formatPrice(item)}
          {item.description && ` · ${item.description}`}
        </span>
      </div>
    ),
  }));

  // Add "Use custom name" option when there's search text
  if (debouncedSearch?.trim()) {
    options.unshift({
      value: `__custom__:${debouncedSearch}`,
      label: (
        <span className="flex items-center gap-2">
          <Plus className="size-4" />
          Use "{debouncedSearch}"
        </span>
      ),
    });
  }

  const handleSearch = (value: string) => {
    setSearch(value);
    // Clear displayValue when user starts typing
    if (displayValue && value !== displayValue) {
      setDisplayValue("");
    }
  };

  const handleValueChange = (selectedValue: string) => {
    // Handle custom name selection
    if (selectedValue.startsWith("__custom__:")) {
      const customName = selectedValue.replace("__custom__:", "");
      onSelect?.(null, customName);
      setSearch(customName);
      setDisplayValue(customName);
      return;
    }

    // Find selected item
    const selectedItem =
      items.find((i) => i.id === selectedValue) ||
      recentItems.find((i) => i.id === selectedValue) ||
      searchResults.find((i) => i.id === selectedValue);

    if (selectedItem) {
      onSelect?.(selectedItem);
      setSearch(selectedItem.name);
      setDisplayValue(selectedItem.name);
    }
  };

  const handleBlur = () => {
    // If nothing was selected but there's text, treat as custom name
    if (!displayValue && search) {
      handleValueChange(`__custom__:${search}`);
    }
  };

  // Sync when value changes externally (e.g., duplication, form reset)
  useEffect(() => {
    if (value) {
      setDisplayValue(value);
    } else {
      setSearch("");
      setDisplayValue("");
    }
  }, [value]);

  return (
    <Autocomplete
      searchValue={search}
      onSearch={handleSearch}
      value={value}
      onValueChange={handleValueChange}
      onBlur={handleBlur}
      options={options}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      loading={isLoading}
      emptyText={debouncedSearch ? "No items found" : "Recent items"}
      displayValue={displayValue}
    />
  );
}
