/**
 * Stats counts hook using the entity stats API.
 * Server-side counting for accurate totals; counts include drafts.
 * Sends 4 queries in a single batch request.
 */
import type { StatsQueryRequest } from "@spaceinvoices/js-sdk";
import { type DashboardQueryResult, readNumber, resolveUnavailable } from "./dashboard-query-state";
import { useStatsBatchQuery } from "./use-stats-query";

export const STATS_COUNTS_CACHE_KEY = "dashboard-stats-counts";

export type StatsCountsData = {
  invoices: number;
  estimates: number;
  customers: number;
  items: number;
};

export function useStatsCountsData(entityId: string | undefined): DashboardQueryResult<StatsCountsData> {
  const queries: StatsQueryRequest[] = [
    { metrics: [{ type: "count", alias: "total" }], table: "invoices" },
    { metrics: [{ type: "count", alias: "total" }], table: "estimates" },
    { metrics: [{ type: "count", alias: "total" }], table: "customers" },
    { metrics: [{ type: "count", alias: "total" }], table: "items" },
  ];

  const query = useStatsBatchQuery(entityId, "stats-counts", queries, {
    select: (batch): StatsCountsData => ({
      invoices: readNumber(batch[0].data?.[0], "total"),
      estimates: readNumber(batch[1].data?.[0], "total"),
      customers: readNumber(batch[2].data?.[0], "total"),
      items: readNumber(batch[3].data?.[0], "total"),
    }),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    unavailable: resolveUnavailable({ isError: query.isError }),
    retry: () => void query.refetch(),
  };
}
