import { useQuery } from "@tanstack/react-query";
import type { TableQueryParams, TableQueryResponse } from "../types";

// Re-export types for backward compatibility with tests
export type { TableQueryParams, TableQueryResponse };

type UseTableQueryOptions<T> = {
  /** Unique cache key for the query */
  cacheKey: string;
  /** Fetch function that returns table data */
  fetchFn: (params: TableQueryParams) => Promise<TableQueryResponse<T>>;
  /** Current query parameters */
  params: TableQueryParams;
  /** Optional entity ID for multi-tenant filtering */
  entityId?: string;
  /** Enable/disable the query */
  enabled?: boolean;
};

/**
 * Simplified table query hook using TanStack Query
 */
export function useTableQuery<T>({ cacheKey, fetchFn, params, entityId, enabled = true }: UseTableQueryOptions<T>) {
  // Build query key with consistent structure for cache invalidation
  const queryKey = entityId ? [cacheKey, { entityId }, params] : [cacheKey, params];

  return useQuery({
    queryKey,
    queryFn: () => fetchFn({ ...params, entity_id: entityId }),
    staleTime: 1000 * 60 * 2, // Data is fresh for 2 minutes (unless invalidated)
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnMount: true, // Refetch when mounting if data is stale (including when invalidated)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch on reconnect
    retry: 1,
    retryDelay: 1000,
    enabled,
  });
}
