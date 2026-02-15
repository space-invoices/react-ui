/**
 * Base hook for stats queries using the entity stats API.
 * Provides server-side aggregation instead of client-side calculation.
 */
import type { StatsQueryRequest, StatsQueryResponse } from "@spaceinvoices/js-sdk";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { useSDK } from "@/ui/providers/sdk-provider";

export const STATS_QUERY_CACHE_KEY = "entity-stats-query";

export type StatsQueryOptions<TData = StatsQueryResponse> = Omit<
  UseQueryOptions<StatsQueryResponse, Error, TData>,
  "queryKey" | "queryFn"
>;

/**
 * Generic hook for executing stats queries.
 * Use this as a base for specific stats hooks.
 */
export function useStatsQuery<TData = StatsQueryResponse>(
  entityId: string | undefined,
  query: StatsQueryRequest,
  options?: StatsQueryOptions<TData>,
) {
  const { sdk } = useSDK();

  return useQuery({
    queryKey: [STATS_QUERY_CACHE_KEY, entityId, query],
    queryFn: async () => {
      if (!entityId || !sdk) throw new Error("Missing entity or SDK");
      // SDK's wrapMethod already unwraps success response and throws on error
      return await sdk.entityStats.queryEntityStats(query, { entity_id: entityId });
    },
    enabled: !!entityId && !!sdk,
    staleTime: 120_000, // 2 minutes
    ...options,
  });
}
