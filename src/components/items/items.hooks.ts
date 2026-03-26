import type { CreateItemRequest, Item, UpdateItemBody } from "@spaceinvoices/js-sdk";
import { items } from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";
import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

// Define a constant for the items cache key
export const ITEMS_CACHE_KEY = "items";

// Create item-specific hooks using the factory
const {
  useCreateResource: useCreateItem,
  useUpdateResource: useUpdateItem,
  useDeleteResource: useDeleteItem,
  useRestoreResource: useRestoreItem,
  usePermanentDeleteResource: usePermanentDeleteItem,
} = createResourceHooks<Item, CreateItemRequest, UpdateItemBody>(
  {
    create: items.create,
    update: items.update,
    delete: items.delete,
    restore: items.restoreItem,
    permanentDelete: items.permanentDeleteItem,
  },
  ITEMS_CACHE_KEY,
);

export { useCreateItem, useDeleteItem, usePermanentDeleteItem, useRestoreItem, useUpdateItem };

/**
 * Hook to search items by name
 */
export const useItemSearch = (entityId: string, search: string) => {
  return useQuery({
    queryKey: [ITEMS_CACHE_KEY, "search", entityId, search],
    queryFn: async () => {
      if (!search) return { data: [] };

      const response = await items.list({
        entity_id: entityId,
        search,
        limit: 10,
      });

      return response;
    },
    enabled: Boolean(entityId && search),
  });
};

/**
 * Hook to fetch recent items for an entity
 */
export const useRecentItems = (entityId: string) => {
  return useQuery({
    queryKey: [ITEMS_CACHE_KEY, "recent", entityId],
    queryFn: async () => {
      const response = await items.list({
        entity_id: entityId,
        limit: 5,
        order_by: "-created_at",
      });

      return response;
    },
    enabled: Boolean(entityId),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
