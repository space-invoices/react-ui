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
import { useCreditNoteDownload } from "./use-credit-note-download";

// Type for credit note - using any until SDK is regenerated
type CreditNote = any;

type CreditNoteListRowActionsProps = {
  creditNote: CreditNote;
  onAddPayment?: (creditNote: CreditNote) => void;
  onDuplicate?: (creditNote: CreditNote) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onUnshare?: (creditNote: CreditNote) => Promise<void>;
  isUnsharing?: boolean;
} & ComponentTranslationProps;

export default function CreditNoteListRowActions({
  creditNote,
  onAddPayment,
  onDuplicate,
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  onUnshare,
  isUnsharing,
  ...i18nProps
}: CreditNoteListRowActionsProps) {
  const t = createTranslation(i18nProps);
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
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              window.location.href = `/app/documents/view/${creditNote.id}`;
            }}
          >
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
        {!creditNote.paid_in_full && (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
