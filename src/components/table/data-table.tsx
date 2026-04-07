import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { JSX, ReactNode } from "react";
import { Fragment, lazy, memo, Suspense, useCallback, useMemo, useState } from "react";

import { Checkbox } from "@/ui/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/components/ui/table";
import { cn } from "@/ui/lib/utils";
import { useTableQuery } from "./hooks/use-table-query";
import { useTableState } from "./hooks/use-table-state";
import { SearchInput } from "./search-input";
import { getColumnSortDirection, getNextColumnOrderBy, isSortableColumn } from "./sorting";
import { TableEmptyState } from "./table-empty-state";
import { TableNoResults } from "./table-no-results";
import { Pagination } from "./table-pagination";
import { TableSkeleton } from "./table-skeleton";
import type { Column, FilterConfig, TableQueryParams, TableQueryResponse } from "./types";

const LazyFilterBar = lazy(() => import("./filter-bar").then((module) => ({ default: module.FilterBar })));

export type DataTableProps<T> = {
  /** Column definitions */
  columns: Column<T>[];
  /** Unique cache key for react-query */
  cacheKey: string;
  /** Fetch function for data */
  onFetch: (params: TableQueryParams) => Promise<TableQueryResponse<T>>;
  /** Resource name for empty states (e.g., "customer", "invoice") */
  resourceName: string;
  /** Initial/external query parameters */
  queryParams?: TableQueryParams;
  /** Callback when params change (for external state management) */
  onChangeParams?: (params: TableQueryParams) => void;
  /** When true, disables URL sync entirely (for embedded tables like dashboard) */
  disableUrlSync?: boolean;
  /** Optional entity ID for filtering */
  entityId?: string;
  /** Link for "Create New" button */
  createNewLink?: string;
  /** Custom trigger for create action */
  createNewTrigger?: ReactNode;
  /** Callback for "Create new" click — enables client-side navigation instead of full page reload */
  onCreateNew?: () => void;
  /** Optional row click handler */
  onRowClick?: (item: T) => void;
  /** Custom row renderer (overrides default cell rendering) */
  renderRow?: (item: T) => ReactNode;
  /** Custom header renderer (overrides default header) */
  renderHeader?: () => ReactNode;
  /** Filter configuration (date fields, status filter) */
  filterConfig?: FilterConfig;
  /** Translation function */
  t?: (key: string) => string;
  /** Locale for date formatting */
  locale?: string;
  /** Enable row selection with checkboxes */
  selectable?: boolean;
  /** Currently selected IDs (controlled) */
  selectedIds?: Set<string>;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Content to render in selection toolbar (shown when items selected) */
  selectionToolbar?: (selectedCount: number, data: T[]) => ReactNode;
  /** When false, hides the search / filter toolbar area */
  showSearchToolbar?: boolean;
  /** Custom empty state for truly empty collections */
  emptyState?: ReactNode;
  /** When false, hides the pagination footer */
  showPagination?: boolean;
  /** Horizontal inset around the table block and related states */
  contentInsetClassName?: string;
  /** Bottom padding on the overall table wrapper */
  bottomPaddingClassName?: string;
};

function hasFilterControls(filterConfig?: FilterConfig) {
  return Boolean(
    filterConfig?.dateFields?.length ||
      filterConfig?.statusFilter ||
      filterConfig?.httpMethodFilter ||
      filterConfig?.httpStatusCodeFilter,
  );
}

function SearchToolbar({
  searchValue,
  onSearch,
  t,
}: {
  searchValue?: string;
  onSearch: (value: string | null) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 pt-4 sm:flex-row sm:items-center">
      <SearchInput
        initialValue={searchValue}
        onSearch={onSearch}
        placeholder={t("Search...")}
        ariaLabel={t("Search")}
        clearAriaLabel={t("Clear search")}
      />
    </div>
  );
}

/**
 * Generic data table with built-in sorting, search, pagination, and loading states
 */
export function DataTable<T extends { id: string }>({
  columns,
  cacheKey,
  onFetch,
  resourceName,
  queryParams,
  onChangeParams,
  disableUrlSync,
  entityId,
  createNewLink,
  createNewTrigger,
  onCreateNew,
  onRowClick,
  renderRow,
  renderHeader,
  filterConfig,
  t = (key) => key,
  locale,
  selectable,
  selectedIds,
  onSelectionChange,
  selectionToolbar,
  showSearchToolbar = true,
  emptyState,
  showPagination = true,
  contentInsetClassName = "px-4",
  bottomPaddingClassName = "pb-4",
}: DataTableProps<T>) {
  const hasFilters = hasFilterControls(filterConfig);
  const displayRows = Math.max(queryParams?.limit ?? 10, 1);
  // Filter panel open state - starts open if filters are active in URL
  const hasInitialFilters = Boolean(
    queryParams?.filter_date_from ||
      queryParams?.filter_date_to ||
      queryParams?.filter_status ||
      queryParams?.filter_method ||
      queryParams?.filter_http_status ||
      queryParams?.filter_client_name,
  );
  const [filterPanelOpen, setFilterPanelOpen] = useState(hasInitialFilters);

  // Manage table state (search, pagination, filters)
  const { params, apiParams, filterState, handleSearch, handlePageChange, handleFilterChange, handleSortChange } =
    useTableState({
      initialParams: queryParams,
      onChangeParams,
      disableUrlSync,
      filterConfig,
    });

  // Fetch table data (use apiParams which has the query JSON for API)
  const { data: queryResult, isFetching } = useTableQuery<T>({
    cacheKey,
    fetchFn: onFetch,
    params: apiParams,
    entityId,
  });

  const data = queryResult?.data ?? [];
  const hasActiveFilters = Boolean(
    params.search ||
      params.filter_date_from ||
      params.filter_date_to ||
      params.filter_status ||
      params.filter_method ||
      params.filter_http_status ||
      params.filter_client_name,
  );

  // Combined clear handler for both search and filters
  const handleClearAll = useCallback(() => {
    handleSearch(null);
    handleFilterChange(null);
  }, [handleSearch, handleFilterChange]);

  // Selection helpers
  const pageIds = useMemo(() => data.map((item) => item.id), [data]);
  const selectedCount = selectedIds?.size ?? 0;
  const allPageSelected = selectable && pageIds.length > 0 && pageIds.every((id) => selectedIds?.has(id));
  const somePageSelected = selectable && pageIds.some((id) => selectedIds?.has(id));

  const handleToggleAll = useCallback(() => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (allPageSelected) {
      // Deselect all on current page
      for (const id of pageIds) {
        next.delete(id);
      }
    } else {
      // Select all on current page
      for (const id of pageIds) {
        next.add(id);
      }
    }
    onSelectionChange(next);
  }, [onSelectionChange, selectedIds, allPageSelected, pageIds]);

  const handleToggleRow = useCallback(
    (id: string) => {
      if (!onSelectionChange || !selectedIds) return;
      const next = new Set(selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectionChange(next);
    },
    [onSelectionChange, selectedIds],
  );

  // Show skeleton during initial load (with filter bar for consistency)
  if (isFetching && !queryResult) {
    return (
      <div className={cn("space-y-4", bottomPaddingClassName)}>
        {showSearchToolbar &&
          (hasFilters ? (
            <Suspense fallback={<SearchToolbar searchValue={params.search} onSearch={handleSearch} t={t} />}>
              <LazyFilterBar
                searchValue={params.search}
                onSearch={handleSearch}
                filterConfig={filterConfig}
                filterState={filterState ?? undefined}
                onFilterChange={handleFilterChange}
                t={t}
                locale={locale}
                isOpen={filterPanelOpen}
                onToggle={setFilterPanelOpen}
              />
            </Suspense>
          ) : (
            <SearchToolbar searchValue={params.search} onSearch={handleSearch} t={t} />
          ))}
        <div className={contentInsetClassName}>
          <TableSkeleton
            columns={columns.length + (selectable ? 1 : 0)}
            rows={displayRows}
            showSearch={false}
            showPagination={showPagination}
          />
        </div>
      </div>
    );
  }

  // Show empty state only when no data AND no active search/filters
  // (this means truly empty collection, not filtered to zero results)
  if (data.length === 0 && !hasActiveFilters) {
    return (
      <div className={cn(contentInsetClassName, bottomPaddingClassName)}>
        {emptyState ? (
          emptyState
        ) : (
          <TableEmptyState
            resource={resourceName}
            createNewLink={createNewLink}
            createNewTrigger={createNewTrigger}
            onCreateNew={onCreateNew}
            rows={displayRows}
            t={t}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", bottomPaddingClassName)}>
      {showSearchToolbar &&
        (hasFilters ? (
          <Suspense fallback={<SearchToolbar searchValue={params.search} onSearch={handleSearch} t={t} />}>
            <LazyFilterBar
              searchValue={params.search}
              onSearch={handleSearch}
              filterConfig={filterConfig}
              filterState={filterState ?? undefined}
              onFilterChange={handleFilterChange}
              t={t}
              locale={locale}
              isOpen={filterPanelOpen}
              onToggle={setFilterPanelOpen}
            />
          </Suspense>
        ) : (
          <SearchToolbar searchValue={params.search} onSearch={handleSearch} t={t} />
        ))}

      {selectable && selectedCount > 0 && selectionToolbar && (
        <div className={contentInsetClassName}>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
            {selectionToolbar(selectedCount, data)}
          </div>
        </div>
      )}

      <div className={contentInsetClassName}>
        <div className="rounded-lg border">
          <Table>
            {renderHeader ? (
              renderHeader()
            ) : (
              <DefaultTableHeader
                columns={columns}
                selectable={selectable}
                allPageSelected={allPageSelected}
                somePageSelected={somePageSelected}
                onToggleAll={handleToggleAll}
                orderBy={params.order_by}
                onSortChange={handleSortChange}
                t={t}
              />
            )}

            <TableBody>
              {data.length > 0 ? (
                data.map((item) => {
                  if (renderRow) {
                    // Custom row renderer - wrap in Fragment with key
                    return <Fragment key={item.id}>{renderRow(item)}</Fragment>;
                  }

                  // Default row renderer
                  return (
                    <DefaultTableRow
                      key={item.id}
                      item={item}
                      columns={columns}
                      onRowClick={onRowClick}
                      selectable={selectable}
                      isSelected={selectedIds?.has(item.id)}
                      onToggleSelect={handleToggleRow}
                    />
                  );
                })
              ) : (
                <TableNoResults resource={resourceName} search={handleSearch} onClear={handleClearAll} t={t} />
              )}
            </TableBody>
          </Table>

          {showPagination && (
            <div className="border-t px-4 py-3">
              <Pagination
                prevCursor={queryResult?.pagination.prev_cursor}
                nextCursor={queryResult?.pagination.next_cursor}
                onPageChange={handlePageChange}
                t={t}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Default header renderer using column definitions
 */
const DefaultTableHeader = memo(function DefaultTableHeader<T>({
  columns,
  selectable,
  allPageSelected,
  somePageSelected,
  onToggleAll,
  orderBy,
  onSortChange,
  t,
}: {
  columns: Column<T>[];
  selectable?: boolean;
  allPageSelected?: boolean;
  somePageSelected?: boolean;
  onToggleAll?: () => void;
  orderBy?: TableQueryParams["order_by"];
  onSortChange?: (orderBy: TableQueryParams["order_by"]) => void;
  t: (key: string) => string;
}) {
  return (
    <TableHeader>
      <TableRow>
        {selectable && (
          <TableHead className="w-[40px]">
            <Checkbox
              checked={allPageSelected || false}
              indeterminate={!allPageSelected && somePageSelected}
              onCheckedChange={onToggleAll}
            />
          </TableHead>
        )}
        {columns.map((column) => {
          const sortDirection = getColumnSortDirection(column, orderBy);
          const sortable = isSortableColumn(column);
          const SortIcon = sortDirection === "asc" ? ArrowUp : sortDirection === "desc" ? ArrowDown : ArrowUpDown;
          const sortAriaLabel = typeof column.header === "string" ? `${t("Sort by")} ${column.header}` : t("Sort by");

          return (
            <TableHead
              key={column.id}
              className={cn(column.id === "actions" && "w-[52px] whitespace-nowrap", column.className)}
              style={{ textAlign: column.align }}
              aria-sort={
                sortable
                  ? sortDirection === "asc"
                    ? "ascending"
                    : sortDirection === "desc"
                      ? "descending"
                      : "none"
                  : undefined
              }
            >
              {sortable ? (
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-1 rounded py-1 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    column.align === "center" && "justify-center",
                    column.align === "right" && "justify-end",
                  )}
                  onClick={() => onSortChange?.(getNextColumnOrderBy(column, orderBy))}
                  aria-label={sortAriaLabel}
                >
                  <span>{column.header}</span>
                  <SortIcon className={cn("h-3.5 w-3.5 shrink-0", sortDirection === null && "text-muted-foreground")} />
                </button>
              ) : (
                column.header
              )}
            </TableHead>
          );
        })}
      </TableRow>
    </TableHeader>
  );
}) as <T>(props: {
  columns: Column<T>[];
  selectable?: boolean;
  allPageSelected?: boolean;
  somePageSelected?: boolean;
  onToggleAll?: () => void;
  orderBy?: TableQueryParams["order_by"];
  onSortChange?: (orderBy: TableQueryParams["order_by"]) => void;
  t: (key: string) => string;
}) => JSX.Element;

/**
 * Default row renderer using column definitions
 */
const DefaultTableRow = memo(function DefaultTableRow<T extends { id: string }>({
  item,
  columns,
  onRowClick,
  selectable,
  isSelected,
  onToggleSelect,
}: {
  item: T;
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  return (
    <TableRow className={onRowClick ? "cursor-pointer" : undefined} onClick={() => onRowClick?.(item)}>
      {selectable && (
        <TableCell className="w-[40px]">
          <Checkbox
            checked={isSelected || false}
            onCheckedChange={() => onToggleSelect?.(item.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </TableCell>
      )}
      {columns.map((column) => (
        <TableCell
          key={column.id}
          className={cn(column.id === "actions" && "w-[52px] whitespace-nowrap", column.className)}
          style={{ textAlign: column.align }}
        >
          {column.cell?.(item)}
        </TableCell>
      ))}
    </TableRow>
  );
}) as <T extends { id: string }>(props: {
  item: T;
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) => JSX.Element;
