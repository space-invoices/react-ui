import type { CreateCustomerBody, Customer, UpdateCustomerBody } from "@spaceinvoices/js-sdk";
import { customers } from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";
import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

// Define a constant for the customers cache key
export const CUSTOMERS_CACHE_KEY = "customers";

export const useCustomerSearch = (entityId: string, search: string) => {
  return useQuery({
    queryKey: [CUSTOMERS_CACHE_KEY, "search", entityId, search],
    queryFn: async () => {
      if (!search) return { data: [] };

      const response = await customers.list({
        entity_id: entityId,
        search,
        limit: 10,
      });

      return response;
    },
    enabled: Boolean(entityId && search),
  });
};

export const useRecentCustomers = (entityId: string) => {
  return useQuery({
    queryKey: [CUSTOMERS_CACHE_KEY, "recent", entityId],
    queryFn: async () => {
      const response = await customers.list({
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
} = createResourceHooks<Customer, CreateCustomerBody, UpdateCustomerBody>(
  {
    create: customers.create,
    update: customers.update,
    delete: customers.delete,
    restore: customers.restoreCustomer,
    permanentDelete: customers.permanentDeleteCustomer,
  },
  CUSTOMERS_CACHE_KEY,
);
