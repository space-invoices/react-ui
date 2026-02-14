import type { AdvanceInvoice } from "@spaceinvoices/js-sdk";

import { Copy, Download, Eye, Link2Off, Loader2, MoreHorizontal, Plus } from "lucide-react";
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
import { useAdvanceInvoiceDownload } from "./use-advance-invoice-download";

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
  ...i18nProps
}: AdvanceInvoiceListRowActionsProps) {
  const t = createTranslation(i18nProps);
  const { isDownloading, downloadPDF } = useAdvanceInvoiceDownload({
    onDownloadStart,
    onDownloadSuccess,
    onDownloadError,
    ...i18nProps,
  });

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
          {onDuplicate && (
            <DropdownMenuItem className="cursor-pointer" onClick={() => onDuplicate(advanceInvoice)}>
              <Copy className="h-4 w-4" />
              {t("Duplicate")}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        {!advanceInvoice.paid_in_full && (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
