/**
 * Base hook for stats queries using the entity stats API.
 * Provides server-side aggregation instead of client-side calculation.
 */
import type { StatsQueryBatchResponse, StatsQueryRequest, StatsQueryResponse } from "@spaceinvoices/js-sdk";
import { entityStats } from "@spaceinvoices/js-sdk";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";

export const STATS_QUERY_CACHE_KEY = "entity-stats-query";

export type StatsQueryOptions<TData = StatsQueryResponse> = Omit<
  UseQueryOptions<StatsQueryResponse, Error, TData>,
  "queryKey" | "queryFn"
>;

/**
 * Generic hook for executing a single stats query.
 * Wraps the query in a batch array and unwraps the first result.
 * Use this as a base for simple stats hooks.
 */
export function useStatsQuery<TData = StatsQueryResponse>(
  entityId: string | undefined,
  query: StatsQueryRequest,
  options?: StatsQueryOptions<TData>,
) {
  return useQuery({
    queryKey: [STATS_QUERY_CACHE_KEY, entityId, query],
    queryFn: async () => {
      if (!entityId) throw new Error("Missing entity");
      const results = await entityStats.queryEntityStats([query], { entity_id: entityId });
      return results[0];
    },
    enabled: !!entityId,
    staleTime: 120_000, // 2 minutes
    ...options,
  });
}

export type StatsBatchQueryOptions<TData = StatsQueryBatchResponse> = Omit<
  UseQueryOptions<StatsQueryBatchResponse, Error, TData>,
  "queryKey" | "queryFn"
>;

/**
 * Hook for executing a batch of stats queries in a single request.
 * Returns all results in the same order as the input queries.
 */
export function useStatsBatchQuery<TData = StatsQueryBatchResponse>(
  entityId: string | undefined,
  queryKey: string,
  queries: StatsQueryRequest[],
  options?: StatsBatchQueryOptions<TData>,
) {
  return useQuery({
    queryKey: [STATS_QUERY_CACHE_KEY, entityId, queryKey, queries],
    queryFn: async () => {
      if (!entityId) throw new Error("Missing entity");
      return entityStats.queryEntityStats(queries, { entity_id: entityId });
    },
    enabled: !!entityId,
    staleTime: 120_000,
    ...options,
  });
}
