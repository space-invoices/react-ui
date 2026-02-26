/**
 * Stats counts hook using the entity stats API.
 * Server-side counting for accurate totals.
 * Sends 4 queries in a single batch request.
 */
import type { StatsQueryRequest } from "@spaceinvoices/js-sdk";
import { useStatsBatchQuery } from "./use-stats-query";

export const STATS_COUNTS_CACHE_KEY = "dashboard-stats-counts";

export type StatsCountsData = {
  invoices: number;
  estimates: number;
  customers: number;
  items: number;
};

export function useStatsCountsData(entityId: string | undefined) {
  const queries: StatsQueryRequest[] = [
    { metrics: [{ type: "count", alias: "total" }], table: "invoices" },
    { metrics: [{ type: "count", alias: "total" }], table: "estimates" },
    { metrics: [{ type: "count", alias: "total" }], table: "customers" },
    { metrics: [{ type: "count", alias: "total" }], table: "items" },
  ];

  const { data: results, isLoading } = useStatsBatchQuery(entityId, "stats-counts", queries, {
    select: (batch) => ({
      invoices: Number(batch[0].data?.[0]?.total) || 0,
      estimates: Number(batch[1].data?.[0]?.total) || 0,
      customers: Number(batch[2].data?.[0]?.total) || 0,
      items: Number(batch[3].data?.[0]?.total) || 0,
    }),
  });

  return {
    data: (results ?? { invoices: 0, estimates: 0, customers: 0, items: 0 }) as StatsCountsData,
    isLoading,
  };
}
