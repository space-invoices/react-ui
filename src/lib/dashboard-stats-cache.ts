import type { QueryClient } from "@tanstack/react-query";

/** Query key prefix for entity stats queries: `[STATS_QUERY_CACHE_KEY, entityId, ...]`. */
export const STATS_QUERY_CACHE_KEY = "entity-stats-query";
/** Query key prefix for the revenue-by-category report: `[REVENUE_BY_CATEGORY_CACHE_KEY, entityId, ...]`. */
export const REVENUE_BY_CATEGORY_CACHE_KEY = "revenue-by-category";

/**
 * Resource cache keys whose successful mutations change dashboard aggregates
 * (stats queries and the category report). Mutations for other resources leave
 * the dashboard caches untouched.
 */
export const DASHBOARD_SOURCE_CACHE_KEYS: ReadonlySet<string> = new Set([
  "invoices",
  "credit-notes",
  "advance-invoices",
  "payments",
  "customers",
  "items",
  "estimates",
  "financial-categories",
]);

/**
 * Mark the entity's dashboard aggregates stale and refetch the mounted ones.
 * Scoped to `entityId` when known so other entities' cached dashboards are not refetched.
 */
export function invalidateDashboardStatsQueries(queryClient: QueryClient, entityId?: string | null): Promise<void> {
  const scope = entityId ? [entityId] : [];
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [STATS_QUERY_CACHE_KEY, ...scope] }),
    queryClient.invalidateQueries({ queryKey: [REVENUE_BY_CATEGORY_CACHE_KEY, ...scope] }),
  ]).then(() => undefined);
}

/** Invalidate dashboard aggregates when a mutation touched a dashboard source resource. */
export function invalidateDashboardQueriesForResources(
  queryClient: QueryClient,
  cacheKeys: string | string[],
  entityId?: string | null,
): Promise<void> | undefined {
  const keys = Array.isArray(cacheKeys) ? cacheKeys : [cacheKeys];
  if (!keys.some((key) => DASHBOARD_SOURCE_CACHE_KEYS.has(key))) return undefined;
  return invalidateDashboardStatsQueries(queryClient, entityId);
}
