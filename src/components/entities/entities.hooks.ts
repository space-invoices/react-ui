import type { CreateEntityBody, Entity, PatchEntityBody } from "@spaceinvoices/js-sdk";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";
import { useSDK } from "@/ui/providers/sdk-provider";

// Cache key for entities queries
export const ENTITIES_CACHE_KEY = "entities";

// Create hooks for entity operations (create and delete only)
// Note: Update hook is custom because SDK uses "patchEntity" not "updateEntity"
const { useCreateResource: useCreateEntity, useDeleteResource: useDeleteEntity } = createResourceHooks<
  Entity,
  CreateEntityBody
>("entities", ENTITIES_CACHE_KEY);

// Custom update hook because entities API uses "patchEntity" with different param naming
type UpdateEntityOptions = {
  entityId?: string | null;
  accountId?: string | null;
  onSuccess?: (data: Entity, variables: { id: string; data: PatchEntityBody }, context: unknown) => void;
  onError?: (error: Error, variables: { id: string; data: PatchEntityBody }, context: unknown) => void;
};

function useUpdateEntity(options: UpdateEntityOptions = {}) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation<Entity, Error, { id: string; data: PatchEntityBody }>({
    mutationFn: async (variables) => {
      // SDK update expects: (id, body, options?)
      return sdk.entities.update(variables.id, variables.data, {
        entity_id: options.entityId ?? undefined,
      });
    },
    onSuccess: (data, variables, context) => {
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: [ENTITIES_CACHE_KEY] });
      const detailKey = `${ENTITIES_CACHE_KEY}-${variables.id}`;
      queryClient.invalidateQueries({ queryKey: [detailKey] });
      options.onSuccess?.(data, variables, context);
    },
    onError: options.onError,
  });
}

// Export the type for the create entity data for convenience
export type CreateEntityData = CreateEntityBody;

export { useCreateEntity, useUpdateEntity, useDeleteEntity };
