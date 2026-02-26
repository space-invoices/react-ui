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
      group_by: ["customer_name", "quote_currency"],
      order_by: [{ field: "revenue", direction: "desc" }],
      limit: limit * 2,
    },
    {
      select: (response) => {
        const data = response.data || [];

        // Aggregate by customer name (in case of multiple quote_currency rows)
        const customerMap: Record<string, number> = {};
        let currency = "EUR";

        for (const row of data as StatsQueryDataItem[]) {
          const name = String(row.customer_name || "Unknown");
          customerMap[name] = (customerMap[name] || 0) + (Number(row.revenue) || 0);
          if (row.quote_currency && currency === "EUR") {
            currency = String(row.quote_currency);
          }
        }

        const customers = Object.entries(customerMap)
          .map(([name, revenue]) => ({ name, revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit);

        return {
          data: customers,
          currency,
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
