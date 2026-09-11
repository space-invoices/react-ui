import type { RecurringInvoice } from "@spaceinvoices/js-sdk";
import { recurringInvoices } from "@spaceinvoices/js-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { hasCountryCapability } from "@/ui/lib/country-capabilities";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useEntitiesOptional } from "@/ui/providers/entities-context";

import { RECURRING_INVOICES_CACHE_KEY, useDeleteRecurringInvoice } from "../recurring-invoices.hooks";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";

const translations = {
  sl,
  de,
  it,
  fr,
  es,
  pt,
  nl,
  pl,
  hr,
} as const;

type RecurringInvoiceListRowActionsProps = {
  recurringInvoice: RecurringInvoice;
  entityId?: string;
  editLabel?: string;
  onEdit?: (recurringInvoice: RecurringInvoice) => void;
  onViewSourceInvoice?: (documentId: string) => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: string) => void;
} & ComponentTranslationProps;

export default function RecurringInvoiceListRowActions({
  recurringInvoice,
  entityId,
  editLabel,
  onEdit,
  onViewSourceInvoice,
  onDeleteSuccess,
  onDeleteError,
  ...i18nProps
}: RecurringInvoiceListRowActionsProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });

  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);

  const entitiesContext = useEntitiesOptional();
  const activeEntity = entitiesContext?.activeEntity ?? null;
  const entities = entitiesContext?.entities;
  // An explicit entityId owns the row even when another entity is active, so the row is
  // gated by the schedule's own entity rather than by whatever the user last selected.
  const entity = useMemo(() => {
    if (!entityId) return activeEntity;
    if (activeEntity?.id === entityId) return activeEntity;
    return entities?.find((candidate) => candidate.id === entityId) ?? null;
  }, [activeEntity, entities, entityId]);

  /**
   * A country that does not support recurring invoices keeps existing schedules listable,
   * pausable and deletable, but the API rejects updating or resuming them. Editing is hidden
   * there, and the pause/resume item is kept only for an `active` schedule: every other
   * persisted status (`paused`, `completed`) routes the toggle through resume, which the
   * server refuses, so the row never offers an action the server rejects.
   */
  const allowRecurringManagement = hasCountryCapability(entity, "recurring_invoices");

  const { mutate: deleteRecurringInvoice, isPending: isDeleting } = useDeleteRecurringInvoice({
    entityId,
    onSuccess: () => {
      onDeleteSuccess?.();
    },
    onError: (error: Error) => {
      onDeleteError?.(error.message);
    },
  });

  const handleDelete = () => {
    deleteRecurringInvoice({ id: recurringInvoice.id });
  };

  const handleTogglePause = async () => {
    setIsToggling(true);
    try {
      if (recurringInvoice.status === "active") {
        await recurringInvoices.pauseRecurringInvoice(recurringInvoice.id);
      } else {
        await recurringInvoices.resumeRecurringInvoice(recurringInvoice.id);
      }
      queryClient.invalidateQueries({ queryKey: [RECURRING_INVOICES_CACHE_KEY] });
    } catch (error) {
      onDeleteError?.(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsToggling(false);
    }
  };

  const isPaused = recurringInvoice.status === "paused";
  // `handleTogglePause` only pauses an `active` schedule; anything else resumes, which a
  // denied country rejects. Keep the toggle under denial for `active` alone.
  const canToggleSchedule = allowRecurringManagement || recurringInvoice.status === "active";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 cursor-pointer p-0" id="action-menu-trigger">
          <span className="sr-only">{t("Open menu")}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
        <DropdownMenuGroup>
          {allowRecurringManagement && (
            <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit?.(recurringInvoice)}>
              <Pencil className="h-4 w-4" />
              {editLabel ?? "Edit"}
            </DropdownMenuItem>
          )}
          {recurringInvoice.document_id && (
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onViewSourceInvoice?.(recurringInvoice.document_id)}
            >
              <Eye className="h-4 w-4" />
              {t("View source invoice")}
            </DropdownMenuItem>
          )}
          {canToggleSchedule && (
            <DropdownMenuItem className="cursor-pointer" onClick={handleTogglePause} disabled={isToggling}>
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isToggling ? t("Processing...") : isPaused ? t("Resume") : t("Pause")}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? t("Deleting...") : t("Delete schedule")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
