import { FilterIcon } from "lucide-react";

import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/components/ui/collapsible";

import { FilterPanel } from "./filter-panel";
import { SearchInput } from "./search-input";
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
}: FilterBarProps) {
  const hasFilters =
    filterConfig?.dateFields?.length ||
    filterConfig?.statusFilter ||
    filterConfig?.httpMethodFilter ||
    filterConfig?.httpStatusCodeFilter;
  const activeFilterCount = countActiveFilters(filterState);

  if (!hasFilters) {
    // No filters configured, just show search
    return (
      <div className="px-4 pt-4">
        <SearchInput initialValue={searchValue} onSearch={onSearch} placeholder={t("Search...")} />
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle} className="px-4 pt-4">
      <div className="flex items-center gap-2">
        <SearchInput initialValue={searchValue} onSearch={onSearch} placeholder={t("Search...")} />
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
