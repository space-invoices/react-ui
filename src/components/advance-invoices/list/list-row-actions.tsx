import type { AdvanceInvoice } from "@spaceinvoices/js-sdk";

import { Ban, Copy, Download, Eye, Link2Off, Loader2, MoreHorizontal, Plus } from "lucide-react";
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
import { useAdvanceInvoiceDownload } from "./use-advance-invoice-download";

const translations = {
  sl: {
    "Create invoice": "Ustvari račun",
    "This document is already voided.": "Ta dokument je že storniran.",
  },
} as const;

type AdvanceInvoiceListRowActionsProps = {
  advanceInvoice: AdvanceInvoice;
  onView?: (advanceInvoice: AdvanceInvoice) => void;
  onAddPayment?: (advanceInvoice: AdvanceInvoice) => void;
  onDuplicate?: (advanceInvoice: AdvanceInvoice) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onUnshare?: (advanceInvoice: AdvanceInvoice) => Promise<void>;
  isUnsharing?: boolean;
  onVoid?: (advanceInvoice: AdvanceInvoice) => void;
  isVoiding?: boolean;
} & ComponentTranslationProps;

export default function AdvanceInvoiceListRowActions({
  advanceInvoice,
  onView,
  onAddPayment,
  onDuplicate,
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  onUnshare,
  isUnsharing,
  onVoid,
  isVoiding,
  ...i18nProps
}: AdvanceInvoiceListRowActionsProps) {
  const t = createTranslation({ ...i18nProps, translations });
  const { isDownloading, downloadPDF } = useAdvanceInvoiceDownload({
    onDownloadStart,
    onDownloadSuccess,
    onDownloadError,
    ...i18nProps,
  });
  const createInvoiceDisabledReason = (advanceInvoice as any).voided_at
    ? t("documents-list-page.copy-to-invoice-voided-not-allowed")
    : undefined;
  const voidDisabledReason = (advanceInvoice as any).voided_at ? t("This document is already voided.") : undefined;
  const createInvoiceItem = onDuplicate ? (
    <DropdownMenuItem
      className="cursor-pointer"
      onClick={createInvoiceDisabledReason ? undefined : () => onDuplicate(advanceInvoice)}
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
          <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(advanceInvoice.id)}>
            <Copy className="h-4 w-4" />
            {t("Copy advance invoice ID")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => onView?.(advanceInvoice)}>
            <Eye className="h-4 w-4" />
            {t("View advance invoice")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => downloadPDF(advanceInvoice)}
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
        {!advanceInvoice.paid_in_full && onAddPayment && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer" onClick={() => onAddPayment?.(advanceInvoice)}>
                <Plus className="h-4 w-4" />
                {t("Add Payment")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        {advanceInvoice.shareable_id && onUnshare && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => onUnshare(advanceInvoice)}
                disabled={isUnsharing}
              >
                {isUnsharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />}
                {t("Unshare")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        {onVoid &&
          !(advanceInvoice as any).is_draft &&
          (() => {
            const isLinkedToLiveInvoice = (advanceInvoice as any).document_relations?.some(
              (rel: any) =>
                (rel.relation_type === "advance_applied" || rel.relation_type === "applied_to") &&
                !rel.linked_document_voided_at,
            );
            const disabledReason =
              voidDisabledReason ||
              (isLinkedToLiveInvoice ? t("Cannot void an advance invoice linked to an invoice") : undefined);
            const voidDisabled = isVoiding || !!disabledReason;
            const voidItem = (
              <DropdownMenuItem
                className={
                  voidDisabled
                    ? "text-destructive opacity-50"
                    : "cursor-pointer text-destructive focus:text-destructive"
                }
                onClick={() => !voidDisabled && onVoid(advanceInvoice)}
                disabled={voidDisabled}
              >
                {isVoiding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                {t("Void")}
              </DropdownMenuItem>
            );
            return (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {disabledReason ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>{voidItem}</div>
                      </TooltipTrigger>
                      <TooltipContent side="left" {...actionMenuTooltipProps}>
                        {disabledReason}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    voidItem
                  )}
                </DropdownMenuGroup>
              </>
            );
          })()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
