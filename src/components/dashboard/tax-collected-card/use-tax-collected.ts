/**
 * Tax collected hook - uses stats API to aggregate tax amounts by rate.
 * Shows tax breakdown for previous month and current year.
 */
import type { StatsQueryDataItem } from "@spaceinvoices/js-sdk";
import { useQueries } from "@tanstack/react-query";
import { useSDK } from "@/ui/providers/sdk-provider";

export const TAX_COLLECTED_CACHE_KEY = "dashboard-tax-collected";

function getPreviousMonthDateRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    from: firstDay.toISOString().split("T")[0],
    to: lastDay.toISOString().split("T")[0],
    label: firstDay.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
  };
}

function getYearDateRange() {
  const year = new Date().getFullYear();
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
    label: `${year}`,
  };
}

export type TaxByRate = {
  name: string;
  rate: number;
  amount: number;
};

export type TaxCollectedData = {
  previousMonth: {
    label: string;
    taxes: TaxByRate[];
    total: number;
  };
  currentYear: {
    label: string;
    taxes: TaxByRate[];
    total: number;
  };
  currency: string;
};

/**
 * Transform stats response to TaxByRate array
 */
function transformTaxData(data: StatsQueryDataItem[]): TaxByRate[] {
  return data
    .filter((row) => row.rate != null && row.tax_total != null)
    .map((row) => ({
      name: "Tax", // Could be enhanced to include tax name if available
      rate: Number(row.rate),
      amount: Number(row.tax_total),
    }))
    .sort((a, b) => b.rate - a.rate); // Sort by rate descending
}

export function useTaxCollectedData(entityId: string | undefined) {
  const { sdk } = useSDK();
  const prevMonthRange = getPreviousMonthDateRange();
  const yearRange = getYearDateRange();

  const queries = useQueries({
    queries: [
      // Previous month taxes - aggregated by rate using stats API
      {
        queryKey: [TAX_COLLECTED_CACHE_KEY, entityId, "prev-month", prevMonthRange.from],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          // Use invoice_taxes virtual table to aggregate taxes by rate
          return sdk.entityStats.queryEntityStats(
            {
              table: "invoice_taxes",
              metrics: [{ type: "sum", field: "tax", alias: "tax_total" }],
              group_by: ["rate", "quote_currency"],
              date_from: prevMonthRange.from,
              date_to: prevMonthRange.to,
              filters: { is_draft: false, voided_at: null },
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 60_000, // 1 minute
      },
      // Current year taxes - aggregated by rate using stats API
      {
        queryKey: [TAX_COLLECTED_CACHE_KEY, entityId, "year", yearRange.from],
        queryFn: async () => {
          if (!entityId || !sdk) throw new Error("Missing entity or SDK");
          return sdk.entityStats.queryEntityStats(
            {
              table: "invoice_taxes",
              metrics: [{ type: "sum", field: "tax", alias: "tax_total" }],
              group_by: ["rate", "quote_currency"],
              date_from: yearRange.from,
              date_to: yearRange.to,
              filters: { is_draft: false, voided_at: null },
            },
            { entity_id: entityId },
          );
        },
        enabled: !!entityId && !!sdk,
        staleTime: 60_000,
      },
    ],
  });

  const [prevMonthQuery, yearQuery] = queries;

  // Transform stats data to TaxByRate arrays
  const prevMonthTaxes = transformTaxData(prevMonthQuery.data?.data || []);
  const yearTaxes = transformTaxData(yearQuery.data?.data || []);

  // Get currency from first result or default
  const currency =
    (prevMonthQuery.data?.data?.[0]?.quote_currency as string) ||
    (yearQuery.data?.data?.[0]?.quote_currency as string) ||
    "EUR";

  return {
    data: {
      previousMonth: {
        label: prevMonthRange.label,
        taxes: prevMonthTaxes,
        total: prevMonthTaxes.reduce((sum, t) => sum + t.amount, 0),
      },
      currentYear: {
        label: yearRange.label,
        taxes: yearTaxes,
        total: yearTaxes.reduce((sum, t) => sum + t.amount, 0),
      },
      currency,
    } as TaxCollectedData,
    isLoading: queries.some((q) => q.isLoading),
    error: queries.find((q) => q.error)?.error,
  };
}
