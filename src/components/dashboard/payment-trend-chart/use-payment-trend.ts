/**
 * Payment trend hook using the entity stats API.
 *
 * Population: direct positive cash receipts on finalized active invoices, in
 * entity currency, by entity-calendar month for the last six months.
 * Sends 1 query in a batch request.
 */
import type { StatsQueryDataItem } from "@spaceinvoices/js-sdk";
import { getRecentCalendarMonths } from "@/ui/lib/entity-calendar";
import {
  CONVERSION_MISSING_METRIC,
  type DashboardQueryResult,
  hasMissingConversion,
  readNumber,
  resolveUnavailable,
} from "../shared/dashboard-query-state";
import { type DashboardEntityOverrides, useDashboardEntity } from "../shared/use-dashboard-entity";
import { useStatsQuery } from "../shared/use-stats-query";

export const PAYMENT_TREND_CACHE_KEY = "dashboard-payment-trend";

export type PaymentTrendData = { month: string; amount: number }[];

export type PaymentTrendResult = { data: PaymentTrendData; currency: string };

export function usePaymentTrendData(
  entityId: string | undefined,
  overrides?: DashboardEntityOverrides,
): DashboardQueryResult<PaymentTrendResult> {
  const { currency, today } = useDashboardEntity(entityId, overrides);
  const { months, from, to } = getRecentCalendarMonths(today, 6);

  const query = useStatsQuery(
    entityId,
    {
      metrics: [{ type: "sum", field: "cash_amount_converted", alias: "amount" }, CONVERSION_MISSING_METRIC],
      table: "payments",
      date_from: from,
      date_to: to,
      filters: { active_invoice_cash_receipt: true },
      group_by: ["month"],
      order_by: [{ field: "month", direction: "asc" }],
    },
    {
      select: (response): PaymentTrendData | null => {
        const rows = (response.data ?? []) as StatsQueryDataItem[];
        if (hasMissingConversion(rows)) return null;
        const byMonth: Record<string, number> = Object.fromEntries(months.map((month) => [month, 0]));
        for (const row of rows) {
          const month = String(row.month);
          if (month in byMonth) byMonth[month] += readNumber(row, "amount");
        }
        return months.map((month) => ({ month, amount: byMonth[month] }));
      },
    },
  );

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
