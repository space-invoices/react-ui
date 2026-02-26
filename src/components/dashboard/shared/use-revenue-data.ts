/**
 * Revenue data hook using the entity stats API.
 * Server-side aggregation for accurate calculations.
 * Sends 7 queries in a single batch request.
 */
import type { StatsQueryDataItem, StatsQueryRequest } from "@spaceinvoices/js-sdk";
import { useStatsBatchQuery } from "./use-stats-query";

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
  const monthRange = getMonthDateRange();
  const yearRange = getYearDateRange();

  const queries: StatsQueryRequest[] = [
    // [0] This month revenue (using converted amounts for multi-currency support)
    {
      metrics: [{ type: "sum", field: "total_with_tax_converted", alias: "revenue" }],
      table: "invoices",
      date_from: monthRange.from,
      date_to: monthRange.to,
      filters: { is_draft: false },
      group_by: ["quote_currency"],
    },
    // [1] This year revenue
    {
      metrics: [{ type: "sum", field: "total_with_tax_converted", alias: "revenue" }],
      table: "invoices",
      date_from: yearRange.from,
      date_to: yearRange.to,
      filters: { is_draft: false },
    },
    // [2] Outstanding (unpaid, not voided)
    {
      metrics: [{ type: "sum", field: "total_due", alias: "outstanding" }],
      table: "invoices",
      filters: { is_draft: false, paid_in_full: false },
    },
    // [3] Overdue (past due date, unpaid)
    {
      metrics: [
        { type: "sum", field: "total_due", alias: "overdue" },
        { type: "count", alias: "count" },
      ],
      table: "invoices",
      filters: { is_draft: false, paid_in_full: false },
      group_by: ["overdue_bucket"],
    },
    // [4] Credit notes: this month
    {
      metrics: [{ type: "sum", field: "total_with_tax_converted", alias: "revenue" }],
      table: "credit_notes",
      date_from: monthRange.from,
      date_to: monthRange.to,
      filters: { is_draft: false },
    },
    // [5] Credit notes: this year
    {
      metrics: [{ type: "sum", field: "total_with_tax_converted", alias: "revenue" }],
      table: "credit_notes",
      date_from: yearRange.from,
      date_to: yearRange.to,
      filters: { is_draft: false },
    },
    // [6] Credit notes: outstanding
    {
      metrics: [{ type: "sum", field: "total_due", alias: "outstanding" }],
      table: "credit_notes",
      filters: { is_draft: false, paid_in_full: false },
    },
  ];

  const { data: results, isLoading } = useStatsBatchQuery(entityId, "revenue-data", queries, {
    select: (batch) => {
      const [thisMonthRes, thisYearRes, outstandingRes, overdueRes, cnThisMonthRes, cnThisYearRes, cnOutstandingRes] =
        batch;

      // Extract this month revenue and currency (may have multiple rows if grouped by quote_currency)
      const thisMonthData = thisMonthRes.data || [];
      const thisMonthRevenue = thisMonthData.reduce(
        (sum: number, row: StatsQueryDataItem) => sum + (Number(row.revenue) || 0),
        0,
      );
      const currency = (thisMonthData[0]?.quote_currency as string) || "EUR";

      // Credit note totals
      const cnThisMonth = Number(cnThisMonthRes.data?.[0]?.revenue) || 0;
      const cnThisYear = Number(cnThisYearRes.data?.[0]?.revenue) || 0;
      const cnOutstanding = Number(cnOutstandingRes.data?.[0]?.outstanding) || 0;

      // Extract overdue data (buckets other than "current") — stays invoice-only
      const overdueData = overdueRes.data || [];
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
        thisMonth: thisMonthRevenue - cnThisMonth,
        thisYear: (Number(thisYearRes.data?.[0]?.revenue) || 0) - cnThisYear,
        outstanding: (Number(outstandingRes.data?.[0]?.outstanding) || 0) - cnOutstanding,
        overdue: totalOverdue,
        overdueCount,
        currency,
      } as RevenueData;
    },
  });

  return {
    data: results ?? {
      thisMonth: 0,
      thisYear: 0,
      outstanding: 0,
      overdue: 0,
      overdueCount: 0,
      currency: "EUR",
    },
    isLoading,
  };
}
