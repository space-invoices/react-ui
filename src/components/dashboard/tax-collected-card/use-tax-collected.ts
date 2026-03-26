/**
 * Tax collected hook - uses stats API to aggregate tax amounts by rate.
 * Shows tax breakdown for previous month and current year.
 * Sends 2 queries in a single batch request.
 */
import type { StatsQueryDataItem, StatsQueryRequest } from "@spaceinvoices/js-sdk";
import { formatLocalDate } from "../shared/local-date";
import { useStatsBatchQuery } from "../shared/use-stats-query";

export const TAX_COLLECTED_CACHE_KEY = "dashboard-tax-collected";

function getPreviousMonthDateRange(locale?: string) {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    from: formatLocalDate(firstDay),
    to: formatLocalDate(lastDay),
    label: firstDay.toLocaleDateString(locale, { month: "short", year: "numeric" }),
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
      name: "Tax",
      rate: Number(row.rate),
      amount: Number(row.tax_total),
    }))
    .sort((a, b) => b.rate - a.rate);
}

export function useTaxCollectedData(entityId: string | undefined, locale?: string) {
  const prevMonthRange = getPreviousMonthDateRange(locale);
  const yearRange = getYearDateRange();

  const queries: StatsQueryRequest[] = [
    // [0] Previous month taxes
    {
      table: "invoice_taxes",
      metrics: [{ type: "sum", field: "tax", alias: "tax_total" }],
      group_by: ["rate", "quote_currency"],
      date_from: prevMonthRange.from,
      date_to: prevMonthRange.to,
      filters: { is_draft: false, voided_at: null },
    },
    // [1] Current year taxes
    {
      table: "invoice_taxes",
      metrics: [{ type: "sum", field: "tax", alias: "tax_total" }],
      group_by: ["rate", "quote_currency"],
      date_from: yearRange.from,
      date_to: yearRange.to,
      filters: { is_draft: false, voided_at: null },
    },
  ];

  const {
    data: results,
    isLoading,
    error,
  } = useStatsBatchQuery(entityId, "tax-collected", queries, {
    select: (batch) => {
      const prevMonthTaxes = transformTaxData(batch[0].data || []);
      const yearTaxes = transformTaxData(batch[1].data || []);

      const currency =
        (batch[0].data?.[0]?.quote_currency as string) || (batch[1].data?.[0]?.quote_currency as string) || "EUR";

      return {
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
      } as TaxCollectedData;
    },
  });

  return {
    data: results ?? {
      previousMonth: { label: prevMonthRange.label, taxes: [], total: 0 },
      currentYear: { label: yearRange.label, taxes: [], total: 0 },
      currency: "EUR",
    },
    isLoading,
    error,
  };
}
