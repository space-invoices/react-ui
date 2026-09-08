/**
 * Revenue trend hook using the entity stats API.
 *
 * Basis: tax-inclusive invoiced sales by invoice date minus eligible credit
 * notes, in entity currency, for the last six entity-calendar months.
 * Sends 2 queries in a single batch request.
 */
import type { StatsQueryDataItem, StatsQueryRequest } from "@spaceinvoices/js-sdk";
import { getRecentCalendarMonths } from "@/ui/lib/entity-calendar";
import {
  CONVERSION_MISSING_METRIC,
  type DashboardQueryResult,
  hasMissingConversion,
  readNumber,
  resolveUnavailable,
} from "../shared/dashboard-query-state";
import { type DashboardEntityOverrides, useDashboardEntity } from "../shared/use-dashboard-entity";
import { useStatsBatchQuery } from "../shared/use-stats-query";

export const REVENUE_TREND_CACHE_KEY = "dashboard-revenue-trend";

export type RevenueTrendData = { month: string; revenue: number }[];

export type RevenueTrendResult = { data: RevenueTrendData; currency: string };

function sumByMonth(rows: StatsQueryDataItem[] | undefined, months: string[]): Record<string, number> {
  const byMonth: Record<string, number> = Object.fromEntries(months.map((month) => [month, 0]));
  for (const row of rows ?? []) {
    const month = String(row.month);
    if (month in byMonth) byMonth[month] += readNumber(row, "revenue");
  }
  return byMonth;
}

export function useRevenueTrendData(
  entityId: string | undefined,
  overrides?: DashboardEntityOverrides,
): DashboardQueryResult<RevenueTrendResult> {
  const { currency, today } = useDashboardEntity(entityId, overrides);
  const { months, from, to } = getRecentCalendarMonths(today, 6);

  const sharedParams = {
    metrics: [
      { type: "sum" as const, field: "financial_gross_converted", alias: "revenue" },
      CONVERSION_MISSING_METRIC,
    ],
    date_from: from,
    date_to: to,
    filters: { financial_eligible: true },
    group_by: ["month"],
    order_by: [{ field: "month", direction: "asc" as const }],
  };

  const queries: StatsQueryRequest[] = [
    // [0] Eligible invoices by month
    { table: "invoices", ...sharedParams },
    // [1] Eligible credit notes by month
    { table: "credit_notes", ...sharedParams },
  ];

  const query = useStatsBatchQuery(entityId, "revenue-trend", queries, {
    select: (batch): RevenueTrendData | null => {
      if (hasMissingConversion(batch[0].data) || hasMissingConversion(batch[1].data)) return null;
      const invoiced = sumByMonth(batch[0].data, months);
      const credited = sumByMonth(batch[1].data, months);
      return months.map((month) => ({ month, revenue: invoiced[month] - credited[month] }));
    },
  });

  return {
    data: query.data && currency ? { data: query.data, currency } : undefined,
    isLoading: query.isLoading,
    unavailable: resolveUnavailable({
      isError: query.isError,
      currency: entityId ? currency : undefined,
      conversionMissing: query.isSuccess && query.data === null,
    }),
    retry: () => void query.refetch(),
  };
}
