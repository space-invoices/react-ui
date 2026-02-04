/**
 * Invoice status hook using the entity stats API.
 * Server-side counting by invoice status.
 */
import type { StatsQueryDataItem } from "@spaceinvoices/js-sdk";
import { useQueries } from "@tanstack/react-query";
import { useSDK } from "@/ui/providers/sdk-provider";
import { STATS_QUERY_CACHE_KEY } from "../shared/use-stats-query";

export const INVOICE_STATUS_CACHE_KEY = "dashboard-invoice-status";

export type InvoiceStatusData = {
  paid: number;
  pending: number;
  overdue: number;
  voided: number;
};

export function useInvoiceStatusData(entityId: string | undefined) {
  const { sdk } = useSDK();

  const queries = useQueries({
    queries: [
      // Paid invoices
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "invoice-status-paid"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "count", alias: "count" }],
              table: "invoices",
              filters: { is_draft: false, voided_at: null, paid_in_full: true },
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 30_000,
      },
      // Unpaid invoices grouped by overdue bucket (current = pending, others = overdue)
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "invoice-status-unpaid"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "count", alias: "count" }],
              table: "invoices",
              filters: { is_draft: false, voided_at: null, paid_in_full: false },
              group_by: ["overdue_bucket"],
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 30_000,
      },
      // Total count to derive voided
      {
        queryKey: [STATS_QUERY_CACHE_KEY, entityId, "invoice-status-total"],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              metrics: [{ type: "count", alias: "count" }],
              table: "invoices",
              filters: { is_draft: false },
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 30_000,
      },
    ],
  });

  const [paidQuery, unpaidQuery, totalQuery] = queries;

  const paid = Number(paidQuery.data?.data?.[0]?.count) || 0;

  // Parse unpaid buckets
  const unpaidData = unpaidQuery.data?.data || [];
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
  const total = Number(totalQuery.data?.data?.[0]?.count) || 0;
  const voided = Math.max(0, total - paid - pending - overdue);

  return {
    data: { paid, pending, overdue, voided } as InvoiceStatusData,
    isLoading: queries.some((q) => q.isLoading),
  };
}
