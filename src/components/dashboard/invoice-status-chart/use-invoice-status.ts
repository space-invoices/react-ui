/**
 * Invoice status hook using the entity stats API.
 * Server-side counting by invoice status.
 * Sends 3 queries in a single batch request.
 */
import type { StatsQueryDataItem, StatsQueryRequest } from "@spaceinvoices/js-sdk";
import { useStatsBatchQuery } from "../shared/use-stats-query";

export const INVOICE_STATUS_CACHE_KEY = "dashboard-invoice-status";

export type InvoiceStatusData = {
  paid: number;
  pending: number;
  overdue: number;
  voided: number;
};

export function useInvoiceStatusData(entityId: string | undefined) {
  const queries: StatsQueryRequest[] = [
    // [0] Paid invoices
    {
      metrics: [{ type: "count", alias: "count" }],
      table: "invoices",
      filters: { is_draft: false, voided_at: null, paid_in_full: true },
    },
    // [1] Unpaid invoices grouped by overdue bucket (current = pending, others = overdue)
    {
      metrics: [{ type: "count", alias: "count" }],
      table: "invoices",
      filters: { is_draft: false, voided_at: null, paid_in_full: false },
      group_by: ["overdue_bucket"],
    },
    // [2] Total count to derive voided
    {
      metrics: [{ type: "count", alias: "count" }],
      table: "invoices",
      filters: { is_draft: false },
    },
  ];

  const { data: results, isLoading } = useStatsBatchQuery(entityId, "invoice-status", queries, {
    select: (batch) => {
      const paid = Number(batch[0].data?.[0]?.count) || 0;

      // Parse unpaid buckets
      const unpaidData = batch[1].data || [];
      let pending = 0;
      let overdue = 0;
      for (const row of unpaidData as StatsQueryDataItem[]) {
        const bucket = String(row.overdue_bucket);
        const count = Number(row.count) || 0;
        if (bucket === "current") {
          pending = count;
        } else {
          overdue += count;
        }
      }

      // Calculate voided as: total - paid - pending - overdue
      const total = Number(batch[2].data?.[0]?.count) || 0;
      const voided = Math.max(0, total - paid - pending - overdue);

      return { paid, pending, overdue, voided } as InvoiceStatusData;
    },
  });

  return {
    data: results ?? { paid: 0, pending: 0, overdue: 0, voided: 0 },
    isLoading,
  };
}
