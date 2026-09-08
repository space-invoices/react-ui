/**
 * Collection rate hook using the entity stats API.
 *
 * Net invoiced = eligible invoice gross minus eligible credit-note gross.
 * Net collected = direct invoice cash receipts (capped per invoice by its gross)
 * minus direct credit-note refunds, clamped to [0, max(net invoiced, 0)].
 * Rate is zero when nothing was invoiced. All amounts are entity currency.
 * Sends 2 queries in a single batch request.
 */
import type { StatsQueryDataItem, StatsQueryRequest } from "@spaceinvoices/js-sdk";
import {
  COLLECTION_CONVERSION_MISSING_METRIC,
  CONVERSION_MISSING_METRIC,
  type DashboardQueryResult,
  hasMissingCollectionConversion,
  readNumber,
  resolveUnavailable,
} from "../shared/dashboard-query-state";
import { type DashboardEntityOverrides, useDashboardEntity } from "../shared/use-dashboard-entity";
import { useStatsBatchQuery } from "../shared/use-stats-query";

export const COLLECTION_RATE_CACHE_KEY = "dashboard-collection-rate";

export type CollectionRateData = {
  collectionRate: number;
  totalCollected: number;
  totalInvoiced: number;
  currency: string;
};

export type CollectionRateTotals = Omit<CollectionRateData, "currency">;

/** Pure collection policy; exported so the arithmetic can be proven without a query. */
export function calculateCollectionRate(input: {
  invoiceGross: number;
  invoiceCollected: number;
  creditNoteGross: number;
  creditNoteRefunded: number;
}): CollectionRateTotals {
  const totalInvoiced = input.invoiceGross - input.creditNoteGross;
  const collectedCeiling = Math.max(totalInvoiced, 0);
  const totalCollected = Math.min(Math.max(input.invoiceCollected - input.creditNoteRefunded, 0), collectedCeiling);
  const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;
  return { collectionRate, totalCollected, totalInvoiced };
}

const FINANCIAL_METRICS: StatsQueryRequest["metrics"] = [
  { type: "sum", field: "financial_gross_converted", alias: "gross" },
  { type: "sum", field: "collection_amount_converted", alias: "collected" },
  CONVERSION_MISSING_METRIC,
  COLLECTION_CONVERSION_MISSING_METRIC,
];

function selectTotals(batch: { data?: StatsQueryDataItem[] }[]): CollectionRateTotals | null {
  const invoiceRows = batch[0]?.data;
  const creditNoteRows = batch[1]?.data;
  if (hasMissingCollectionConversion(invoiceRows) || hasMissingCollectionConversion(creditNoteRows)) return null;

  return calculateCollectionRate({
    invoiceGross: readNumber(invoiceRows?.[0], "gross"),
    invoiceCollected: readNumber(invoiceRows?.[0], "collected"),
    creditNoteGross: readNumber(creditNoteRows?.[0], "gross"),
    creditNoteRefunded: readNumber(creditNoteRows?.[0], "collected"),
  });
}

export function useCollectionRateData(
  entityId: string | undefined,
  overrides?: DashboardEntityOverrides,
): DashboardQueryResult<CollectionRateData> {
  const { currency } = useDashboardEntity(entityId, overrides);

  const queries: StatsQueryRequest[] = [
    // [0] Eligible invoices: gross and capped direct cash receipts
    { metrics: FINANCIAL_METRICS, table: "invoices", filters: { financial_eligible: true } },
    // [1] Eligible credit notes: gross and direct refunds (positive magnitudes)
    { metrics: FINANCIAL_METRICS, table: "credit_notes", filters: { financial_eligible: true } },
  ];

  const query = useStatsBatchQuery(entityId, "collection-rate", queries, { select: selectTotals });
  const totals = query.data ?? undefined;

  return {
    data: totals && currency ? { ...totals, currency } : undefined,
    isLoading: query.isLoading,
    unavailable: resolveUnavailable({
      isError: query.isError,
      currency: entityId ? currency : undefined,
      conversionMissing: query.isSuccess && query.data === null,
    }),
    retry: () => void query.refetch(),
  };
}
