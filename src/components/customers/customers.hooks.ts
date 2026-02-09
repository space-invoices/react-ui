import type { CreateCustomerBody, Customer } from "@spaceinvoices/js-sdk";

import { useQuery } from "@tanstack/react-query";

import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";
import { useSDK } from "@/ui/providers/sdk-provider";

// Define a constant for the customers cache key
export const CUSTOMERS_CACHE_KEY = "customers";

export const useCustomerSearch = (entityId: string, search: string) => {
  const { sdk } = useSDK();

  return useQuery({
    // Don't include SDK in query key - it's guaranteed non-null by provider
    // Including it breaks cache due to object reference changes
    queryKey: [CUSTOMERS_CACHE_KEY, "search", entityId, search],
    queryFn: async () => {
      if (!search) return { data: [] };

      const response = await sdk.customers.list({
        entity_id: entityId,
        search,
        limit: 10,
      });

      return response;
    },
    // SDK is always available, only check search and entityId
    enabled: Boolean(entityId && search),
  });
};

export const useRecentCustomers = (entityId: string) => {
  const { sdk } = useSDK();

  return useQuery({
    queryKey: [CUSTOMERS_CACHE_KEY, "recent", entityId],
    queryFn: async () => {
      const response = await sdk.customers.list({
        entity_id: entityId,
        limit: 5,
        order_by: "-created_at", // Sort by most recently created
      });

      return response;
    },
    enabled: Boolean(entityId),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export const {
  useCreateResource: useCreateCustomer,
  useUpdateResource: useUpdateCustomer,
  useDeleteResource: useDeleteCustomer,
  useRestoreResource: useRestoreCustomer,
  usePermanentDeleteResource: usePermanentDeleteCustomer,
} = createResourceHooks<Customer, CreateCustomerBody>("customers", CUSTOMERS_CACHE_KEY, {
  restoreMethodName: "restoreCustomer",
  permanentDeleteMethodName: "permanentDeleteCustomer",
});
