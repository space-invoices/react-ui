import type { TableQueryParams, TableQueryResponse } from "../types";

/**
 * Creates a fetch handler that includes entity ID in requests
 * This is a simple wrapper to ensure consistent entity filtering
 */
export function useTableFetch<T>(
  fetchFn: (params: TableQueryParams) => Promise<TableQueryResponse<T>>,
  entityId?: string,
) {
  return async (params: TableQueryParams) => {
    return fetchFn({
      ...params,
      entity_id: entityId,
    });
  };
}
