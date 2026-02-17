import type { ReactNode } from "react";

/**
 * Column definition for table headers and cells
 */
export type Column<T> = {
  /** Unique identifier for the column */
  id: string;
  /** Header label or component */
  header: ReactNode;
  /** Cell renderer function - returns content for each row. Optional when using renderRow. */
  cell?: (item: T) => ReactNode;
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Optional CSS class for the column */
  className?: string;
};

/**
 * Query parameters for table data fetching
 */
export type TableQueryParams = {
  search?: string;
  prev_cursor?: string;
  next_cursor?: string;
  entity_id?: string;
  limit?: number;
  query?: string; // JSON string for API query filters (built from filter_* params)
  // URL-friendly filter params (used for URL state, converted to query for API)
  filter_date_field?: string;
  filter_date_from?: string; // YYYY-MM-DD
  filter_date_to?: string; // YYYY-MM-DD
  filter_status?: string; // comma-separated: "paid,unpaid,overdue,voided"
  // HTTP-specific filter params (for request logs)
  filter_method?: string; // GET, POST, PATCH, PUT, DELETE
  filter_http_status?: string; // 2xx, 4xx, 5xx
};

/**
 * Date range for filtering
 */
export type DateRange = {
  from?: Date;
  to?: Date;
};

/**
 * Date filter state
 */
export type DateFilter = {
  field: string;
  range: DateRange;
};

/**
 * Status filter options (invoice status)
 */
export type StatusFilter = "paid" | "unpaid" | "overdue" | "voided";

/**
 * HTTP method filter options
 */
export type HttpMethodFilter = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * HTTP status code filter options (prefix patterns like 2xx, 4xx, 5xx)
 */
export type HttpStatusCodeFilter = "2xx" | "4xx" | "5xx";

/**
 * Filterable date field definition
 */
export type FilterableDateField = {
  id: string;
  label: string;
};

/**
 * Filter configuration for tables
 */
export type FilterConfig = {
  dateFields?: FilterableDateField[];
  statusFilter?: boolean;
  /** Enable HTTP method filter (for request logs) */
  httpMethodFilter?: boolean;
  /** Enable HTTP status code filter (for request logs) */
  httpStatusCodeFilter?: boolean;
};

/**
 * Current filter state
 */
export type FilterState = {
  dateFilter?: DateFilter;
  statusFilters?: StatusFilter[];
  /** Selected HTTP method (for request logs) */
  httpMethod?: HttpMethodFilter;
  /** Selected HTTP status code pattern (for request logs) */
  httpStatusCode?: HttpStatusCodeFilter;
};

/**
 * Pagination metadata structure
 */
export type PaginationMetadata = {
  total: number;
  next_cursor: string | null;
  prev_cursor: string | null;
  has_more: boolean;
};

/**
 * Response structure from table data fetch
 */
export type TableQueryResponse<T> = {
  data: T[];
  pagination: PaginationMetadata;
};

/**
 * Props for list table components
 */
export type ListTableProps<T> = {
  createNewTrigger?: ReactNode;
  queryParams?: TableQueryParams;
  onChangeParams?: (params: TableQueryParams) => void;
  /** When true, disables URL sync entirely (for embedded tables like dashboard) */
  disableUrlSync?: boolean;
  onRowClick?: (item: T) => void;
  entityId?: string;
};
