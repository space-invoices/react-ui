import type { AdvanceInvoice, CreditNote, DeliveryNote, Estimate, Invoice } from "@spaceinvoices/js-sdk";
import {
  Ban,
  Check,
  CheckCircle,
  ChevronDown,
  Copy,
  Download,
  Ellipsis,
  FileCode2,
  Link2Off,
  Loader2,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { actionMenuTooltipProps, Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { type DocumentType, getAllowedDuplicateTargets } from "@/ui/hooks/use-duplicate-document";
import { getDocumentCountryCapabilities } from "@/ui/lib/country-capabilities";
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

type Document = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;

/** Language options for explicit PDF output language override. */
const PDF_LANGUAGE_CODES = [
  { label: "English", code: "en-US" },
  { label: "German", code: "de-DE" },
  { label: "Slovenian", code: "sl-SI" },
  { label: "Italian", code: "it-IT" },
  { label: "French", code: "fr-FR" },
  { label: "Spanish", code: "es-ES" },
  { label: "Portuguese", code: "pt-PT" },
  { label: "Dutch", code: "nl-NL" },
  { label: "Polish", code: "pl-PL" },
  { label: "Croatian", code: "hr-HR" },
  { label: "Swedish", code: "sv-SE" },
  { label: "Finnish", code: "fi-FI" },
  { label: "Estonian", code: "et-EE" },
  { label: "Bulgarian", code: "bg-BG" },
  { label: "Czech", code: "cs-CZ" },
  { label: "Slovak", code: "sk-SK" },
  { label: "Norwegian", code: "nb-NO" },
  { label: "Icelandic", code: "is-IS" },
] as const;

interface DocumentActionsBarProps extends ComponentTranslationProps {
  document: Document;
  documentType: DocumentType;
  allowedDuplicateTargets?: DocumentType[];
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
  /** Disable specific duplicate/convert targets while keeping the action visible */
  duplicateTargetDisabledReasons?: Partial<Record<DocumentType, string>>;
  /** Called when user wants to edit the document */
  onEdit?: () => void;
  /** Whether the document is editable (not voided, not fiscalized) */
  isEditable?: boolean;
  /** Reason why editing is disabled (shown as tooltip) */
  editDisabledReason?: string;
  /** Reason why adding payment is disabled (shown as tooltip) */
  paymentDisabledReason?: string;
  /** Called when user wants to finalize a draft document */
  onFinalize?: () => void;
  /** Whether finalization is in progress */
  isFinalizing?: boolean;
  /** Called when user wants to delete a draft document */
  onDeleteDraft?: () => void;
  /** Whether draft deletion is in progress */
  isDeletingDraft?: boolean;
  /** Called when user wants to create a recurring schedule from this document */
  onCreateRecurring?: () => void;
  /** Custom label for recurring button (e.g. "Edit Recurring" when one already exists) */
  recurringLabel?: string;
  /** Called when user wants to void the document */
  onVoid?: () => void;
  /** Whether voiding is in progress */
  isVoiding?: boolean;
  /** Reason why voiding is disabled (shown as tooltip) */
  voidDisabledReason?: string;
  /** Whether users can choose alternative PDF label languages */
  allowPdfLanguageSelection?: boolean;
}

export function DocumentActionsBar({
  document,
  documentType,
  allowedDuplicateTargets,
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
  duplicateTargetDisabledReasons,
  onEdit,
  isEditable,
  editDisabledReason,
  paymentDisabledReason,
  onFinalize,
  isFinalizing,
  onDeleteDraft,
  isDeletingDraft,
  onCreateRecurring,
  recurringLabel,
  onVoid,
  isVoiding,
  voidDisabledReason,
  allowPdfLanguageSelection = true,
  ...i18nProps
}: DocumentActionsBarProps) {
  const t = createTranslation({ ...i18nProps, translations, locale: currentLocale });
  const [linkCopied, setLinkCopied] = useState(false);
  const duplicateTargets = allowedDuplicateTargets ?? getAllowedDuplicateTargets(documentType);

  const { isDownloadingPdf, isDownloadingEslog, downloadPdf, downloadEslog } = useDocumentDownload({
    onDownloadStart,
    onDownloadSuccess,
    onDownloadError,
  });
  const countryCapabilities = getDocumentCountryCapabilities(entity, documentType, document);

  const supportsPayments =
    documentType === "invoice" || documentType === "advance_invoice" || documentType === "credit_note";

  const eslogFeatureAvailable = entity.country_rules?.features?.includes("eslog") ?? false;
  const eslogValid = (document as Invoice).eslog?.validation_status === "valid";
  const showEslogDownload = eslogFeatureAvailable && eslogValid;

  const shareableId = (document as Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote).shareable_id;
  const shareUrl = shareableId ? `${window.location.origin}/documents/shareable/${shareableId}` : null;

  const handleDownloadPdf = (language?: string) => downloadPdf(document, documentType, language);
  const handleDownloadEslog = () => downloadEslog(document, documentType);

  const getDocumentTypeActionLabel = (type: DocumentType) => {
    const translated = t(type);
    if (translated !== type) return translated;

    const englishFallbacks: Record<DocumentType, string> = {
      invoice: "invoice",
      estimate: "estimate",
      credit_note: "credit note",
      advance_invoice: "advance invoice",
      delivery_note: "delivery note",
    };

    return englishFallbacks[type];
  };

  const getDuplicateActionLabel = (targetType: DocumentType) => {
    const specificKey = targetType === documentType ? `Duplicate ${targetType}` : `Create ${targetType}`;
    const translated = t(specificKey);
    if (translated !== specificKey) return translated;

    const typeLabel = getDocumentTypeActionLabel(targetType);
    return targetType === documentType ? `Duplicate ${typeLabel}` : `Create ${typeLabel}`;
  };

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

  const isDraft = (document as any).is_draft === true;

  // --- Primary actions (always visible) ---
  const showPdfLanguageSelection = allowPdfLanguageSelection && countryCapabilities.allowPdfLanguageSelection;

  const pdfButton = showPdfLanguageSelection ? (
    <div className="flex">
      <Button
        variant="outline"
        size="sm"
        disabled={isDownloadingPdf}
        onClick={() => handleDownloadPdf()}
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
          {PDF_LANGUAGE_CODES.map((lang) => (
            <DropdownMenuItem key={lang.code} onClick={() => handleDownloadPdf(lang.code)} className="cursor-pointer">
              {t(lang.label)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : (
    <Button
      variant="outline"
      size="sm"
      disabled={isDownloadingPdf}
      onClick={() => handleDownloadPdf()}
      className="cursor-pointer"
    >
      {isDownloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {t("PDF")}
    </Button>
  );

  const eslogButton = showEslogDownload ? (
    <Button
      variant="outline"
      size="sm"
      disabled={isDownloadingEslog}
      onClick={handleDownloadEslog}
      className="cursor-pointer"
    >
      {isDownloadingEslog ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode2 className="mr-2 h-4 w-4" />}
      e-SLOG
    </Button>
  ) : null;

  const sendButton = onSendEmail ? (
    <Button
      variant="outline"
      size="sm"
      onClick={onSendEmail}
      className="cursor-pointer"
      data-demo="marketing-demo-send-email"
    >
      <Mail className="mr-2 h-4 w-4" />
      {t("Send")}
    </Button>
  ) : null;
  const paymentAllowed = countryCapabilities.allowPaymentAction;

  const paymentButton =
    supportsPayments && paymentAllowed && (onAddPayment || paymentDisabledReason) ? (
      paymentDisabledReason ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-disabled="true"
              className="pointer-events-auto opacity-50"
              onClick={(e) => e.preventDefault()}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("Payment")}
            </Button>
          </TooltipTrigger>
          <TooltipContent {...actionMenuTooltipProps}>{paymentDisabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        <Button variant="outline" size="sm" onClick={onAddPayment} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          {t("Payment")}
        </Button>
      )
    ) : null;

  // --- Secondary actions (desktop: inline buttons, mobile: overflow menu) ---
  const editButton = onEdit ? (
    isEditable ? (
      <Button variant="outline" size="sm" onClick={onEdit} className="cursor-pointer">
        <Pencil className="mr-2 h-4 w-4" />
        {t("Edit")}
      </Button>
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-disabled="true"
            className="pointer-events-auto opacity-50"
            onClick={(e) => e.preventDefault()}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {t("Edit")}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{editDisabledReason}</p>
        </TooltipContent>
      </Tooltip>
    )
  ) : null;

  const shareButton = shareUrl ? (
    <div className="flex">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={handleCopyShareLink} className="cursor-pointer rounded-r-none">
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
            {isUnsharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2Off className="mr-2 h-4 w-4" />}
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
  ) : null;

  const recurringButton = onCreateRecurring ? (
    <Button variant="outline" size="sm" onClick={onCreateRecurring} className="cursor-pointer">
      <RefreshCw className="mr-2 h-4 w-4" />
      {recurringLabel || t("Recurring")}
    </Button>
  ) : null;

  const duplicateButton =
    onDuplicate && duplicateTargets.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="cursor-pointer">
            <Copy className="mr-2 h-4 w-4" />
            {t("Duplicate")}
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {duplicateTargets.map((targetType) => {
            const disabledReason = duplicateTargetDisabledReasons?.[targetType];
            const item = (
              <DropdownMenuItem
                key={targetType}
                onClick={disabledReason ? undefined : () => onDuplicate(targetType)}
                disabled={!!disabledReason}
                className="cursor-pointer"
              >
                {getDuplicateActionLabel(targetType)}
              </DropdownMenuItem>
            );

            if (!disabledReason) return item;

            return (
              <Tooltip key={targetType}>
                <TooltipTrigger asChild>
                  <div>{item}</div>
                </TooltipTrigger>
                <TooltipContent {...actionMenuTooltipProps}>{disabledReason}</TooltipContent>
              </Tooltip>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  const isAlreadyVoided = !!(document as any)?.voided_at;
  const effectiveVoidDisabledReason =
    voidDisabledReason || (isAlreadyVoided ? t("This document is already voided.") : undefined);

  const voidButton =
    !isDraft && onVoid
      ? (() => {
          const button = (
            <Button
              variant="destructive"
              size="sm"
              onClick={effectiveVoidDisabledReason ? undefined : onVoid}
              disabled={isVoiding || !!effectiveVoidDisabledReason}
              className="cursor-pointer"
            >
              {isVoiding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
              {isVoiding ? t("Voiding...") : t("Void")}
            </Button>
          );

          if (!effectiveVoidDisabledReason) return button;

          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{button}</span>
              </TooltipTrigger>
              <TooltipContent {...actionMenuTooltipProps}>{effectiveVoidDisabledReason}</TooltipContent>
            </Tooltip>
          );
        })()
      : null;

  const finalizeButton =
    isDraft && onFinalize ? (
      <Button variant="default" size="sm" onClick={onFinalize} disabled={isFinalizing} className="cursor-pointer">
        {isFinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
        {t("Finalize")}
      </Button>
    ) : null;

  const deleteDraftButton =
    isDraft && onDeleteDraft ? (
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
    ) : null;

  // Collect secondary items for the mobile overflow menu
  const hasSecondaryActions =
    editButton ||
    shareButton ||
    recurringButton ||
    duplicateButton ||
    voidButton ||
    finalizeButton ||
    deleteDraftButton;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Always-visible compact actions */}
      {pdfButton}
      {sendButton}

      {/* Additional actions — visible on md+ screens as inline buttons */}
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {eslogButton}
        {paymentButton}
        {editButton}
        {shareButton}
        {recurringButton}
        {duplicateButton}
        {voidButton}
        {finalizeButton}
        {deleteDraftButton}
      </div>

      {/* Mobile overflow — visible on small screens only */}
      {(eslogButton || paymentButton || hasSecondaryActions) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="cursor-pointer md:hidden">
              <Ellipsis className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {eslogButton && (
              <DropdownMenuItem onClick={handleDownloadEslog} disabled={isDownloadingEslog} className="cursor-pointer">
                <FileCode2 className="mr-2 h-4 w-4" />
                e-SLOG
              </DropdownMenuItem>
            )}
            {supportsPayments && paymentAllowed && (onAddPayment || paymentDisabledReason) ? (
              paymentDisabledReason ? (
                <DropdownMenuItem disabled className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("Payment")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onAddPayment} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("Payment")}
                </DropdownMenuItem>
              )
            ) : null}
            {(eslogButton || paymentButton) && hasSecondaryActions && <DropdownMenuSeparator />}
            {onEdit && (
              <DropdownMenuItem
                onClick={isEditable ? onEdit : undefined}
                disabled={!isEditable}
                className="cursor-pointer"
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t("Edit")}
              </DropdownMenuItem>
            )}
            {shareUrl ? (
              <DropdownMenuItem onClick={handleCopyShareLink} className="cursor-pointer">
                <Share2 className="mr-2 h-4 w-4" />
                {linkCopied ? t("Copied") : t("Share")}
              </DropdownMenuItem>
            ) : onShare ? (
              <DropdownMenuItem onClick={onShare} disabled={isSharing} className="cursor-pointer">
                <Share2 className="mr-2 h-4 w-4" />
                {t("Share")}
              </DropdownMenuItem>
            ) : null}
            {onCreateRecurring && (
              <DropdownMenuItem onClick={onCreateRecurring} className="cursor-pointer">
                <RefreshCw className="mr-2 h-4 w-4" />
                {recurringLabel || t("Recurring")}
              </DropdownMenuItem>
            )}
            {onDuplicate && duplicateTargets.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {duplicateTargets.map((targetType) => {
                  const disabledReason = duplicateTargetDisabledReasons?.[targetType];
                  const item = (
                    <DropdownMenuItem
                      key={targetType}
                      onClick={disabledReason ? undefined : () => onDuplicate(targetType)}
                      disabled={!!disabledReason}
                      className="cursor-pointer"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {getDuplicateActionLabel(targetType)}
                    </DropdownMenuItem>
                  );

                  if (!disabledReason) return item;

                  return (
                    <Tooltip key={targetType}>
                      <TooltipTrigger asChild>
                        <div>{item}</div>
                      </TooltipTrigger>
                      <TooltipContent {...actionMenuTooltipProps}>{disabledReason}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </>
            )}
            {(voidButton || finalizeButton || deleteDraftButton) && <DropdownMenuSeparator />}
            {isDraft && onFinalize && (
              <DropdownMenuItem onClick={onFinalize} disabled={isFinalizing} className="cursor-pointer">
                <CheckCircle className="mr-2 h-4 w-4" />
                {t("Finalize")}
              </DropdownMenuItem>
            )}
            {!isDraft &&
              onVoid &&
              (() => {
                const item = (
                  <DropdownMenuItem
                    onClick={effectiveVoidDisabledReason ? undefined : onVoid}
                    disabled={isVoiding || !!effectiveVoidDisabledReason}
                    className="hover:!bg-destructive hover:!text-destructive-foreground focus:!bg-destructive focus:!text-destructive-foreground cursor-pointer text-destructive"
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    {t("Void")}
                  </DropdownMenuItem>
                );

                if (!effectiveVoidDisabledReason) return item;

                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>{item}</div>
                    </TooltipTrigger>
                    <TooltipContent {...actionMenuTooltipProps}>{effectiveVoidDisabledReason}</TooltipContent>
                  </Tooltip>
                );
              })()}
            {isDraft && onDeleteDraft && (
              <DropdownMenuItem
                onClick={onDeleteDraft}
                disabled={isDeletingDraft}
                className="hover:!bg-destructive hover:!text-destructive-foreground focus:!bg-destructive focus:!text-destructive-foreground cursor-pointer text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("Delete Draft")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
