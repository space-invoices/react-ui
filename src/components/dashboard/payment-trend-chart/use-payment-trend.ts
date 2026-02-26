/**
 * Payment trend hook using the entity stats API.
 * Server-side aggregation by month for accurate trend data.
 * Sends 1 query in a batch request.
 */
import type { StatsQueryDataItem } from "@spaceinvoices/js-sdk";
import { useStatsQuery } from "../shared/use-stats-query";

export const PAYMENT_TREND_CACHE_KEY = "dashboard-payment-trend";

function getLastMonths(count: number): { months: string[]; startDate: string; endDate: string } {
  const months: string[] = [];
  const now = new Date();

  const startDate = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().substring(0, 7));
  }

  return {
    months,
    startDate: startDate.toISOString().substring(0, 10),
    endDate: endDate.toISOString().substring(0, 10),
  };
}

export type PaymentTrendData = { month: string; amount: number }[];

export function usePaymentTrendData(entityId: string | undefined) {
  const { months, startDate, endDate } = getLastMonths(6);

  const query = useStatsQuery(
    entityId,
    {
      metrics: [{ type: "sum", field: "amount_converted", alias: "amount" }],
      table: "payments",
      date_from: startDate,
      date_to: endDate,
      group_by: ["month", "currency_code"],
      order_by: [{ field: "month", direction: "asc" }],
    },
    {
      select: (response) => {
        const monthMap: Record<string, number> = {};
        for (const month of months) {
          monthMap[month] = 0;
        }

        const data = response.data || [];
        let currency = "EUR";
        for (const row of data as StatsQueryDataItem[]) {
          const month = String(row.month);
          if (month in monthMap) {
            monthMap[month] += Number(row.amount) || 0;
          }
          if (row.currency_code && currency === "EUR") {
            currency = String(row.currency_code);
          }
        }

        return {
          data: months.map((month) => ({ month, amount: monthMap[month] })),
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
