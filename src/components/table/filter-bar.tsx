import { FilterIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/components/ui/collapsible";

import { FilterPanel } from "./filter-panel";
import { SearchInput } from "./search-input";
import { TableRefreshButton } from "./table-refresh-button";
import type { FilterConfig, FilterState } from "./types";

type FilterBarProps = {
  /** Current search value */
  searchValue?: string;
  /** Search change handler */
  onSearch: (value: string | null) => void;
  /** Filter configuration (which filters to show) */
  filterConfig?: FilterConfig;
  /** Current filter state */
  filterState?: FilterState;
  /** Filter change handler */
  onFilterChange?: (state: FilterState | null) => void;
  /** Translation function */
  t?: (key: string) => string;
  /** Locale for date picker */
  locale?: string;
  /** Whether filter panel is open */
  isOpen?: boolean;
  /** Toggle filter panel */
  onToggle?: (open: boolean) => void;
  /** Refresh current list query */
  onRefresh?: () => unknown;
  /** Whether the list is currently refreshing */
  isRefreshing?: boolean;
  /** Additional controls shown with filter and refresh actions. */
  toolbarSlot?: ReactNode;
};

/**
 * Filter bar with search input and collapsible filter panel
 */
export function FilterBar({
  searchValue,
  onSearch,
  filterConfig,
  filterState,
  onFilterChange,
  t = (key) => key,
  locale,
  isOpen = false,
  onToggle,
  onRefresh,
  isRefreshing,
  toolbarSlot,
}: FilterBarProps) {
  const hasFilters =
    filterConfig?.dateFields?.length ||
    filterConfig?.selectFilters?.length ||
    filterConfig?.statusFilter ||
    filterConfig?.httpMethodFilter ||
    filterConfig?.httpStatusCodeFilter;
  const activeFilterCount = countActiveFilters(filterState);

  if (!hasFilters) {
    // No filters configured, just show search
    return (
      <div className="flex w-full flex-wrap items-center gap-2 px-4 pt-4">
        <SearchInput
          initialValue={searchValue}
          onSearch={onSearch}
          placeholder={t("Search...")}
          ariaLabel={t("Search")}
          clearAriaLabel={t("Clear search")}
        />
        <div className="ml-auto flex items-center gap-2">
          {toolbarSlot}
          <TableRefreshButton onRefresh={onRefresh} isRefreshing={isRefreshing} t={t} className="ml-0" />
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle} className="px-4 pt-4">
      <div className="flex w-full flex-wrap items-center gap-2">
        <SearchInput
          initialValue={searchValue}
          onSearch={onSearch}
          placeholder={t("Search...")}
          ariaLabel={t("Search")}
          clearAriaLabel={t("Clear search")}
        />
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <FilterIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("Filters")}</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </CollapsibleTrigger>
        <div className="ml-auto flex items-center gap-2">
          {toolbarSlot}
          <TableRefreshButton onRefresh={onRefresh} isRefreshing={isRefreshing} t={t} className="ml-0" />
        </div>
      </div>
      <CollapsibleContent className="mt-3">
        <FilterPanel config={filterConfig} state={filterState} onChange={onFilterChange} t={t} locale={locale} />
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Count number of active filters
 */
function countActiveFilters(state?: FilterState): number {
  if (!state) return 0;

  let count = 0;

  // Count date filter as 1 if any date is set
  if (state.dateFilter?.range.from || state.dateFilter?.range.to) {
    count += 1;
  }

  if (state.selectValues) {
    count += Object.values(state.selectValues).filter(Boolean).length;
  }

  // Count each status filter
  if (state.statusFilters?.length) {
    count += state.statusFilters.length;
  }

  // Count HTTP method filter
  if (state.httpMethod) {
    count += 1;
  }

  // Count HTTP status code filter
  if (state.httpStatusCode) {
    count += 1;
  }

  return count;
}
