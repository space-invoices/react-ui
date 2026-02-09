import type SDK from "@spaceinvoices/js-sdk";
import type { UseMutationOptions } from "@tanstack/react-query";

import { useQueryClient } from "@tanstack/react-query";
import { useResourceMutation } from "./use-resource-mutation";

/**
 * Options for resource mutation hooks
 */
type ResourceMutationHookOptions<TData, TError, TVariables = any> = {
  entityId?: string | null;
  accountId?: string | null;
  onSuccess?: (data: TData, variables: TVariables, context: unknown) => void;
  onError?: (error: TError, variables: TVariables, context: unknown) => void;
  mutationOptions?: Omit<UseMutationOptions<TData, TError, any, unknown>, "mutationFn" | "onSuccess" | "onError">;
};

/**
 * Build query key with optional filters
 */
function buildQueryKey(
  baseKey: string,
  filters?: { entityId?: string | null; accountId?: string | null },
): [string, Record<string, string>?] {
  if (!filters?.entityId && !filters?.accountId) {
    return [baseKey];
  }

  const params: Record<string, string> = {};
  if (filters.entityId) params.entityId = filters.entityId;
  if (filters.accountId) params.accountId = filters.accountId;

  return [baseKey, params];
}

/**
 * Invalidate resource-specific queries
 */
function invalidateResourceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  cacheKey: string,
  resourceId: string,
  filters?: { entityId?: string | null; accountId?: string | null },
): void {
  const detailKey = `${cacheKey}-${resourceId}`;
  queryClient.invalidateQueries({ queryKey: buildQueryKey(detailKey, filters) });
}

/**
 * Factory function to create resource-specific CRUD hooks
 *
 * @param resourceName - The name of the resource in the SDK (e.g., 'customers')
 * @param cacheKey - The cache key for the resource queries
 *
 * @example
 * ```ts
 * const { useCreateResource, useUpdateResource, useDeleteResource } =
 *   createResourceHooks<Customer, CreateCustomerRequest['data']>('customers', 'customers');
 *
 * // Usage
 * const createCustomer = useCreateResource();
 * ```
 */
export function createResourceHooks<
  TResource extends { id: string },
  TCreateData = unknown,
  TUpdateData = Partial<Omit<TResource, "id">>,
>(
  resourceName: keyof SDK,
  cacheKey: string,
  options?: { restoreMethodName?: string; permanentDeleteMethodName?: string },
) {
  /**
   * Hook for creating a new resource
   */
  function useCreateResource<TError = Error>(
    options: ResourceMutationHookOptions<TResource, TError, TCreateData> = {},
  ) {
    const queryClient = useQueryClient();

    return useResourceMutation<TResource, TError, TCreateData>({
      resourceName,
      methodName: "create",
      cacheKey,
      entityId: options.entityId,
      accountId: options.accountId,
      mutationOptions: {
        onMutate: async (variables) => {
          // Cancel any outgoing refetches to avoid overwriting optimistic update
          const listQueryKey = buildQueryKey(cacheKey, {
            entityId: options.entityId,
            accountId: options.accountId,
          });
          await queryClient.cancelQueries({ queryKey: listQueryKey });

          // Snapshot the previous value
          const previousData = queryClient.getQueryData(listQueryKey);

          // Optimistically add the new resource to the cache
          queryClient.setQueryData(listQueryKey, (oldData: any) => {
            if (!oldData?.data) return oldData;

            // Create temporary resource for optimistic update
            // Use 'unknown' as intermediate to safely cast
            const tempResource = {
              ...variables,
              id: `temp-${Date.now()}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as unknown as TResource;

            return {
              ...oldData,
              data: [tempResource, ...oldData.data],
              pagination: oldData.pagination
                ? {
                    ...oldData.pagination,
                    total: oldData.pagination.total + 1,
                  }
                : undefined,
            };
          });

          return { previousData };
        },
        onSuccess: options.onSuccess,
        onError: (error, variables, context: any) => {
          // Rollback on error
          if (context?.previousData) {
            const listQueryKey = buildQueryKey(cacheKey, {
              entityId: options.entityId,
              accountId: options.accountId,
            });
            queryClient.setQueryData(listQueryKey, context.previousData);
          }
          options.onError?.(error, variables, context);
        },
        onSettled: () => {
          // Always refetch after error or success to ensure consistency
          const listQueryKey = buildQueryKey(cacheKey, {
            entityId: options.entityId,
            accountId: options.accountId,
          });
          queryClient.invalidateQueries({ queryKey: listQueryKey });
        },
        ...options.mutationOptions,
      },
    });
  }

  /**
   * Hook for updating an existing resource
   */
  function useUpdateResource<TError = Error>(
    options: ResourceMutationHookOptions<TResource, TError, { id: string; data: TUpdateData }> = {},
  ) {
    const queryClient = useQueryClient();

    return useResourceMutation<TResource, TError, { id: string; data: TUpdateData }>({
      resourceName,
      methodName: "update",
      cacheKey: [cacheKey, `${cacheKey}-detail`],
      entityId: options.entityId,
      accountId: options.accountId,
      mutationOptions: {
        onMutate: async (variables) => {
          const listQueryKey = buildQueryKey(cacheKey, {
            entityId: options.entityId,
            accountId: options.accountId,
          });
          const detailKey = `${cacheKey}-${variables.id}`;
          const detailQueryKey = buildQueryKey(detailKey, {
            entityId: options.entityId,
            accountId: options.accountId,
          });

          // Cancel outgoing refetches
          await queryClient.cancelQueries({ queryKey: listQueryKey });
          await queryClient.cancelQueries({ queryKey: detailQueryKey });

          // Snapshot previous values
          const previousListData = queryClient.getQueryData(listQueryKey);
          const previousDetailData = queryClient.getQueryData(detailQueryKey);

          // Optimistically update list cache
          queryClient.setQueryData(listQueryKey, (oldData: any) => {
            if (!oldData?.data) return oldData;

            return {
              ...oldData,
              data: oldData.data.map((resource: TResource) =>
                resource.id === variables.id
                  ? {
                      ...resource,
                      ...variables.data,
                      updated_at: new Date().toISOString(),
                    }
                  : resource,
              ),
            };
          });

          // Optimistically update detail cache
          queryClient.setQueryData(detailQueryKey, (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              ...variables.data,
              updated_at: new Date().toISOString(),
            };
          });

          return { previousListData, previousDetailData };
        },
        onSuccess: (data, variables, context) => {
          // Invalidate the specific resource detail cache
          invalidateResourceQueries(queryClient, cacheKey, variables.id, {
            entityId: options.entityId,
            accountId: options.accountId,
          });

          options.onSuccess?.(data, variables, context);
        },
        onError: (error, variables, context: any) => {
          // Rollback on error
          if (context?.previousListData) {
            const listQueryKey = buildQueryKey(cacheKey, {
              entityId: options.entityId,
              accountId: options.accountId,
            });
            queryClient.setQueryData(listQueryKey, context.previousListData);
          }
          if (context?.previousDetailData) {
            const detailKey = `${cacheKey}-${variables.id}`;
            const detailQueryKey = buildQueryKey(detailKey, {
              entityId: options.entityId,
              accountId: options.accountId,
            });
            queryClient.setQueryData(detailQueryKey, context.previousDetailData);
          }
          options.onError?.(error, variables, context);
        },
        onSettled: () => {
          // Always refetch to ensure consistency
          const listQueryKey = buildQueryKey(cacheKey, {
            entityId: options.entityId,
            accountId: options.accountId,
          });
          queryClient.invalidateQueries({ queryKey: listQueryKey });
        },
        ...options.mutationOptions,
      },
    });
  }

  /**
   * Hook for deleting a resource
   */
  function useDeleteResource<TError = Error>(options: ResourceMutationHookOptions<void, TError, { id: string }> = {}) {
    const queryClient = useQueryClient();

    return useResourceMutation<void, TError, { id: string }>({
      resourceName,
      methodName: "delete",
      cacheKey,
      entityId: options.entityId,
      accountId: options.accountId,
      mutationOptions: {
        onSuccess: (data, variables, context) => {
          // Invalidate the specific resource detail cache
          invalidateResourceQueries(queryClient, cacheKey, variables.id, {
            entityId: options.entityId,
            accountId: options.accountId,
          });

          // Optimistically remove from list cache
          const listQueryKey = buildQueryKey(cacheKey, {
            entityId: options.entityId,
            accountId: options.accountId,
          });

          queryClient.setQueriesData({ queryKey: listQueryKey }, (oldData: any) => {
            if (!oldData?.data) return oldData;

            return {
              ...oldData,
              data: oldData.data.filter((resource: TResource) => resource.id !== variables.id),
            };
          });

          options.onSuccess?.(data, variables, context);
        },
        onError: options.onError,
        ...options.mutationOptions,
      },
    });
  }

  /**
   * Hook for restoring a soft-deleted resource
   */
  function useRestoreResource<TError = Error>(
    hookOptions: ResourceMutationHookOptions<TResource, TError, { id: string }> = {},
  ) {
    const queryClient = useQueryClient();
    const methodName = options?.restoreMethodName;
    if (!methodName) {
      throw new Error(`restoreMethodName not configured for ${String(resourceName)}`);
    }

    return useResourceMutation<TResource, TError, { id: string }>({
      resourceName,
      methodName,
      cacheKey,
      entityId: hookOptions.entityId,
      accountId: hookOptions.accountId,
      mutationOptions: {
        onSuccess: (data, variables, context) => {
          invalidateResourceQueries(queryClient, cacheKey, variables.id, {
            entityId: hookOptions.entityId,
            accountId: hookOptions.accountId,
          });
          hookOptions.onSuccess?.(data, variables, context);
        },
        onError: hookOptions.onError,
        ...hookOptions.mutationOptions,
      },
    });
  }

  /**
   * Hook for permanently deleting a soft-deleted resource
   */
  function usePermanentDeleteResource<TError = Error>(
    hookOptions: ResourceMutationHookOptions<void, TError, { id: string }> = {},
  ) {
    const queryClient = useQueryClient();
    const methodName = options?.permanentDeleteMethodName;
    if (!methodName) {
      throw new Error(`permanentDeleteMethodName not configured for ${String(resourceName)}`);
    }

    return useResourceMutation<void, TError, { id: string }>({
      resourceName,
      methodName,
      cacheKey,
      entityId: hookOptions.entityId,
      accountId: hookOptions.accountId,
      mutationOptions: {
        onSuccess: (data, variables, context) => {
          invalidateResourceQueries(queryClient, cacheKey, variables.id, {
            entityId: hookOptions.entityId,
            accountId: hookOptions.accountId,
          });

          const listQueryKey = buildQueryKey(cacheKey, {
            entityId: hookOptions.entityId,
            accountId: hookOptions.accountId,
          });

          queryClient.setQueriesData({ queryKey: listQueryKey }, (oldData: any) => {
            if (!oldData?.data) return oldData;
            return {
              ...oldData,
              data: oldData.data.filter((resource: TResource) => resource.id !== variables.id),
            };
          });

          hookOptions.onSuccess?.(data, variables, context);
        },
        onError: hookOptions.onError,
        ...hookOptions.mutationOptions,
      },
    });
  }

  return {
    useCreateResource,
    useUpdateResource,
    useDeleteResource,
    useRestoreResource,
    usePermanentDeleteResource,
  };
}
