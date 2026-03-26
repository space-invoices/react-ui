import { type CreateTaxBody, type PaginatedResponse, type Tax, taxes, type UpdateTaxBody } from "@spaceinvoices/js-sdk";
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createResourceHooks } from "../../hooks/create-resource-hooks";

export const TAXES_CACHE_KEY = "taxes";

const {
  useCreateResource: useCreateTax,
  useUpdateResource: useUpdateTax,
  useDeleteResource: useDeleteTax,
  useRestoreResource: useRestoreTax,
  usePermanentDeleteResource: usePermanentDeleteTax,
} = createResourceHooks<Tax, CreateTaxBody, UpdateTaxBody>(
  {
    create: taxes.create,
    update: taxes.update,
    delete: taxes.delete,
    restore: taxes.restoreTax,
    permanentDelete: taxes.permanentDeleteTax,
  },
  TAXES_CACHE_KEY,
);

export { useCreateTax, useDeleteTax, usePermanentDeleteTax, useRestoreTax, useUpdateTax };

type ReplaceTaxVariables = {
  id: string;
  data: CreateTaxBody;
};

export function useReplaceTax(
  options: {
    entityId?: string | null;
    onSuccess?: (data: Tax, variables: ReplaceTaxVariables, context: unknown) => void;
    onError?: (error: Error, variables: ReplaceTaxVariables, context: unknown) => void;
    mutationOptions?: Omit<
      UseMutationOptions<Tax, Error, ReplaceTaxVariables, unknown>,
      "mutationFn" | "onSuccess" | "onError"
    >;
  } = {},
) {
  const queryClient = useQueryClient();

  return useMutation<Tax, Error, ReplaceTaxVariables>({
    mutationFn: async ({ id, data }) => taxes.replaceTax(id, data, { entity_id: options.entityId ?? undefined }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [TAXES_CACHE_KEY] });
      queryClient.invalidateQueries({ queryKey: [TAXES_CACHE_KEY, variables.id, options.entityId] });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options.mutationOptions,
  });
}

/**
 * Hook to fetch all taxes for an entity
 */
export function useListTaxes(
  entityId: string,
  options?: Omit<UseQueryOptions<PaginatedResponse<Tax>, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: [TAXES_CACHE_KEY, entityId],
    queryFn: () =>
      taxes.list({
        entity_id: entityId,
        limit: 100,
      }),
    enabled: !!entityId,
    ...options,
  });
}
