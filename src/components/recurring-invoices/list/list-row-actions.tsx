import type { RecurringInvoice } from "@spaceinvoices/js-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, MoreHorizontal, Pause, Play, Trash2 } from "lucide-react";
import { useState } from "react";
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
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useSDK } from "@/ui/providers/sdk-provider";

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
  onViewSourceInvoice?: (documentId: string) => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: string) => void;
} & ComponentTranslationProps;

export default function RecurringInvoiceListRowActions({
  recurringInvoice,
  entityId,
  onViewSourceInvoice,
  onDeleteSuccess,
  onDeleteError,
  ...i18nProps
}: RecurringInvoiceListRowActionsProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });

  const { sdk } = useSDK();
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);

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
    if (!sdk) return;
    setIsToggling(true);
    try {
      if (recurringInvoice.status === "active") {
        await sdk.recurringInvoices.pauseRecurringInvoice(recurringInvoice.id);
      } else {
        await sdk.recurringInvoices.resumeRecurringInvoice(recurringInvoice.id);
      }
      queryClient.invalidateQueries({ queryKey: [RECURRING_INVOICES_CACHE_KEY] });
    } catch (error) {
      onDeleteError?.(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsToggling(false);
    }
  };

  const isPaused = recurringInvoice.status === "paused";

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
          {recurringInvoice.document_id && (
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onViewSourceInvoice?.(recurringInvoice.document_id)}
            >
              <Eye className="h-4 w-4" />
              {t("View source invoice")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="cursor-pointer" onClick={handleTogglePause} disabled={isToggling}>
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {isToggling ? t("Processing...") : isPaused ? t("Resume") : t("Pause")}
          </DropdownMenuItem>
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
