/**
 * Table Component Library
 *
 * A comprehensive, type-safe table system with built-in:
 * - Sorting (client and server-side)
 * - Search/filtering
 * - Cursor-based pagination
 * - Loading states
 * - Empty states
 * - TanStack Query integration
 */

export type { DataTableProps } from "./data-table";
// Main component
export { DataTable } from "./data-table";
export { FormattedDate } from "./date-cell";
// Hooks
export { useTableFetch } from "./hooks/use-table-fetch";
export { useTableQuery } from "./hooks/use-table-query";
export { useTableState } from "./hooks/use-table-state";
// Supporting components
export { SearchInput } from "./search-input";
export { SortableHeader } from "./sortable-header";
export { TableEmptyState } from "./table-empty-state";
export { TableNoResults } from "./table-no-results";
export { Pagination } from "./table-pagination";
export { TableSkeleton } from "./table-skeleton";

// Types
export type {
  Column,
  ListTableProps,
  TableQueryParams,
  TableQueryResponse,
} from "./types";
