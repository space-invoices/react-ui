/**
 * Payment methods hook using the entity stats API.
 * Server-side aggregation by payment type.
 */
import type { StatsQueryDataItem } from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";
import { useSDK } from "@/ui/providers/sdk-provider";
import { STATS_QUERY_CACHE_KEY } from "../shared/use-stats-query";

export const PAYMENT_METHODS_CACHE_KEY = "dashboard-payment-methods";

export type PaymentMethodsData = { type: string; count: number; amount: number }[];

export function usePaymentMethodsData(entityId: string | undefined) {
  const { sdk } = useSDK();

  const query = useQuery({
    queryKey: [STATS_QUERY_CACHE_KEY, entityId, "payment-methods"],
    queryFn: async () => {
      if (!entityId || !sdk) throw new Error("Missing entity or SDK");
      return sdk.entityStats.queryEntityStats(
        {
          metrics: [
            { type: "count", alias: "count" },
            { type: "sum", field: "amount", alias: "amount" },
          ],
          table: "payments",
          group_by: ["type"],
          order_by: [{ field: "amount", direction: "desc" }],
        },
        { entity_id: entityId },
      );
    },
    enabled: !!entityId && !!sdk,
    staleTime: 30_000,
    select: (response) => {
      const data = response.data || [];
      return (data as StatsQueryDataItem[]).map((row) => ({
        type: String(row.type || "other"),
        count: Number(row.count) || 0,
        amount: Number(row.amount) || 0,
      }));
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
  };
}
