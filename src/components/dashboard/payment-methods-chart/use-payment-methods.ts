/**
 * Payment methods hook using the entity stats API.
 * Server-side aggregation by payment type.
 * Sends 1 query in a batch request.
 */
import type { StatsQueryDataItem } from "@spaceinvoices/js-sdk";
import { useStatsQuery } from "../shared/use-stats-query";

export const PAYMENT_METHODS_CACHE_KEY = "dashboard-payment-methods";

export type PaymentMethodsData = { type: string; count: number; amount: number }[];

export function usePaymentMethodsData(entityId: string | undefined) {
  const query = useStatsQuery(
    entityId,
    {
      metrics: [
        { type: "count", alias: "count" },
        { type: "sum", field: "amount", alias: "amount" },
      ],
      table: "payments",
      group_by: ["type"],
      order_by: [{ field: "amount", direction: "desc" }],
    },
    {
      select: (response) => {
        const data = response.data || [];
        return (data as StatsQueryDataItem[]).map((row) => ({
          type: String(row.type || "other"),
          count: Number(row.count) || 0,
          amount: Number(row.amount) || 0,
        }));
      },
    },
  );

  return {
    data: query.data || [],
    isLoading: query.isLoading,
  };
}
