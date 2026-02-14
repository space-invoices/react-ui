import type { JSX, ReactNode } from "react";
import { Fragment, memo, useCallback, useMemo, useState } from "react";

import { Checkbox } from "@/ui/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/components/ui/table";
import { FilterBar } from "./filter-bar";
import { useTableQuery } from "./hooks/use-table-query";
import { useTableState } from "./hooks/use-table-state";
import { SortableHeader } from "./sortable-header";
import { TableEmptyState } from "./table-empty-state";
import { TableNoResults } from "./table-no-results";
import { Pagination } from "./table-pagination";
import { TableSkeleton } from "./table-skeleton";
import type { Column, FilterConfig, TableQueryParams, TableQueryResponse } from "./types";

export type DataTableProps<T> = {
  /** Column definitions */
  columns: Column<T>[];
  /** Unique cache key for react-query */
  cacheKey: string;
  /** Fetch function for data */
  onFetch: (params: TableQueryParams) => Promise<TableQueryResponse<T>>;
  /** Resource name for empty states (e.g., "customer", "invoice") */
  resourceName: string;
  /** Default sort order (e.g., "-id", "name") */
  defaultOrderBy?: string;
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
  /** Optional row click handler */
  onRowClick?: (item: T) => void;
  /** Custom row renderer (overrides default cell rendering) */
  renderRow?: (item: T) => ReactNode;
  /** Custom header renderer (overrides default header) */
  renderHeader?: (props: { orderBy?: string; onSort?: (order: string | null) => void }) => ReactNode;
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
  selectionToolbar?: (selectedCount: number) => ReactNode;
};

/**
 * Generic data table with built-in sorting, search, pagination, and loading states
 */
export function DataTable<T extends { id: string }>({
  columns,
  cacheKey,
  onFetch,
  resourceName,
  defaultOrderBy = "-id",
  queryParams,
  onChangeParams,
  disableUrlSync,
  entityId,
  createNewLink,
  createNewTrigger,
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
}: DataTableProps<T>) {
  // Filter panel open state - starts open if filters are active in URL
  const hasInitialFilters = Boolean(
    queryParams?.filter_date_from ||
      queryParams?.filter_date_to ||
      queryParams?.filter_status ||
      queryParams?.filter_method ||
      queryParams?.filter_http_status,
  );
  const [filterPanelOpen, setFilterPanelOpen] = useState(hasInitialFilters);

  // Manage table state (sort, search, pagination, filters)
  const { params, apiParams, filterState, handleSort, handleSearch, handlePageChange, handleFilterChange } =
    useTableState({
      initialParams: queryParams,
      defaultOrderBy,
      onChangeParams,
      disableUrlSync,
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
      params.filter_http_status,
  );

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
      <div className="space-y-4">
        <FilterBar
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
        <TableSkeleton columns={columns.length + (selectable ? 1 : 0)} rows={10} />
      </div>
    );
  }

  // Show empty state only when no data AND no active search/filters
  // (this means truly empty collection, not filtered to zero results)
  if (data.length === 0 && !hasActiveFilters) {
    return (
      <TableEmptyState
        resource={resourceName}
        createNewLink={createNewLink}
        createNewTrigger={createNewTrigger}
        t={t}
      />
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
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

      {selectable && selectedCount > 0 && selectionToolbar && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
          {selectionToolbar(selectedCount)}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          {renderHeader ? (
            renderHeader({ orderBy: params.order_by, onSort: handleSort })
          ) : (
            <DefaultTableHeader
              columns={columns}
              orderBy={params.order_by}
              onSort={handleSort}
              selectable={selectable}
              allPageSelected={allPageSelected}
              somePageSelected={somePageSelected}
              onToggleAll={handleToggleAll}
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
              <TableNoResults resource={resourceName} search={handleSearch} t={t} />
            )}
          </TableBody>
        </Table>

        <div className="border-t px-4 py-3">
          <Pagination
            prevCursor={queryResult?.pagination.prev_cursor}
            nextCursor={queryResult?.pagination.next_cursor}
            onPageChange={handlePageChange}
          />
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
  orderBy,
  onSort,
  selectable,
  allPageSelected,
  somePageSelected,
  onToggleAll,
}: {
  columns: Column<T>[];
  orderBy?: string;
  onSort?: (order: string | null) => void;
  selectable?: boolean;
  allPageSelected?: boolean;
  somePageSelected?: boolean;
  onToggleAll?: () => void;
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
        {columns.map((column) => (
          <TableHead key={column.id} className={column.className} style={{ textAlign: column.align }}>
            {column.sortable ? (
              <SortableHeader
                field={column.sortField ?? column.id}
                currentOrder={orderBy}
                onSort={onSort}
                align={column.align}
              >
                {column.header}
              </SortableHeader>
            ) : (
              column.header
            )}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}) as <T>(props: {
  columns: Column<T>[];
  orderBy?: string;
  onSort?: (order: string | null) => void;
  selectable?: boolean;
  allPageSelected?: boolean;
  somePageSelected?: boolean;
  onToggleAll?: () => void;
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
        <TableCell key={column.id} className={column.className} style={{ textAlign: column.align }}>
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
