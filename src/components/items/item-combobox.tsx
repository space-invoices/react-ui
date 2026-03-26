import type { Item } from "@spaceinvoices/js-sdk";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Autocomplete } from "@/ui/common/autocomplete";
import { useDebounce } from "@/ui/hooks/use-debounce";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

import { autocompleteTranslations } from "../common/autocomplete-locales";
import { useItemSearch, useRecentItems } from "./items.hooks";

type ItemComboboxProps = {
  entityId: string;
  value?: string;
  onSelect?: (item: Item | null, customName?: string) => void;
  onCommitInlineName?: (value: string) => void;
  onInlineInputChange?: (value: string) => void;
  commitOnBlurMode?: "create" | "update-inline";
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  inputTestId?: string;
  inputDataDemo?: string;
  ariaInvalid?: boolean;
} & ComponentTranslationProps;

/**
 * Autocomplete for selecting saved catalog items
 * Shows recent items, allows search, and supports custom names
 */
export function ItemCombobox({
  entityId,
  value,
  onSelect,
  onCommitInlineName,
  onInlineInputChange,
  commitOnBlurMode = "create",
  placeholder = "Search or enter item name...",
  className,
  disabled,
  ariaInvalid = false,
  locale = "en",
  translationLocale,
  inputTestId,
  inputDataDemo,
  t: translationFn,
  namespace,
}: ItemComboboxProps) {
  const t = createTranslation({
    t: translationFn,
    namespace,
    locale,
    translationLocale,
    translations: autocompleteTranslations,
  });
  const [search, setSearch] = useState("");
  const [displayValue, setDisplayValue] = useState(value || "");
  const debouncedSearch = useDebounce(search, 300);
  const resolvedPlaceholder = placeholder ? t(placeholder) : placeholder;

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
    return ` - ${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price)}`;
  };

  const options = items.map((item) => {
    const itemIndex = items.findIndex((entry) => entry.id === item.id);
    return {
      value: item.id,
      ...(itemIndex === 0
        ? {
            testId: "marketing-demo-item-option-0",
            dataDemo: "marketing-demo-item-option-0",
          }
        : {}),
      label: (
        <div className="flex flex-col overflow-hidden">
          <span className="truncate">{item.name}</span>
          <span className="truncate text-muted-foreground text-xs">
            {formatPrice(item)}
            {item.description && ` · ${item.description}`}
          </span>
        </div>
      ),
    };
  });

  // Add "Use custom name" option when there's search text
  if (debouncedSearch?.trim()) {
    options.unshift({
      value: `__custom__:${debouncedSearch}`,
      label: (
        <span className="flex items-center gap-2">
          <Plus className="size-4" />
          {t("Use")} "{debouncedSearch}"
        </span>
      ),
    });
  }

  const handleSearch = (value: string) => {
    setSearch(value);
    if (commitOnBlurMode === "update-inline") {
      onInlineInputChange?.(value);
    }
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

  const commitCustomName = (customName: string) => {
    const trimmedName = customName.trim();
    if (!trimmedName) return;

    if (commitOnBlurMode === "update-inline") {
      onCommitInlineName?.(trimmedName);
      setSearch(trimmedName);
      setDisplayValue(trimmedName);
      return;
    }

    onSelect?.(null, trimmedName);
    setSearch(trimmedName);
    setDisplayValue(trimmedName);
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
      onCommitUnselectedInput={commitCustomName}
      commitUnselectedOnBlur={true}
      options={options}
      placeholder={resolvedPlaceholder}
      className={className}
      disabled={disabled}
      loading={isLoading}
      emptyText={debouncedSearch ? t("No items found") : t("Recent items")}
      displayValue={displayValue}
      inputTestId={inputTestId}
      inputDataDemo={inputDataDemo}
      committedDisplayValue={value}
      ariaInvalid={ariaInvalid}
    />
  );
}
