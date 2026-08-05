import type { CreateEntityBody, Entity, PatchEntityBody } from "@spaceinvoices/js-sdk";
import { entities } from "@spaceinvoices/js-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

// Cache key for entities queries
export const ENTITIES_CACHE_KEY = "entities";

const disableEntity = async (id: string): Promise<void> => {
  await entities.disableEntity(id);
};

// Create hooks for entity operations (create and delete only)
// Note: Update hook is custom because SDK uses "patchEntity" not "updateEntity"
const { useCreateResource: useCreateEntity, useDeleteResource: useDeleteEntity } = createResourceHooks<
  Entity,
  CreateEntityBody
>(
  {
    create: entities.create,
    update: entities.update,
    delete: disableEntity,
  },
  ENTITIES_CACHE_KEY,
);

/**
 * Custom update hook because entities API uses "patchEntity" with different param naming.
 *
 * Settings contract: the server merges `data.settings` per TOP-LEVEL key —
 * omitted keys keep their current value, so callers must send only the keys
 * they own, never a spread of the cached `entity.settings` (a stale echo can
 * revert keys owned by other surfaces). Two keys merge one level deeper on
 * the server: `translations` (per namespace) and `unit_number_sequence_starts`
 * (per document type and business unit). Protected keys (furs, fina, slovenia,
 * e_invoicing, revenue_recognition) are managed by dedicated endpoints and are
 * ignored by the API if sent here — the generated PatchEntityBody type
 * excludes them.
 */
type UpdateEntityOptions = {
  entityId?: string | null;
  accountId?: string | null;
  onSuccess?: (data: Entity, variables: { id: string; data: PatchEntityBody }, context: unknown) => void;
  onError?: (error: Error, variables: { id: string; data: PatchEntityBody }, context: unknown) => void;
};

function useUpdateEntity(options: UpdateEntityOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<Entity, Error, { id: string; data: PatchEntityBody }>({
    mutationFn: async (variables) => {
      return entities.update(variables.id, variables.data, {
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

type EmailSenderDto = {
  email: string;
  verification_status: "pending" | "verified" | "failed";
  verified_at: string | null;
  domain: string | null;
  email_verification_status: "pending" | "verified" | "failed";
  domain_verification_status: "pending" | "verified" | "failed";
  domain_dkim_tokens: string[];
  last_checked_at: string | null;
} | null;

type EntityEmailSenderResponse = {
  configured: EmailSenderDto;
  inherited: EmailSenderDto;
  effective: {
    source: "entity" | "white_label" | "default";
    email: string | null;
    verified: boolean;
  };
};

type EntityEmailSenderOptions = {
  entityId?: string | null;
  enabled?: boolean;
};

function useEntityEmailSender(options: EntityEmailSenderOptions = {}) {
  return useQuery<EntityEmailSenderResponse>({
    queryKey: ["entity-email-sender", options.entityId],
    queryFn: async () =>
      entities.getEntityEmailSender(options.entityId!, {
        entity_id: options.entityId ?? undefined,
      }) as Promise<EntityEmailSenderResponse>,
    enabled: Boolean(options.entityId && (options.enabled ?? true)),
  });
}

type PutEntityEmailSenderOptions = {
  entityId?: string | null;
  onSuccess?: (
    data: EntityEmailSenderResponse,
    variables: { id: string; email: string | null },
    context: unknown,
  ) => void;
  onError?: (error: Error, variables: { id: string; email: string | null }, context: unknown) => void;
};

function usePutEntityEmailSender(options: PutEntityEmailSenderOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<EntityEmailSenderResponse, Error, { id: string; email: string | null }>({
    mutationFn: async (variables) =>
      entities.putEntityEmailSender(
        variables.id,
        { email: variables.email },
        {
          entity_id: options.entityId ?? undefined,
        },
      ) as Promise<EntityEmailSenderResponse>,
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(["entity-email-sender", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["entity-email-sender", variables.id] });
      options.onSuccess?.(data, variables, context);
    },
    onError: options.onError,
  });
}

type RecheckEntityEmailSenderOptions = {
  entityId?: string | null;
  onSuccess?: (data: EntityEmailSenderResponse, variables: { id: string }, context: unknown) => void;
  onError?: (error: Error, variables: { id: string }, context: unknown) => void;
};

function useRecheckEntityEmailSender(options: RecheckEntityEmailSenderOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<EntityEmailSenderResponse, Error, { id: string }>({
    mutationFn: async (variables) => {
      return entities.recheckEntityEmailSender(variables.id, {
        entity_id: options.entityId ?? undefined,
      }) as Promise<EntityEmailSenderResponse>;
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(["entity-email-sender", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["entity-email-sender", variables.id] });
      options.onSuccess?.(data, variables, context);
    },
    onError: options.onError,
  });
}

// Export the type for the create entity data for convenience
export type CreateEntityData = CreateEntityBody;

export {
  useCreateEntity,
  useDeleteEntity,
  useEntityEmailSender,
  usePutEntityEmailSender,
  useRecheckEntityEmailSender,
  useUpdateEntity,
};
