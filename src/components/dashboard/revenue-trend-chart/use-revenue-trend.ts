/**
 * Revenue trend hook using the entity stats API.
 * Server-side aggregation by month for accurate trend data.
 */
import type { StatsQueryDataItem } from "@spaceinvoices/js-sdk";
import { useQueries } from "@tanstack/react-query";
import { useSDK } from "@/ui/providers/sdk-provider";
import { STATS_QUERY_CACHE_KEY } from "../shared/use-stats-query";

export const REVENUE_TREND_CACHE_KEY = "dashboard-revenue-trend";

function getLastMonths(count: number): { months: string[]; startDate: string; endDate: string } {
  const months: string[] = [];
  const now = new Date();

  // Start of the month 'count-1' months ago
  const startDate = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
  // End of current month
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().substring(0, 7));
  }

  return {
    months,
    startDate: startDate.toISOString().substring(0, 10),
    endDate: endDate.toISOString().substring(0, 10),
  };
}

export type RevenueTrendData = { month: string; revenue: number }[];

export function useRevenueTrendData(entityId: string | undefined) {
  const { sdk } = useSDK();

  const { months, startDate, endDate } = getLastMonths(6);

  const sharedQueryParams = {
    date_from: startDate,
    date_to: endDate,
    filters: { is_draft: false },
    group_by: ["month", "quote_currency"],
    order_by: [{ field: "month", direction: "asc" as const }],
  };

  const queries = useQueries({
    queries: [
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "revenue-trend", startDate, endDate],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "sum", field: "total_with_tax_converted", alias: "revenue" }],
              table: "invoices",
              ...sharedQueryParams,
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 120_000,
      },
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "cn-revenue-trend", startDate, endDate],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "sum", field: "total_with_tax_converted", alias: "revenue" }],
              table: "credit_notes",
              ...sharedQueryParams,
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 120_000,
      },
    ],
  });

  const [invoiceQuery, cnQuery] = queries;

  // Build month maps
  const monthMap: Record<string, number> = {};
  const cnMonthMap: Record<string, number> = {};
  for (const month of months) {
    monthMap[month] = 0;
    cnMonthMap[month] = 0;
  }

  // Fill invoice revenue per month
  const invoiceData = (invoiceQuery.data?.data || []) as StatsQueryDataItem[];
  let currency = "EUR";
  for (const row of invoiceData) {
    const month = String(row.month);
    if (month in monthMap) {
      monthMap[month] += Number(row.revenue) || 0;
    }
    if (row.quote_currency && currency === "EUR") {
      currency = String(row.quote_currency);
    }
  }

  // Fill credit note revenue per month
  const cnData = (cnQuery.data?.data || []) as StatsQueryDataItem[];
  for (const row of cnData) {
    const month = String(row.month);
    if (month in cnMonthMap) {
      cnMonthMap[month] += Number(row.revenue) || 0;
    }
  }

  return {
    data: months.map((month) => ({ month, revenue: monthMap[month] - cnMonthMap[month] })),
    currency,
    isLoading: queries.some((q) => q.isLoading),
  };
}
