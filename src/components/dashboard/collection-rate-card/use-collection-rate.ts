/**
 * Collection rate hook using the entity stats API.
 * Server-side aggregation for accurate totals.
 * Sends 4 queries in a single batch request.
 */
import type { StatsQueryRequest } from "@spaceinvoices/js-sdk";
import { useStatsBatchQuery } from "../shared/use-stats-query";

export const COLLECTION_RATE_CACHE_KEY = "dashboard-collection-rate";

export type CollectionRateData = {
  collectionRate: number;
  totalCollected: number;
  totalInvoiced: number;
  currency: string;
};

export function useCollectionRateData(entityId: string | undefined) {
  const queries: StatsQueryRequest[] = [
    // [0] Total invoiced (non-voided, non-draft invoices only)
    {
      metrics: [{ type: "sum", field: "total_with_tax", alias: "total" }],
      table: "invoices",
      filters: { is_draft: false, voided_at: null },
    },
    // [1] Total collected on invoices
    // Using invoice.total_paid avoids counting orphan payments or payments on voided invoices.
    {
      metrics: [{ type: "sum", field: "total_paid", alias: "total" }],
      table: "invoices",
      filters: { is_draft: false, voided_at: null },
    },
    // [2] Credit note payments / refunds (credit_note_id IS NOT NULL)
    {
      metrics: [{ type: "sum", field: "amount", alias: "total" }],
      table: "payments",
      filters: { credit_note_id: { not: null } },
    },
    // [3] Credit notes total (subtracted from invoiced to get net revenue)
    {
      metrics: [{ type: "sum", field: "total_with_tax", alias: "total" }],
      table: "credit_notes",
      filters: { is_draft: false, voided_at: null },
    },
  ];

  const { data: results, isLoading } = useStatsBatchQuery(entityId, "collection-rate", queries, {
    select: (batch) => {
      const totalInvoiced = Number(batch[0].data?.[0]?.total) || 0;
      const invoicePayments = Number(batch[1].data?.[0]?.total) || 0;
      const cnPayments = Number(batch[2].data?.[0]?.total) || 0;
      const cnTotal = Number(batch[3].data?.[0]?.total) || 0;
      const netInvoiced = totalInvoiced - cnTotal;
      const netCollected = invoicePayments - cnPayments;
      const collectionRate = netInvoiced > 0 ? (netCollected / netInvoiced) * 100 : 0;

      return {
        collectionRate,
        totalCollected: netCollected,
        totalInvoiced: netInvoiced,
        currency: "EUR", // TODO: Get from entity settings
      } as CollectionRateData;
    },
  });

  return {
    data: results ?? { collectionRate: 0, totalCollected: 0, totalInvoiced: 0, currency: "EUR" },
    isLoading,
  };
}
