/**
 * Invoice status hook using the entity stats API.
 * Server-side counting by invoice status; overdue buckets use the entity calendar.
 * Sends 3 queries in a single batch request.
 */
import type { StatsQueryDataItem, StatsQueryRequest } from "@spaceinvoices/js-sdk";
import { type DashboardQueryResult, readNumber, resolveUnavailable } from "../shared/dashboard-query-state";
import { useStatsBatchQuery } from "../shared/use-stats-query";

export const INVOICE_STATUS_CACHE_KEY = "dashboard-invoice-status";

export type InvoiceStatusData = {
  paid: number;
  pending: number;
  overdue: number;
  voided: number;
};

export function useInvoiceStatusData(entityId: string | undefined): DashboardQueryResult<InvoiceStatusData> {
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

  const query = useStatsBatchQuery(entityId, "invoice-status", queries, {
    select: (batch): InvoiceStatusData => {
      const paid = readNumber(batch[0].data?.[0], "count");

      let pending = 0;
      let overdue = 0;
      for (const row of (batch[1].data ?? []) as StatsQueryDataItem[]) {
        const count = readNumber(row, "count");
        if (String(row.overdue_bucket) === "current") {
          pending += count;
        } else {
          overdue += count;
        }
      }

      const total = readNumber(batch[2].data?.[0], "count");
      const voided = Math.max(0, total - paid - pending - overdue);

      return { paid, pending, overdue, voided };
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    unavailable: resolveUnavailable({ isError: query.isError }),
    retry: () => void query.refetch(),
  };
}
