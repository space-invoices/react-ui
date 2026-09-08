/**
 * Resolves the currency and business calendar for the entity a dashboard widget
 * shows. Follows the explicit entity ID lookup pattern (`useResolvedEntityId`):
 * the entity is looked up in the optional `EntitiesProvider` by ID, and
 * provider-free consumers pass `currency` / `timeZone` explicitly.
 *
 * No hardcoded currency fallback: an unknown currency is reported as `null`
 * so widgets render an explicit unavailable state instead of mislabelling amounts.
 */
import { useMemo } from "react";
import {
  type CalendarDate,
  getCalendarDateInTimeZone,
  isValidTimeZone,
  resolveEntityTimeZone,
} from "@/ui/lib/entity-calendar";
import { useEntitiesOptional } from "@/ui/providers/entities-context";

export type DashboardEntityOverrides = {
  /** ISO 4217 currency to label converted amounts with; defaults to the entity's `currency_code`. */
  currency?: string | null;
  /** IANA timezone for calendar periods; defaults to the entity's `timezone`. */
  timeZone?: string | null;
};

export type DashboardEntityContext = {
  currency: string | null;
  timeZone: string;
  /** The entity's calendar today, used to build period ranges. */
  today: CalendarDate;
};

export function useDashboardEntity(
  entityId: string | undefined,
  overrides?: DashboardEntityOverrides,
): DashboardEntityContext {
  const entities = useEntitiesOptional();
  const entity = useMemo(() => {
    if (!entityId || !entities) return undefined;
    return (
      entities.entities.find((candidate) => candidate.id === entityId) ??
      (entities.activeEntity?.id === entityId ? entities.activeEntity : undefined)
    );
  }, [entities, entityId]);

  const overrideCurrency = overrides?.currency?.trim();
  const overrideTimeZone = overrides?.timeZone?.trim();
  const currency = overrideCurrency || entity?.currency_code?.trim() || null;
  const timeZone =
    overrideTimeZone && isValidTimeZone(overrideTimeZone) ? overrideTimeZone : resolveEntityTimeZone(entity);
  const today = getCalendarDateInTimeZone(new Date(), timeZone);

  return { currency, timeZone, today };
}
