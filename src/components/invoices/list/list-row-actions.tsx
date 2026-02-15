import type { Invoice } from "@spaceinvoices/js-sdk";

import { Ban, Copy, Download, Eye, Link2Off, Loader2, Mail, MoreHorizontal, Plus } from "lucide-react";
import { memo, useState } from "react";
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
import { SendEmailDialog } from "../send-email-dialog";
import { useInvoiceDownload } from "./use-invoice-download";

type InvoiceListRowActionsProps = {
  invoice: Invoice;
  onView?: (invoice: Invoice) => void;
  onAddPayment?: (invoice: Invoice) => void;
  onDuplicate?: (invoice: Invoice) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onUnshare?: (invoice: Invoice) => Promise<void>;
  isUnsharing?: boolean;
  onVoid?: (invoice: Invoice) => void;
  isVoiding?: boolean;
} & ComponentTranslationProps;

export default memo(function InvoiceListRowActions({
  invoice,
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
}: InvoiceListRowActionsProps) {
  const t = createTranslation(i18nProps);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const { isDownloading, downloadPDF } = useInvoiceDownload({
    onDownloadStart,
    onDownloadSuccess,
    onDownloadError,
    ...i18nProps,
  });

  return (
    <>
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
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(invoice.id)}>
              <Copy className="h-4 w-4" />
              {t("Copy invoice ID")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer" onClick={() => onView?.(invoice)}>
              <Eye className="h-4 w-4" />
              {t("View invoice")}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => downloadPDF(invoice)} disabled={isDownloading}>
              <Download className="h-4 w-4" />
              {isDownloading ? t("Downloading...") : t("Download PDF")}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setEmailDialogOpen(true)}>
              <Mail className="h-4 w-4" />
              {t("Send Email")}
            </DropdownMenuItem>
            {onDuplicate && (
              <DropdownMenuItem className="cursor-pointer" onClick={() => onDuplicate(invoice)}>
                <Copy className="h-4 w-4" />
                {t("Duplicate")}
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          {!invoice.paid_in_full && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer" onClick={() => onAddPayment?.(invoice)}>
                  <Plus className="h-4 w-4" />
                  {t("Add Payment")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
          {invoice.shareable_id && onUnshare && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => onUnshare(invoice)}
                  disabled={isUnsharing}
                >
                  {isUnsharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />}
                  {t("Unshare")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
          {onVoid && !invoice.voided_at && !(invoice as any).is_draft && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => onVoid(invoice)}
                  disabled={isVoiding}
                >
                  {isVoiding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  {t("Void")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <SendEmailDialog
        invoice={invoice}
        defaultEmail={invoice.customer?.email || ""}
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        translationFn={t}
      />
    </>
  );
});
