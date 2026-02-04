/**
 * Revenue data hook using the entity stats API.
 * Server-side aggregation for accurate calculations.
 */
import type { StatsQueryDataItem } from "@spaceinvoices/js-sdk";
import { useQueries } from "@tanstack/react-query";
import { useSDK } from "@/ui/providers/sdk-provider";
import { STATS_QUERY_CACHE_KEY } from "./use-stats-query";

export const REVENUE_DATA_CACHE_KEY = "dashboard-revenue-data";

function getMonthDateRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: firstDay.toISOString().split("T")[0],
    to: lastDay.toISOString().split("T")[0],
  };
}

function getYearDateRange() {
  const year = new Date().getFullYear();
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  };
}

export type RevenueData = {
  thisMonth: number;
  thisYear: number;
  outstanding: number;
  overdue: number;
  overdueCount: number;
  currency: string;
};

export function useRevenueData(entityId: string | undefined) {
  const { sdk } = useSDK();
  const monthRange = getMonthDateRange();
  const yearRange = getYearDateRange();

  const queries = useQueries({
    queries: [
      // This month revenue (using converted amounts for multi-currency support)
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "revenue-this-month", monthRange.from],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "sum", field: "total_with_tax_converted", alias: "revenue" }],
              table: "invoices",
              date_from: monthRange.from,
              date_to: monthRange.to,
              filters: { is_draft: false, voided_at: null },
              group_by: ["quote_currency"], // Get the currency for display
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 30_000,
      },
      // This year revenue (using converted amounts for multi-currency support)
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "revenue-this-year", yearRange.from],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "sum", field: "total_with_tax_converted", alias: "revenue" }],
              table: "invoices",
              date_from: yearRange.from,
              date_to: yearRange.to,
              filters: { is_draft: false, voided_at: null },
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 30_000,
      },
      // Outstanding (unpaid, not voided)
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "outstanding"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "sum", field: "total_due", alias: "outstanding" }],
              table: "invoices",
              filters: { is_draft: false, voided_at: null, paid_in_full: false },
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 30_000,
      },
      // Overdue (past due date, unpaid)
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "overdue"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [
                { type: "sum", field: "total_due", alias: "overdue" },
                { type: "count", alias: "count" },
              ],
              table: "invoices",
              filters: { is_draft: false, voided_at: null, paid_in_full: false },
              group_by: ["overdue_bucket"],
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 30_000,
      },
    ],
  });

  const [thisMonthQuery, thisYearQuery, outstandingQuery, overdueQuery] = queries;

  // Extract this month revenue and currency (may have multiple rows if grouped by quote_currency)
  const thisMonthData = thisMonthQuery.data?.data || [];
  const thisMonthRevenue = thisMonthData.reduce(
    (sum: number, row: StatsQueryDataItem) => sum + (Number(row.revenue) || 0),
    0,
  );
  // Get currency from first row with data
  const currency = (thisMonthData[0]?.quote_currency as string) || "EUR";

  // Extract overdue data (buckets other than "current")
  const overdueData = overdueQuery.data?.data || [];
  const overdueBuckets = overdueData.filter((row: StatsQueryDataItem) => row.overdue_bucket !== "current");
  const totalOverdue = overdueBuckets.reduce(
    (sum: number, row: StatsQueryDataItem) => sum + (Number(row.overdue) || 0),
    0,
  );
  const overdueCount = overdueBuckets.reduce(
    (sum: number, row: StatsQueryDataItem) => sum + (Number(row.count) || 0),
    0,
  );

  return {
    data: {
      thisMonth: thisMonthRevenue,
      thisYear: Number(thisYearQuery.data?.data?.[0]?.revenue) || 0,
      outstanding: Number(outstandingQuery.data?.data?.[0]?.outstanding) || 0,
      overdue: totalOverdue,
      overdueCount,
      currency, // Currency from document data
    } as RevenueData,
    isLoading: queries.some((q) => q.isLoading),
  };
}
