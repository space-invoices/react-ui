/**
 * Tax charged hook using the entity stats API.
 *
 * Basis: tax charged on eligible invoices by invoice date, reduced by tax on
 * eligible credit notes, per rate and in entity currency. This is neither cash
 * collected nor net tax liability after purchases. Periods are the entity's
 * previous calendar month and current calendar year.
 * Sends 4 queries in a single batch request.
 */
import type { StatsQueryDataItem, StatsQueryRequest } from "@spaceinvoices/js-sdk";
import {
  formatCalendarMonth,
  formatCalendarMonthLabel,
  getCalendarMonthRange,
  getCalendarYearRange,
  shiftCalendarMonth,
} from "@/ui/lib/entity-calendar";
import {
  CONVERSION_MISSING_METRIC,
  type DashboardQueryResult,
  hasMissingConversion,
  readNumber,
  resolveUnavailable,
} from "../shared/dashboard-query-state";
import { type DashboardEntityOverrides, useDashboardEntity } from "../shared/use-dashboard-entity";
import { useStatsBatchQuery } from "../shared/use-stats-query";

export const TAX_COLLECTED_CACHE_KEY = "dashboard-tax-collected";

export type TaxByRate = {
  name: string;
  rate: number;
  amount: number;
};

export type TaxPeriodData = {
  label: string;
  /** `null` when a document in the period lacks a usable entity-currency amount. */
  taxes: TaxByRate[] | null;
  total: number | null;
};

export type TaxCollectedData = {
  previousMonth: TaxPeriodData;
  currentYear: TaxPeriodData;
  currency: string;
};

const TAX_METRICS: StatsQueryRequest["metrics"] = [
  { type: "sum", field: "tax_converted", alias: "tax_total" },
  CONVERSION_MISSING_METRIC,
];
const TAX_FILTERS = { financial_eligible: true, reverse_charge: false };

/** Invoice tax minus credit-note tax per rate; rates with a zero net are kept out of the breakdown. */
export function netTaxByRate(
  invoiceRows: StatsQueryDataItem[] | undefined,
  creditNoteRows: StatsQueryDataItem[] | undefined,
): TaxByRate[] | null {
  if (hasMissingConversion(invoiceRows) || hasMissingConversion(creditNoteRows)) return null;

  const byRate = new Map<number, number>();
  const add = (rows: StatsQueryDataItem[] | undefined, sign: 1 | -1) => {
    for (const row of rows ?? []) {
      if (row.rate == null) continue;
      const rate = Number(row.rate);
      byRate.set(rate, (byRate.get(rate) ?? 0) + sign * readNumber(row, "tax_total"));
    }
  };
  add(invoiceRows, 1);
  add(creditNoteRows, -1);

  return [...byRate.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([rate, amount]) => ({ name: "Tax", rate, amount }))
    .sort((a, b) => b.rate - a.rate);
}

function periodData(label: string, taxes: TaxByRate[] | null): TaxPeriodData {
  return { label, taxes, total: taxes ? taxes.reduce((sum, tax) => sum + tax.amount, 0) : null };
}

export function useTaxCollectedData(
  entityId: string | undefined,
  locale?: string,
  overrides?: DashboardEntityOverrides,
): DashboardQueryResult<TaxCollectedData> {
  const { currency, today } = useDashboardEntity(entityId, overrides);
  const previousMonth = shiftCalendarMonth(today, -1);
  const prevMonthRange = getCalendarMonthRange(previousMonth);
  const prevMonthLabel = formatCalendarMonthLabel(formatCalendarMonth(previousMonth), locale, {
    month: "short",
    year: "numeric",
  });
  const yearRange = getCalendarYearRange(today.year);
  const yearLabel = String(today.year);

  const queries: StatsQueryRequest[] = [
    // [0] Previous month invoice tax by rate
    {
      table: "invoice_taxes",
      metrics: TAX_METRICS,
      group_by: ["rate"],
      date_from: prevMonthRange.from,
      date_to: prevMonthRange.to,
      filters: TAX_FILTERS,
    },
    // [1] Previous month credit-note tax by rate
    {
      table: "credit_note_taxes",
      metrics: TAX_METRICS,
      group_by: ["rate"],
      date_from: prevMonthRange.from,
      date_to: prevMonthRange.to,
      filters: TAX_FILTERS,
    },
    // [2] Current year invoice tax by rate
    {
      table: "invoice_taxes",
      metrics: TAX_METRICS,
      group_by: ["rate"],
      date_from: yearRange.from,
      date_to: yearRange.to,
      filters: TAX_FILTERS,
    },
    // [3] Current year credit-note tax by rate
    {
      table: "credit_note_taxes",
      metrics: TAX_METRICS,
      group_by: ["rate"],
      date_from: yearRange.from,
      date_to: yearRange.to,
      filters: TAX_FILTERS,
    },
  ];

  const query = useStatsBatchQuery(entityId, "tax-collected", queries, {
    select: (batch) => ({
      previousMonth: periodData(prevMonthLabel, netTaxByRate(batch[0].data, batch[1].data)),
      currentYear: periodData(yearLabel, netTaxByRate(batch[2].data, batch[3].data)),
    }),
  });

  return {
    data: query.data && currency ? { ...query.data, currency } : undefined,
    isLoading: query.isLoading,
    unavailable: resolveUnavailable({ isError: query.isError, currency: entityId ? currency : undefined }),
    retry: () => void query.refetch(),
  };
}
