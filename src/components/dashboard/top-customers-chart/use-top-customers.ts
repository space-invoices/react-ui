/**
 * Top customers hook using the entity stats API.
 * Server-side aggregation by customer for accurate rankings.
 * Sends 1 query in a batch request.
 */
import type { StatsQueryDataItem } from "@spaceinvoices/js-sdk";
import { useStatsQuery } from "../shared/use-stats-query";

export const TOP_CUSTOMERS_CACHE_KEY = "dashboard-top-customers";

export type TopCustomersData = { name: string; revenue: number }[];

export function useTopCustomersData(entityId: string | undefined, limit = 5) {
  const query = useStatsQuery(
    entityId,
    {
      metrics: [
        { type: "sum", field: "total_with_tax_converted", alias: "revenue" },
        { type: "count", alias: "invoice_count" },
      ],
      table: "invoices",
      filters: { is_draft: false, voided_at: null },
      group_by: ["customer_name"],
      order_by: [{ field: "revenue", direction: "desc" }],
      limit,
    },
    {
      select: (response) => {
        const data = response.data || [];
        const customers = (data as StatsQueryDataItem[]).map((row) => ({
          name: String(row.customer_name || "Unknown"),
          revenue: Number(row.revenue) || 0,
        }));

        return {
          data: customers,
          currency: "EUR",
        };
      },
    },
  );

  return {
    data: query.data?.data || [],
    currency: query.data?.currency || "EUR",
    isLoading: query.isLoading,
  };
}
