/**
 * Collection rate hook using the entity stats API.
 * Server-side aggregation for accurate totals.
 */
import { useQueries } from "@tanstack/react-query";
import { useSDK } from "@/ui/providers/sdk-provider";
import { STATS_QUERY_CACHE_KEY } from "../shared/use-stats-query";

export const COLLECTION_RATE_CACHE_KEY = "dashboard-collection-rate";

export type CollectionRateData = {
  collectionRate: number;
  totalCollected: number;
  totalInvoiced: number;
  currency: string;
};

export function useCollectionRateData(entityId: string | undefined) {
  const { sdk } = useSDK();

  const queries = useQueries({
    queries: [
      // Total invoiced (non-voided)
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "total-invoiced"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "sum", field: "total_with_tax", alias: "total" }],
              table: "invoices",
              filters: { is_draft: false, voided_at: null },
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 120_000,
      },
      // Total collected (payments)
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "total-collected"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "sum", field: "amount", alias: "total" }],
              table: "payments",
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 120_000,
      },
    ],
  });

  const [invoicedQuery, collectedQuery] = queries;

  const totalInvoiced = Number(invoicedQuery.data?.data?.[0]?.total) || 0;
  const totalCollected = Number(collectedQuery.data?.data?.[0]?.total) || 0;
  const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

  return {
    data: {
      collectionRate,
      totalCollected,
      totalInvoiced,
      currency: "EUR", // TODO: Get from entity settings
    } as CollectionRateData,
    isLoading: queries.some((q) => q.isLoading),
  };
}
