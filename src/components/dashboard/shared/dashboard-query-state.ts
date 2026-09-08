/**
 * Shared result shape and metric readers for dashboard data hooks.
 *
 * Every financial stats query carries a `conversion_missing` counter (sum of the
 * backend's `financial_conversion_missing` field). A nonzero counter means at
 * least one document has no usable entity-currency amount, so the affected
 * widget reports `unavailable: "conversion"` instead of an understated total.
 * Query failures report `unavailable: "error"`; a missing entity currency
 * reports `unavailable: "currency"`. Loading and real-zero results stay distinct.
 */
import type { StatsQueryDataItem, StatsQueryRequestMetricsItem } from "@spaceinvoices/js-sdk";
import type { DashboardUnavailableReason } from "../unavailable-state/dashboard-unavailable";

export const CONVERSION_MISSING_ALIAS = "conversion_missing";
export const COLLECTION_CONVERSION_MISSING_ALIAS = "collection_conversion_missing";

export const CONVERSION_MISSING_METRIC: StatsQueryRequestMetricsItem = {
  type: "sum",
  field: "financial_conversion_missing",
  alias: CONVERSION_MISSING_ALIAS,
};

/**
 * Collection widgets also need the backend's cash-aware counter: a valid
 * document with an unusable direct payment (currency mismatch, no amount)
 * would otherwise look zero-collected without any error.
 */
export const COLLECTION_CONVERSION_MISSING_METRIC: StatsQueryRequestMetricsItem = {
  type: "sum",
  field: "collection_conversion_missing",
  alias: COLLECTION_CONVERSION_MISSING_ALIAS,
};

export type DashboardQueryResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  /** Why no value can be shown; `null` when `data` is trustworthy (including real zeros). */
  unavailable: DashboardUnavailableReason | null;
  retry: () => void;
};

export function readNumber(row: StatsQueryDataItem | undefined, alias: string): number {
  return Number(row?.[alias]) || 0;
}

export function sumMetric(rows: StatsQueryDataItem[] | undefined, alias: string): number {
  return (rows ?? []).reduce((sum, row) => sum + readNumber(row, alias), 0);
}

export function hasMissingConversion(rows: StatsQueryDataItem[] | undefined): boolean {
  return sumMetric(rows, CONVERSION_MISSING_ALIAS) > 0;
}

export function hasMissingCollectionConversion(rows: StatsQueryDataItem[] | undefined): boolean {
  return hasMissingConversion(rows) || sumMetric(rows, COLLECTION_CONVERSION_MISSING_ALIAS) > 0;
}

/**
 * Report endpoints answer 422 when historical amounts cannot be converted
 * reliably; that is a data-verification problem, not a transient failure.
 */
export function unavailableReasonForError(error: unknown): DashboardUnavailableReason {
  const status = typeof error === "object" && error !== null ? (error as { status?: unknown }).status : undefined;
  return status === 422 ? "conversion" : "error";
}

export function resolveUnavailable(input: {
  isError: boolean;
  currency?: string | null;
  conversionMissing?: boolean;
}): DashboardUnavailableReason | null {
  if (input.isError) return "error";
  if (input.currency === null) return "currency";
  if (input.conversionMissing) return "conversion";
  return null;
}
