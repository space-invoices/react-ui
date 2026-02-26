/**
 * Revenue trend hook using the entity stats API.
 * Server-side aggregation by month for accurate trend data.
 * Sends 2 queries in a single batch request.
 */
import type { StatsQueryDataItem, StatsQueryRequest } from "@spaceinvoices/js-sdk";
import { useStatsBatchQuery } from "../shared/use-stats-query";

export const REVENUE_TREND_CACHE_KEY = "dashboard-revenue-trend";

function getLastMonths(count: number): { months: string[]; startDate: string; endDate: string } {
  const months: string[] = [];
  const now = new Date();

  const startDate = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
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
  const { months, startDate, endDate } = getLastMonths(6);

  const sharedParams = {
    date_from: startDate,
    date_to: endDate,
    filters: { is_draft: false },
    group_by: ["month", "quote_currency"],
    order_by: [{ field: "month", direction: "asc" as const }],
  };

  const queries: StatsQueryRequest[] = [
    // [0] Invoice revenue by month
    {
      metrics: [{ type: "sum", field: "total_with_tax_converted", alias: "revenue" }],
      table: "invoices",
      ...sharedParams,
    },
    // [1] Credit note revenue by month
    {
      metrics: [{ type: "sum", field: "total_with_tax_converted", alias: "revenue" }],
      table: "credit_notes",
      ...sharedParams,
    },
  ];

  const { data: results, isLoading } = useStatsBatchQuery(entityId, "revenue-trend", queries, {
    select: (batch) => {
      // Build month maps
      const monthMap: Record<string, number> = {};
      const cnMonthMap: Record<string, number> = {};
      for (const month of months) {
        monthMap[month] = 0;
        cnMonthMap[month] = 0;
      }

      // Fill invoice revenue per month
      const invoiceData = (batch[0].data || []) as StatsQueryDataItem[];
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
      const cnData = (batch[1].data || []) as StatsQueryDataItem[];
      for (const row of cnData) {
        const month = String(row.month);
        if (month in cnMonthMap) {
          cnMonthMap[month] += Number(row.revenue) || 0;
        }
      }

      return {
        data: months.map((month) => ({ month, revenue: monthMap[month] - cnMonthMap[month] })),
        currency,
      };
    },
  });

  return {
    data: results?.data || [],
    currency: results?.currency || "EUR",
    isLoading,
  };
}
