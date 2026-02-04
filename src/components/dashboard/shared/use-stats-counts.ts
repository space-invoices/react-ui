/**
 * Stats counts hook using the entity stats API.
 * Server-side counting for accurate totals.
 */
import { useQueries } from "@tanstack/react-query";
import { useSDK } from "@/ui/providers/sdk-provider";
import { STATS_QUERY_CACHE_KEY } from "./use-stats-query";

export const STATS_COUNTS_CACHE_KEY = "dashboard-stats-counts";

export type StatsCountsData = {
  invoices: number;
  estimates: number;
  customers: number;
  items: number;
};

export function useStatsCountsData(entityId: string | undefined) {
  const { sdk } = useSDK();

  const queries = useQueries({
    queries: [
      // Invoices count
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "count-invoices"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            { metrics: [{ type: "count", alias: "total" }], table: "invoices" },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 30_000,
      },
      // Estimates count
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "count-estimates"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            { metrics: [{ type: "count", alias: "total" }], table: "estimates" },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 30_000,
      },
      // Customers count
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "count-customers"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            { metrics: [{ type: "count", alias: "total" }], table: "customers" },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 30_000,
      },
      // Items count
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "count-items"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            { metrics: [{ type: "count", alias: "total" }], table: "items" },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 30_000,
      },
    ],
  });

  const [invoicesQuery, estimatesQuery, customersQuery, itemsQuery] = queries;

  return {
    data: {
      invoices: Number(invoicesQuery.data?.data?.[0]?.total) || 0,
      estimates: Number(estimatesQuery.data?.data?.[0]?.total) || 0,
      customers: Number(customersQuery.data?.data?.[0]?.total) || 0,
      items: Number(itemsQuery.data?.data?.[0]?.total) || 0,
    } as StatsCountsData,
    isLoading: queries.some((q) => q.isLoading),
  };
}
