import type { AdvanceInvoice, CreditNote, Estimate, Invoice } from "@spaceinvoices/js-sdk";
import {
  Check,
  CheckCircle,
  ChevronDown,
  Copy,
  Download,
  FileCode2,
  Link2Off,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { type DocumentType, getAllowedDuplicateTargets } from "@/ui/hooks/use-duplicate-document";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import type { Entity } from "@/ui/providers/entities-context";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import { useDocumentDownload } from "./use-document-download";

const translations = { sl, de, it, fr, es, pt, nl, pl, hr } as const;

type Document = Invoice | Estimate | CreditNote | AdvanceInvoice;

const PDF_LOCALES = [
  { code: "en-US", label: "English" },
  { code: "de-DE", label: "Deutsch" },
  { code: "es-ES", label: "Español" },
  { code: "fr-FR", label: "Français" },
  { code: "it-IT", label: "Italiano" },
  { code: "sl-SI", label: "Slovenščina" },
] as const;

interface DocumentActionsBarProps extends ComponentTranslationProps {
  document: Document;
  documentType: DocumentType;
  entity: Entity;
  currentLocale: string;
  onAddPayment?: () => void;
  onSendEmail?: () => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onShareLinkCopied?: () => void;
  /** Called when user wants to share the document (generate shareable link) */
  onShare?: () => Promise<void>;
  /** Called when user wants to unshare the document (remove shareable link) */
  onUnshare?: () => Promise<void>;
  /** Whether sharing is in progress */
  isSharing?: boolean;
  /** Whether unsharing is in progress */
  isUnsharing?: boolean;
  /** Called when user wants to duplicate/convert document */
  onDuplicate?: (targetType: DocumentType) => void;
  /** Called when user wants to edit the document */
  onEdit?: () => void;
  /** Whether the document is editable (not voided, not FURS fiscalized) */
  isEditable?: boolean;
  /** Called when user wants to finalize a draft document */
  onFinalize?: () => void;
  /** Whether finalization is in progress */
  isFinalizing?: boolean;
  /** Called when user wants to delete a draft document */
  onDeleteDraft?: () => void;
  /** Whether draft deletion is in progress */
  isDeletingDraft?: boolean;
}

function getApiLocale(uiLanguage: string): string {
  const localeMap: Record<string, string> = {
    en: "en-US",
    sl: "sl-SI",
    de: "de-DE",
    es: "es-ES",
    fr: "fr-FR",
    it: "it-IT",
  };
  return localeMap[uiLanguage] || "en-US";
}

export function DocumentActionsBar({
  document,
  documentType,
  entity,
  currentLocale,
  onAddPayment,
  onSendEmail,
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  onShareLinkCopied,
  onShare,
  onUnshare,
  isSharing,
  isUnsharing,
  onDuplicate,
  onEdit,
  isEditable,
  onFinalize,
  isFinalizing,
  onDeleteDraft,
  isDeletingDraft,
  ...i18nProps
}: DocumentActionsBarProps) {
  const t = createTranslation({ translations, locale: currentLocale, ...i18nProps });
  const [linkCopied, setLinkCopied] = useState(false);

  const { isDownloadingPdf, isDownloadingEslog, downloadPdf, downloadEslog } = useDocumentDownload({
    onDownloadStart,
    onDownloadSuccess,
    onDownloadError,
  });

  const supportsPayments =
    documentType === "invoice" || documentType === "advance_invoice" || documentType === "credit_note";

  const eslogFeatureAvailable = entity.country_rules?.features?.includes("eslog") ?? false;
  const eslogValid = (document as Invoice).eslog?.validation_status === "valid";
  const showEslogDownload = eslogFeatureAvailable && eslogValid;

  const shareableId = (document as Invoice).shareable_id;
  const shareUrl = shareableId ? `${window.location.origin}/public/invoices/${shareableId}` : null;

  const handleDownloadPdf = (locale: string) => downloadPdf(document, documentType, locale);
  const handleDownloadEslog = () => downloadEslog(document, documentType);

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      onShareLinkCopied?.();
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const apiLocale = getApiLocale(currentLocale);
  const isDraft = (document as any).is_draft === true;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* PDF Download */}
      <div className="flex">
        <Button
          variant="outline"
          size="sm"
          disabled={isDownloadingPdf}
          onClick={() => handleDownloadPdf(apiLocale)}
          className="cursor-pointer rounded-r-none"
        >
          {isDownloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {t("PDF")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isDownloadingPdf}
              className="cursor-pointer rounded-l-none border-l-0 px-2"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PDF_LOCALES.map((locale) => (
              <DropdownMenuItem
                key={locale.code}
                onClick={() => handleDownloadPdf(locale.code)}
                className="cursor-pointer"
              >
                {locale.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* e-SLOG Download */}
      {showEslogDownload && (
        <Button
          variant="outline"
          size="sm"
          disabled={isDownloadingEslog}
          onClick={handleDownloadEslog}
          className="cursor-pointer"
        >
          {isDownloadingEslog ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileCode2 className="mr-2 h-4 w-4" />
          )}
          e-SLOG
        </Button>
      )}

      {/* Send Email */}
      <Button variant="outline" size="sm" onClick={onSendEmail} className="cursor-pointer">
        <Mail className="mr-2 h-4 w-4" />
        {t("Send")}
      </Button>

      {/* Add Payment */}
      {supportsPayments && (
        <Button variant="outline" size="sm" onClick={onAddPayment} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          {t("Payment")}
        </Button>
      )}

      {/* Edit */}
      {onEdit && isEditable && (
        <Button variant="outline" size="sm" onClick={onEdit} className="cursor-pointer">
          <Pencil className="mr-2 h-4 w-4" />
          {t("Edit")}
        </Button>
      )}

      {/* Share Link */}
      {shareUrl ? (
        <div className="flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyShareLink}
                className="cursor-pointer rounded-r-none"
              >
                {linkCopied ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Share2 className="mr-2 h-4 w-4" />}
                {linkCopied ? t("Copied") : t("Share")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("Copy shareable link")}</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="cursor-pointer rounded-l-none border-l-0 px-2">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyShareLink} className="cursor-pointer">
                <Share2 className="mr-2 h-4 w-4" />
                {t("Copy shareable link")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onUnshare}
                disabled={isUnsharing}
                className="hover:!bg-destructive hover:!text-destructive-foreground focus:!bg-destructive focus:!text-destructive-foreground cursor-pointer text-destructive"
              >
                {isUnsharing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2Off className="mr-2 h-4 w-4" />
                )}
                {t("Unshare")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : onShare ? (
        <Button variant="outline" size="sm" onClick={onShare} disabled={isSharing} className="cursor-pointer">
          {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
          {t("Share")}
        </Button>
      ) : null}

      {/* Duplicate/Convert */}
      {onDuplicate && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="cursor-pointer">
              <Copy className="mr-2 h-4 w-4" />
              {t("Duplicate")}
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {getAllowedDuplicateTargets(documentType).map((targetType) => (
              <DropdownMenuItem key={targetType} onClick={() => onDuplicate(targetType)} className="cursor-pointer">
                {targetType === documentType ? t(`Duplicate ${documentType}`) : t(`Create ${targetType}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Draft Actions */}
      {isDraft && onFinalize && (
        <Button variant="default" size="sm" onClick={onFinalize} disabled={isFinalizing} className="cursor-pointer">
          {isFinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
          {t("Finalize")}
        </Button>
      )}

      {isDraft && onDeleteDraft && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteDraft}
          disabled={isDeletingDraft}
          className="cursor-pointer"
        >
          {isDeletingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          {t("Delete Draft")}
        </Button>
      )}
    </div>
  );
}
