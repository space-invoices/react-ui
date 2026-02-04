import type { JSX, ReactNode } from "react";
import { Fragment, memo, useState } from "react";

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
        <TableSkeleton columns={columns.length} rows={10} />
      </div>
    );
  }

  // Show empty state only when no data AND no active search/filters
  // (this means truly empty collection, not filtered to zero results)
  if (data.length === 0 && !hasActiveFilters) {
    return (
      <TableEmptyState resource={resourceName} createNewLink={createNewLink} createNewTrigger={createNewTrigger} />
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

      <div className="rounded-lg border">
        <Table>
          {renderHeader ? (
            renderHeader({ orderBy: params.order_by, onSort: handleSort })
          ) : (
            <DefaultTableHeader columns={columns} orderBy={params.order_by} onSort={handleSort} />
          )}

          <TableBody>
            {data.length > 0 ? (
              data.map((item) => {
                if (renderRow) {
                  // Custom row renderer - wrap in Fragment with key
                  return <Fragment key={item.id}>{renderRow(item)}</Fragment>;
                }

                // Default row renderer
                return <DefaultTableRow key={item.id} item={item} columns={columns} onRowClick={onRowClick} />;
              })
            ) : (
              <TableNoResults resource={resourceName} search={handleSearch} />
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
}: {
  columns: Column<T>[];
  orderBy?: string;
  onSort?: (order: string | null) => void;
}) {
  return (
    <TableHeader>
      <TableRow>
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
}) as <T>(props: { columns: Column<T>[]; orderBy?: string; onSort?: (order: string | null) => void }) => JSX.Element;

/**
 * Default row renderer using column definitions
 */
const DefaultTableRow = memo(function DefaultTableRow<T extends { id: string }>({
  item,
  columns,
  onRowClick,
}: {
  item: T;
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
}) {
  return (
    <TableRow className={onRowClick ? "cursor-pointer" : undefined} onClick={() => onRowClick?.(item)}>
      {columns.map((column) => (
        <TableCell key={column.id} className={column.className} style={{ textAlign: column.align }}>
          {column.cell(item)}
        </TableCell>
      ))}
    </TableRow>
  );
}) as <T extends { id: string }>(props: {
  item: T;
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
}) => JSX.Element;
