/**
 * Top customers hook using the entity stats API.
 *
 * Basis: gross invoiced amount (tax-inclusive, entity currency) of eligible
 * invoices, grouped by stable customer identity (`customer_key`) with the
 * canonical display name; credit notes are not deducted.
 *
 * The missing-conversion guard is a separate ungrouped sum over ALL eligible
 * invoices: a customer whose gross is partly unconvertible may rank below the
 * returned top rows today and belong in them after repair, so checking only
 * the visible groups would allow a wrong ranking.
 * Sends 2 queries in a single batch request.
 */
import type { StatsQueryDataItem, StatsQueryRequest } from "@spaceinvoices/js-sdk";
import {
  CONVERSION_MISSING_METRIC,
  type DashboardQueryResult,
  hasMissingConversion,
  readNumber,
  resolveUnavailable,
} from "../shared/dashboard-query-state";
import { type DashboardEntityOverrides, useDashboardEntity } from "../shared/use-dashboard-entity";
import { useStatsBatchQuery } from "../shared/use-stats-query";

export const TOP_CUSTOMERS_CACHE_KEY = "dashboard-top-customers";

export type TopCustomersData = { name: string; revenue: number }[];

export type TopCustomersResult = { data: TopCustomersData; currency: string };

export function useTopCustomersData(
  entityId: string | undefined,
  limit = 5,
  overrides?: DashboardEntityOverrides,
): DashboardQueryResult<TopCustomersResult> {
  const { currency } = useDashboardEntity(entityId, overrides);

  const queries: StatsQueryRequest[] = [
    // [0] Top customer groups by gross invoiced amount
    {
      metrics: [
        { type: "sum", field: "financial_gross_converted", alias: "revenue" },
        { type: "count", alias: "invoice_count" },
      ],
      table: "invoices",
      filters: { financial_eligible: true },
      group_by: ["customer_key", "customer_display_name"],
      order_by: [{ field: "revenue", direction: "desc" }],
      limit,
    },
    // [1] Missing-conversion guard over every eligible invoice, not only the returned groups
    {
      metrics: [CONVERSION_MISSING_METRIC],
      table: "invoices",
      filters: { financial_eligible: true },
    },
  ];

  const query = useStatsBatchQuery(entityId, "top-customers", queries, {
    select: (batch): TopCustomersData | null => {
      if (hasMissingConversion(batch[1]?.data)) return null;
      const rows = (batch[0]?.data ?? []) as StatsQueryDataItem[];
      return rows.map((row) => ({
        name: String(row.customer_display_name ?? "").trim() || "Unknown",
        revenue: readNumber(row, "revenue"),
      }));
    },
  });

  return {
    data: query.data && currency ? { data: query.data, currency } : undefined,
    isLoading: query.isLoading,
    unavailable: resolveUnavailable({
      isError: query.isError,
      currency: entityId ? currency : undefined,
      conversionMissing: query.isSuccess && query.data === null,
    }),
    retry: () => void query.refetch(),
  };
}
