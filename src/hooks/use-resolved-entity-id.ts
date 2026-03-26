import { useEntitiesOptional } from "@/ui/providers/entities-context";

export function useResolvedEntityId(explicitEntityId?: string | null, consumerName = "Space Invoices component") {
  const entitiesContext = useEntitiesOptional();
  const resolvedEntityId = explicitEntityId ?? entitiesContext?.activeEntity?.id ?? null;

  if (!resolvedEntityId) {
    throw new Error(
      `${consumerName} requires an entity ID. Pass entityId explicitly or render it inside an EntitiesProvider with an active entity.`,
    );
  }

  return resolvedEntityId;
}
