import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FilterState, HttpMethodFilter, HttpStatusCodeFilter, StatusFilter, TableQueryParams } from "../types";

type UseTableStateProps = {
  initialParams?: TableQueryParams;
  onChangeParams?: (params: TableQueryParams) => void;
  /** When true, disables URL sync entirely (for embedded tables like dashboard) */
  disableUrlSync?: boolean;
};

/**
 * Format date to YYYY-MM-DD for API (using local timezone)
 */
function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to local Date (avoids UTC parsing issues)
 */
function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Parse filter state from URL-friendly params
 */
function parseFilterStateFromParams(params: TableQueryParams): FilterState | null {
  const state: FilterState = {};

  // Parse date filter
  if (params.filter_date_field && (params.filter_date_from || params.filter_date_to)) {
    state.dateFilter = {
      field: params.filter_date_field,
      range: {
        from: params.filter_date_from ? parseDateString(params.filter_date_from) : undefined,
        to: params.filter_date_to ? parseDateString(params.filter_date_to) : undefined,
      },
    };
  }

  // Parse status filter
  if (params.filter_status) {
    state.statusFilters = params.filter_status.split(",") as StatusFilter[];
  }

  // Parse HTTP method filter
  if (params.filter_method) {
    state.httpMethod = params.filter_method as HttpMethodFilter;
  }

  // Parse HTTP status code filter
  if (params.filter_http_status) {
    state.httpStatusCode = params.filter_http_status as HttpStatusCodeFilter;
  }

  return Object.keys(state).length > 0 ? state : null;
}

/**
 * Build API query JSON from filter state
 * Note: API only supports flat field-level queries, not AND/OR operators
 * For multiple statuses, only the first is used (API limitation)
 */
export function buildQueryFromFilterState(state: FilterState | null): string | undefined {
  if (!state) return undefined;

  const query: Record<string, unknown> = {};

  // Date filter
  if (state.dateFilter?.range.from || state.dateFilter?.range.to) {
    const field = state.dateFilter.field;
    const range = state.dateFilter.range;

    if (range.from && range.to) {
      query[field] = { between: [formatDateForAPI(range.from), formatDateForAPI(range.to)] };
    } else if (range.from) {
      query[field] = { gte: formatDateForAPI(range.from) };
    } else if (range.to) {
      query[field] = { lte: formatDateForAPI(range.to) };
    }
  }

  // Status filter - apply first selected status only (API doesn't support OR)
  if (state.statusFilters?.length) {
    const status = state.statusFilters[0]; // Use first status
    const today = formatDateForAPI(new Date());

    switch (status) {
      case "paid":
        query.paid_in_full = { equals: true };
        break;
      case "unpaid":
        query.paid_in_full = { equals: false };
        query.voided_at = { equals: null };
        break;
      case "overdue":
        query.paid_in_full = { equals: false };
        query.date_due = { lt: today };
        query.voided_at = { equals: null };
        break;
      case "voided":
        query.voided_at = { not: null };
        break;
    }
  }

  if (Object.keys(query).length === 0) return undefined;
  return JSON.stringify(query);
}

/**
 * Manages table state (search, pagination, filters) with optional URL sync
 */
export function useTableState({ initialParams = {}, onChangeParams, disableUrlSync = false }: UseTableStateProps) {
  const [params, setParams] = useState<TableQueryParams>({
    ...initialParams,
  });

  // Use ref for onChangeParams to keep it stable
  const onChangeParamsRef = useRef(onChangeParams);
  onChangeParamsRef.current = onChangeParams;

  // Keep track of previous initialParams to detect changes
  const prevInitialParamsRef = useRef<string>(JSON.stringify(initialParams));
  // Flag to track if we're updating from initialParams (to avoid calling onChangeParams)
  const isUpdatingFromInitialRef = useRef(false);

  // Sync internal state when initialParams changes (e.g., when navigating to same page resets URL)
  useEffect(() => {
    const currentParamsStr = JSON.stringify(initialParams);

    // Only update if initialParams actually changed
    if (currentParamsStr !== prevInitialParamsRef.current) {
      prevInitialParamsRef.current = currentParamsStr;
      isUpdatingFromInitialRef.current = true;
      setParams({
        ...initialParams,
      });
    }
  }, [initialParams]);

  // Sync params to parent or URL when they change
  useEffect(() => {
    // Skip if we're updating from initialParams to avoid infinite loop
    if (isUpdatingFromInitialRef.current) {
      isUpdatingFromInitialRef.current = false;
      return;
    }

    // Skip URL sync entirely when disabled (e.g., dashboard embedded tables)
    if (disableUrlSync) {
      return;
    }

    const changeHandler = onChangeParamsRef.current;

    if (changeHandler) {
      // Notify parent of param changes (e.g., for router navigation)
      changeHandler(params);
    } else {
      // Update URL directly
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });

      const newUrl = `${window.location.pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      window.history.pushState({}, "", newUrl);
    }
  }, [params, disableUrlSync]);

  /**
   * Handle search change
   */
  const handleSearch = useCallback((value: string | null) => {
    setParams((prevParams) => ({
      ...prevParams,
      search: value?.trim() ?? undefined,
      prev_cursor: undefined,
      next_cursor: undefined,
    }));
  }, []);

  /**
   * Handle pagination change
   */
  const handlePageChange = useCallback((cursor: { prev?: string; next?: string }) => {
    setParams((prevParams) => ({
      ...prevParams,
      next_cursor: cursor.next,
      prev_cursor: cursor.next ? undefined : cursor.prev,
    }));
  }, []);

  /**
   * Handle filter change - stores URL-friendly params
   */
  const handleFilterChange = useCallback((state: FilterState | null) => {
    setParams((prevParams) => ({
      ...prevParams,
      // Clear old filter params
      filter_date_field: undefined,
      filter_date_from: undefined,
      filter_date_to: undefined,
      filter_status: undefined,
      filter_method: undefined,
      filter_http_status: undefined,
      // Set new filter params
      ...(state?.dateFilter && {
        filter_date_field: state.dateFilter.field,
        filter_date_from: state.dateFilter.range.from ? formatDateForAPI(state.dateFilter.range.from) : undefined,
        filter_date_to: state.dateFilter.range.to ? formatDateForAPI(state.dateFilter.range.to) : undefined,
      }),
      ...(state?.statusFilters?.length && {
        filter_status: state.statusFilters.join(","),
      }),
      ...(state?.httpMethod && {
        filter_method: state.httpMethod,
      }),
      ...(state?.httpStatusCode && {
        filter_http_status: state.httpStatusCode,
      }),
      prev_cursor: undefined,
      next_cursor: undefined,
    }));
  }, []);

  /**
   * Parse current filter state from URL params
   */
  const filterState = useMemo(() => {
    return parseFilterStateFromParams(params);
  }, [
    params.filter_date_field,
    params.filter_date_from,
    params.filter_date_to,
    params.filter_status,
    params.filter_method,
    params.filter_http_status,
    params,
  ]);

  /**
   * Build params for API call (includes query JSON built from filter state)
   * Note: filter_* params are kept for tables that need them (like request logs)
   * while query JSON is added for tables that use it (like invoices)
   */
  const apiParams = useMemo(() => {
    const query = buildQueryFromFilterState(filterState);
    return { ...params, query };
  }, [params, filterState]);

  return {
    params,
    apiParams,
    filterState,
    handleSearch,
    handlePageChange,
    handleFilterChange,
  };
}
