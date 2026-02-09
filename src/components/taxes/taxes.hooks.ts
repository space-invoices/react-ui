import type { CreateTaxBody, PaginatedResponse, Tax, UpdateTaxBody } from "@spaceinvoices/js-sdk";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { createResourceHooks } from "../../hooks/create-resource-hooks";
import { useSDK } from "../../providers/sdk-provider";

export const TAXES_CACHE_KEY = "taxes";

const {
  useCreateResource: useCreateTax,
  useUpdateResource: useUpdateTax,
  useDeleteResource: useDeleteTax,
  useRestoreResource: useRestoreTax,
  usePermanentDeleteResource: usePermanentDeleteTax,
} = createResourceHooks<Tax, CreateTaxBody, UpdateTaxBody>("taxes", TAXES_CACHE_KEY, {
  restoreMethodName: "restoreTax",
  permanentDeleteMethodName: "permanentDeleteTax",
});

export { useCreateTax, useUpdateTax, useDeleteTax, useRestoreTax, usePermanentDeleteTax };

/**
 * Hook to fetch all taxes for an entity
 */
export function useListTaxes(
  entityId: string,
  options?: Omit<UseQueryOptions<PaginatedResponse<Tax>, Error>, "queryKey" | "queryFn">,
) {
  const { sdk } = useSDK();

  return useQuery({
    queryKey: [TAXES_CACHE_KEY, entityId],
    queryFn: () =>
      sdk.taxes.list({
        entity_id: entityId,
        limit: 100,
      }),
    enabled: !!sdk && !!entityId,
    ...options,
  });
}
