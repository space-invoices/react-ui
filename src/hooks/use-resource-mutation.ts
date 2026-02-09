import type SDK from "@spaceinvoices/js-sdk";
import type { SDKMethodOptions } from "@spaceinvoices/js-sdk";
import type { UseMutationOptions } from "@tanstack/react-query";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSDK } from "@/ui/providers/sdk-provider";

type ResourceMutationOptions<TData, TError, TVariables, TContext> = {
  /** The resource name in the SDK (e.g., 'customers', 'invoices') */
  resourceName: keyof SDK;
  /** The method name to call on the resource (e.g., 'create', 'update', 'delete') */
  methodName: string;
  /** The cache key(s) to invalidate after successful mutation */
  cacheKey: string | string[];
  /** Entity ID for multi-tenant filtering */
  entityId?: string | null;
  /** Account ID for account-specific requests */
  accountId?: string | null;
  /** Additional mutation options from React Query */
  mutationOptions?: Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    "mutationFn" | "onSuccess" | "onError"
  > & {
    /** Custom success callback - receives data, variables, and context */
    onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void;
    /** Custom error callback - receives error, variables, and context */
    onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
  };
};

/**
 * Generic hook for creating mutations for any resource in the SDK
 * Automatically handles cache invalidation and error handling
 */
export function useResourceMutation<TData, TError = Error, TVariables = unknown, TContext = unknown>({
  resourceName,
  methodName,
  cacheKey,
  entityId,
  accountId,
  mutationOptions,
}: ResourceMutationOptions<TData, TError, TVariables, TContext>) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  // Destructure to separate onSuccess/onError from other options
  const { onSuccess: customOnSuccess, onError: customOnError, ...otherOptions } = mutationOptions || {};

  return useMutation<TData, TError, TVariables, TContext>({
    ...otherOptions,
    mutationFn: async (variables: TVariables) => {
      // SDK is guaranteed non-null by provider - no need to check
      const resource = sdk[resourceName] as Record<string, (...args: unknown[]) => Promise<unknown>>;

      if (!resource || typeof resource[methodName] !== "function") {
        throw new Error(`Method ${methodName} not found on resource ${String(resourceName)}`);
      }

      // Build SDK options (entity_id, etc.)
      const options: SDKMethodOptions | undefined = entityId ? { entity_id: entityId } : undefined;

      // SDK API: method(data, options) or method(id, data, options)
      const isUpdateMethod = methodName === "update";
      const isIdOnlyMethod =
        methodName === "delete" || methodName.startsWith("restore") || methodName.startsWith("permanentDelete");

      if (isUpdateMethod) {
        // Update: method(id, data, options)
        const { id, data } = variables as { id: string; data: unknown };
        return (await resource[methodName](id, data, options)) as TData;
      }

      if (isIdOnlyMethod) {
        // Delete/Restore/PermanentDelete: method(id, options)
        const { id } = variables as { id: string };
        return (await resource[methodName](id, options)) as TData;
      }

      // Create: method(data, options)
      return (await resource[methodName](variables, options)) as TData;
    },

    onSuccess: (data, variables, context) => {
      // Invalidate all relevant cache keys
      invalidateCacheKeys(queryClient, cacheKey, entityId, accountId);

      // Call custom onSuccess if provided
      customOnSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      // Call custom onError if provided
      customOnError?.(error, variables, context);
    },
  });
}

/**
 * Invalidate cache keys - marks queries as stale and refetches active ones
 */
function invalidateCacheKeys(
  queryClient: ReturnType<typeof useQueryClient>,
  cacheKey: string | string[],
  _entityId?: string | null,
  _accountId?: string | null,
): void {
  const cacheKeys = Array.isArray(cacheKey) ? cacheKey : [cacheKey];

  cacheKeys.forEach((key) => {
    // Invalidate all queries that start with this cache key
    // This marks them as stale (ignoring staleTime) and refetches active queries
    queryClient.invalidateQueries({
      queryKey: [key],
      exact: false, // Match all queries starting with this key
      refetchType: "active", // Refetch queries that are currently active
    });
  });
}
