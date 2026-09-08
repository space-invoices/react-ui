/**
 * Revenue cards hook using the entity stats API.
 *
 * Basis: tax-inclusive invoiced sales by invoice date (entity currency) minus
 * eligible credit notes; outstanding/overdue are invoice-only amounts due,
 * matching the unpaid invoice list. Periods are the entity's calendar month/year.
 * Sends 6 queries in a single batch request.
 */
import type { StatsQueryDataItem, StatsQueryRequest } from "@spaceinvoices/js-sdk";
import { getCalendarMonthRange, getCalendarYearRange } from "@/ui/lib/entity-calendar";
import {
  CONVERSION_MISSING_METRIC,
  type DashboardQueryResult,
  hasMissingConversion,
  readNumber,
  resolveUnavailable,
  sumMetric,
} from "./dashboard-query-state";
import { type DashboardEntityOverrides, useDashboardEntity } from "./use-dashboard-entity";
import { useStatsBatchQuery } from "./use-stats-query";

export const REVENUE_DATA_CACHE_KEY = "dashboard-revenue-data";

/** A metric is `null` when a document in its population lacks a usable entity-currency amount. */
export type RevenueData = {
  thisMonth: number | null;
  thisYear: number | null;
  outstanding: number | null;
  overdue: number | null;
  overdueCount: number;
  currency: string;
};

const UNPAID_INVOICE_FILTERS = { is_draft: false, voided_at: null, paid_in_full: false };

function netRevenue(invoiceRows: StatsQueryDataItem[] | undefined, creditNoteRows: StatsQueryDataItem[] | undefined) {
  if (hasMissingConversion(invoiceRows) || hasMissingConversion(creditNoteRows)) return null;
  return readNumber(invoiceRows?.[0], "revenue") - readNumber(creditNoteRows?.[0], "revenue");
}

export function useRevenueData(
  entityId: string | undefined,
  overrides?: DashboardEntityOverrides,
): DashboardQueryResult<RevenueData> {
  const { currency, today } = useDashboardEntity(entityId, overrides);
  const monthRange = getCalendarMonthRange(today);
  const yearRange = getCalendarYearRange(today.year);

  const queries: StatsQueryRequest[] = [
    // [0] This month invoiced (eligible invoices, entity currency)
    {
      metrics: [{ type: "sum", field: "financial_gross_converted", alias: "revenue" }, CONVERSION_MISSING_METRIC],
      table: "invoices",
      date_from: monthRange.from,
      date_to: monthRange.to,
      filters: { financial_eligible: true },
    },
    // [1] This year invoiced
    {
      metrics: [{ type: "sum", field: "financial_gross_converted", alias: "revenue" }, CONVERSION_MISSING_METRIC],
      table: "invoices",
      date_from: yearRange.from,
      date_to: yearRange.to,
      filters: { financial_eligible: true },
    },
    // [2] Outstanding: invoice-only amount due, same population as the unpaid invoice list
    {
      metrics: [{ type: "sum", field: "total_due_converted", alias: "outstanding" }, CONVERSION_MISSING_METRIC],
      table: "invoices",
      filters: UNPAID_INVOICE_FILTERS,
    },
    // [3] Overdue: amount due past the due date (entity-calendar buckets), invoice-only
    {
      metrics: [
        { type: "sum", field: "total_due_converted", alias: "overdue" },
        { type: "count", alias: "count" },
        CONVERSION_MISSING_METRIC,
      ],
      table: "invoices",
      filters: UNPAID_INVOICE_FILTERS,
      group_by: ["overdue_bucket"],
    },
    // [4] Eligible credit notes this month
    {
      metrics: [{ type: "sum", field: "financial_gross_converted", alias: "revenue" }, CONVERSION_MISSING_METRIC],
      table: "credit_notes",
      date_from: monthRange.from,
      date_to: monthRange.to,
      filters: { financial_eligible: true },
    },
    // [5] Eligible credit notes this year
    {
      metrics: [{ type: "sum", field: "financial_gross_converted", alias: "revenue" }, CONVERSION_MISSING_METRIC],
      table: "credit_notes",
      date_from: yearRange.from,
      date_to: yearRange.to,
      filters: { financial_eligible: true },
    },
  ];

  const query = useStatsBatchQuery(entityId, "revenue-data", queries, {
    select: (batch) => {
      const [thisMonthRes, thisYearRes, outstandingRes, overdueRes, cnThisMonthRes, cnThisYearRes] = batch;

      const overdueRows = (overdueRes.data ?? []).filter((row) => row.overdue_bucket !== "current");

      return {
        thisMonth: netRevenue(thisMonthRes.data, cnThisMonthRes.data),
        thisYear: netRevenue(thisYearRes.data, cnThisYearRes.data),
        outstanding: hasMissingConversion(outstandingRes.data)
          ? null
          : readNumber(outstandingRes.data?.[0], "outstanding"),
        overdue: hasMissingConversion(overdueRows) ? null : sumMetric(overdueRows, "overdue"),
        overdueCount: sumMetric(overdueRows, "count"),
      };
    },
  });

  return {
    data: query.data && currency ? { ...query.data, currency } : undefined,
    isLoading: query.isLoading,
    unavailable: resolveUnavailable({ isError: query.isError, currency: entityId ? currency : undefined }),
    retry: () => void query.refetch(),
  };
}
