import type { QueryClient } from "@tanstack/react-query";

/** Query key prefix for remaining creditable quantities: `[key, invoiceId, entityId]`. */
export const INVOICE_CREDIT_OPTIONS_CACHE_KEY = "invoice-credit-options";
/** Query key prefix for duplicate/conversion prefills: `[key, sourceId, targetType, entityId]`. */
export const DUPLICATE_DOCUMENT_CACHE_KEY = "duplicate-document";

/**
 * Resource cache keys whose successful mutations change how much of an invoice is still
 * creditable. Only credit notes consume that balance; mutations of any other resource leave
 * these caches alone.
 */
export const CREDIT_PREPARATION_SOURCE_CACHE_KEYS: ReadonlySet<string> = new Set(["credit-notes"]);

/**
 * Refresh everything derived from an invoice's remaining creditable balance, for one entity.
 *
 * Two caches hold that balance and they need opposite treatment:
 *
 * - The credit-options query backs a control the user is looking at (the disabled "create
 *   credit note" action), so it is invalidated and the mounted query refetches in place.
 * - A correction prefill is a one-shot snapshot the form reads once on mount. Invalidating it
 *   would still hand the next mount the stale quantities while a background refetch runs, so
 *   the entry is removed and the next correction starts from a fresh fetch.
 *
 * Both are scoped to `entityId`, so another entity's cached balances are untouched, and only
 * credit-note prefills are dropped - an ordinary duplicate prefill is unaffected.
 */
export function invalidateCreditPreparationQueries(queryClient: QueryClient, entityId?: string | null): void {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const [key, , queryEntityId] = query.queryKey as [string?, string?, string?];
      if (key !== INVOICE_CREDIT_OPTIONS_CACHE_KEY) return false;
      return !entityId || queryEntityId === entityId;
    },
  });

  queryClient.removeQueries({
    predicate: (query) => {
      const [key, , targetType, queryEntityId] = query.queryKey as [string?, string?, string?, string?];
      if (key !== DUPLICATE_DOCUMENT_CACHE_KEY || targetType !== "credit_note") return false;
      return !entityId || queryEntityId === entityId;
    },
  });
}

/** Apply the policy when a mutation touched a resource that consumes creditable balance. */
export function invalidateCreditPreparationForResources(
  queryClient: QueryClient,
  cacheKeys: string | string[],
  entityId?: string | null,
): void {
  const keys = Array.isArray(cacheKeys) ? cacheKeys : [cacheKeys];
  if (!keys.some((key) => CREDIT_PREPARATION_SOURCE_CACHE_KEYS.has(key))) return;
  invalidateCreditPreparationQueries(queryClient, entityId);
}
