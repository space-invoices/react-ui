import type { DeliveryNote } from "@spaceinvoices/js-sdk";

import { Ban, Copy, Download, Eye, Link2Off, Loader2, MoreHorizontal } from "lucide-react";
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
import { actionMenuTooltipProps, Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useDeliveryNoteDownload } from "./use-delivery-note-download";

const translations = {
  sl: {
    "Create invoice": "Ustvari račun",
    "This document is already voided.": "Ta dokument je že storniran.",
  },
} as const;

type DeliveryNoteListRowActionsProps = {
  deliveryNote: DeliveryNote;
  onView?: (deliveryNote: DeliveryNote) => void;
  onDuplicate?: (deliveryNote: DeliveryNote) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onUnshare?: (deliveryNote: DeliveryNote) => Promise<void>;
  isUnsharing?: boolean;
  onVoid?: (deliveryNote: DeliveryNote) => void;
  isVoiding?: boolean;
} & ComponentTranslationProps;

export default function DeliveryNoteListRowActions({
  deliveryNote,
  onView,
  onDuplicate,
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  onUnshare,
  isUnsharing,
  onVoid,
  isVoiding,
  ...i18nProps
}: DeliveryNoteListRowActionsProps) {
  const t = createTranslation({ ...i18nProps, translations });
  const { isDownloading, downloadPDF } = useDeliveryNoteDownload({
    onDownloadStart,
    onDownloadSuccess,
    onDownloadError,
    ...i18nProps,
  });
  const createInvoiceDisabledReason = deliveryNote.voided_at
    ? t("documents-list-page.copy-to-invoice-voided-not-allowed")
    : undefined;
  const voidDisabledReason = deliveryNote.voided_at ? t("This document is already voided.") : undefined;
  const createInvoiceItem = onDuplicate ? (
    <DropdownMenuItem
      className="cursor-pointer"
      onClick={createInvoiceDisabledReason ? undefined : () => onDuplicate(deliveryNote)}
      disabled={!!createInvoiceDisabledReason}
    >
      <Copy className="h-4 w-4" />
      {t("Create invoice")}
    </DropdownMenuItem>
  ) : null;

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
          <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(deliveryNote.id)}>
            <Copy className="h-4 w-4" />
            {t("Copy delivery note ID")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => onView?.(deliveryNote)}>
            <Eye className="h-4 w-4" />
            {t("View delivery note")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => downloadPDF(deliveryNote)}
            disabled={isDownloading}
          >
            <Download className="h-4 w-4" />
            {isDownloading ? t("Downloading...") : t("Download PDF")}
          </DropdownMenuItem>
          {createInvoiceItem &&
            (createInvoiceDisabledReason ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>{createInvoiceItem}</div>
                </TooltipTrigger>
                <TooltipContent side="left" {...actionMenuTooltipProps}>
                  {createInvoiceDisabledReason}
                </TooltipContent>
              </Tooltip>
            ) : (
              createInvoiceItem
            ))}
        </DropdownMenuGroup>
        {onVoid && !(deliveryNote as any).is_draft && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {(() => {
                const item = (
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={voidDisabledReason ? undefined : () => onVoid(deliveryNote)}
                    disabled={isVoiding || !!voidDisabledReason}
                  >
                    {isVoiding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                    {t("Void")}
                  </DropdownMenuItem>
                );

                if (!voidDisabledReason) return item;

                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>{item}</div>
                    </TooltipTrigger>
                    <TooltipContent side="left" {...actionMenuTooltipProps}>
                      {voidDisabledReason}
                    </TooltipContent>
                  </Tooltip>
                );
              })()}
            </DropdownMenuGroup>
          </>
        )}
        {deliveryNote.shareable_id && onUnshare && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => onUnshare(deliveryNote)}
                disabled={isUnsharing}
              >
                {isUnsharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />}
                {t("Unshare")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
