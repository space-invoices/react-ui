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
      // Total invoiced (including voided — counter credit notes cancel them out)
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "total-invoiced"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "sum", field: "total_with_tax", alias: "total" }],
              table: "invoices",
              filters: { is_draft: false },
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 120_000,
      },
      // Invoice payments (credit_note_id IS NULL)
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "invoice-payments"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "sum", field: "amount", alias: "total" }],
              table: "payments",
              filters: { credit_note_id: null },
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 120_000,
      },
      // Credit note payments / refunds (credit_note_id IS NOT NULL)
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "cn-payments"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "sum", field: "amount", alias: "total" }],
              table: "payments",
              filters: { credit_note_id: { not: null } },
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 120_000,
      },
      // Credit notes total (subtracted from invoiced to get net revenue)
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "cn-total"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "sum", field: "total_with_tax", alias: "total" }],
              table: "credit_notes",
              filters: { is_draft: false },
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 120_000,
      },
    ],
  });

  const [invoicedQuery, invoicePaymentsQuery, cnPaymentsQuery, cnQuery] = queries;

  const totalInvoiced = Number(invoicedQuery.data?.data?.[0]?.total) || 0;
  const invoicePayments = Number(invoicePaymentsQuery.data?.data?.[0]?.total) || 0;
  const cnPayments = Number(cnPaymentsQuery.data?.data?.[0]?.total) || 0;
  const cnTotal = Number(cnQuery.data?.data?.[0]?.total) || 0;
  const netInvoiced = totalInvoiced - cnTotal;
  const netCollected = invoicePayments - cnPayments;
  const collectionRate = netInvoiced > 0 ? (netCollected / netInvoiced) * 100 : 0;

  return {
    data: {
      collectionRate,
      totalCollected: netCollected,
      totalInvoiced: netInvoiced,
      currency: "EUR", // TODO: Get from entity settings
    } as CollectionRateData,
    isLoading: queries.some((q) => q.isLoading),
  };
}
