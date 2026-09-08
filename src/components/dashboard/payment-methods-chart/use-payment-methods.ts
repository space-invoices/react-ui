/**
 * Payment methods hook using the entity stats API.
 *
 * Population: direct positive cash receipts on finalized active invoices
 * (no supplier payments, refunds, or credit/advance allocations), summed in
 * entity currency and grouped by payment type.
 * Sends 1 query in a batch request.
 */
import type { StatsQueryDataItem } from "@spaceinvoices/js-sdk";
import {
  CONVERSION_MISSING_METRIC,
  type DashboardQueryResult,
  hasMissingConversion,
  readNumber,
  resolveUnavailable,
} from "../shared/dashboard-query-state";
import { type DashboardEntityOverrides, useDashboardEntity } from "../shared/use-dashboard-entity";
import { useStatsQuery } from "../shared/use-stats-query";

export const PAYMENT_METHODS_CACHE_KEY = "dashboard-payment-methods";

export type PaymentMethodsData = { type: string; count: number; amount: number }[];

export type PaymentMethodsResult = { data: PaymentMethodsData; currency: string };

export function usePaymentMethodsData(
  entityId: string | undefined,
  overrides?: DashboardEntityOverrides,
): DashboardQueryResult<PaymentMethodsResult> {
  const { currency } = useDashboardEntity(entityId, overrides);

  const query = useStatsQuery(
    entityId,
    {
      metrics: [
        { type: "count", alias: "count" },
        { type: "sum", field: "cash_amount_converted", alias: "amount" },
        CONVERSION_MISSING_METRIC,
      ],
      table: "payments",
      filters: { active_invoice_cash_receipt: true },
      group_by: ["type"],
      order_by: [{ field: "amount", direction: "desc" }],
    },
    {
      select: (response): PaymentMethodsData | null => {
        const rows = (response.data ?? []) as StatsQueryDataItem[];
        if (hasMissingConversion(rows)) return null;
        return rows.map((row) => ({
          type: String(row.type || "other"),
          count: readNumber(row, "count"),
          amount: readNumber(row, "amount"),
        }));
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
