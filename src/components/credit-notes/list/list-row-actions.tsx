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
import { useCreditNoteDownload } from "./use-credit-note-download";

const translations = {
  sl: {
    "This document is already voided.": "Ta dokument je že storniran.",
  },
} as const;

// Type for credit note - using any until SDK is regenerated
type CreditNote = any;

type CreditNoteListRowActionsProps = {
  creditNote: CreditNote;
  onView?: (creditNote: CreditNote) => void;
  onAddPayment?: (creditNote: CreditNote) => void;
  onDuplicate?: (creditNote: CreditNote) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onUnshare?: (creditNote: CreditNote) => Promise<void>;
  isUnsharing?: boolean;
  onVoid?: (creditNote: CreditNote) => void;
  isVoiding?: boolean;
} & ComponentTranslationProps;

export default function CreditNoteListRowActions({
  creditNote,
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
}: CreditNoteListRowActionsProps) {
  const t = createTranslation({ ...i18nProps, translations });
  const { isDownloading, downloadPDF } = useCreditNoteDownload({
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
          <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(creditNote.id)}>
            <Copy className="h-4 w-4" />
            {t("Copy credit note ID")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => onView?.(creditNote)}>
            <Eye className="h-4 w-4" />
            {t("View credit note")}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => downloadPDF(creditNote)} disabled={isDownloading}>
            <Download className="h-4 w-4" />
            {isDownloading ? t("Downloading...") : t("Download PDF")}
          </DropdownMenuItem>
          {onDuplicate && (
            <DropdownMenuItem className="cursor-pointer" onClick={() => onDuplicate(creditNote)}>
              <Copy className="h-4 w-4" />
              {t("Duplicate")}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        {!creditNote.paid_in_full && onAddPayment && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer" onClick={() => onAddPayment?.(creditNote)}>
                <Plus className="h-4 w-4" />
                {t("Add Payment")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        {creditNote.shareable_id && onUnshare && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => onUnshare(creditNote)}
                disabled={isUnsharing}
              >
                {isUnsharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />}
                {t("Unshare")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        {onVoid &&
          !creditNote.is_draft &&
          (() => {
            const isFiscalized = !!(creditNote.furs || creditNote.fina);
            const disabledReason = creditNote.voided_at
              ? t("This document is already voided.")
              : isFiscalized
                ? t("Cannot void a fiscalized credit note")
                : undefined;
            const voidDisabled = isVoiding || !!disabledReason;
            const voidItem = (
              <DropdownMenuItem
                className={
                  voidDisabled
                    ? "text-destructive opacity-50"
                    : "cursor-pointer text-destructive focus:text-destructive"
                }
                onClick={() => !voidDisabled && onVoid(creditNote)}
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
