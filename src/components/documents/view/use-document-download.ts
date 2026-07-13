import {
  type AdvanceInvoice,
  type CreditNote,
  creditNotes,
  type DeliveryNote,
  downloadBlob,
  type Estimate,
  eSlog,
  type Invoice,
  invoices,
  ujp,
} from "@spaceinvoices/js-sdk";
import { useState } from "react";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { useEntities } from "@/ui/providers/entities-context";
import { type DownloadDocumentType, getDocumentPdfFileName } from "../shared/document-pdf-filename";

type Document = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;
type DocumentType = DownloadDocumentType;
type ESlogDocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice";

interface UseDocumentDownloadOptions extends Pick<ComponentTranslationProps, "locale" | "translationLocale" | "t"> {
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
}

/**
 * Hook for downloading document PDFs and e-SLOG XML
 */
export function useDocumentDownload({
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  locale,
  translationLocale,
  t,
}: UseDocumentDownloadOptions = {}) {
  const { activeEntity } = useEntities();

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingEslog, setIsDownloadingEslog] = useState(false);
  const [isDownloadingUjp, setIsDownloadingUjp] = useState(false);
  const [isDownloadingXRechnung, setIsDownloadingXRechnung] = useState(false);
  const [isDownloadingZugferd, setIsDownloadingZugferd] = useState(false);

  /**
   * Download PDF with an optional language override.
   * Formatting locale always falls back to backend/entity defaults.
   */
  const downloadPdf = async (document: Document, documentType: DocumentType, language?: string) => {
    if (!activeEntity?.id) {
      onDownloadError?.("Download failed");
      return;
    }

    setIsDownloadingPdf(true);
    onDownloadStart?.();

    try {
      // SDK signature: renderPdf(id, params?, SDKMethodOptions?)
      // entity_id goes in SDKMethodOptions (last arg), not params
      // Note: renderPdf is on invoices module but works with any document ID via /documents/{id}/pdf
      const params = language ? { language } : {};
      const filenameLocale = language ?? activeEntity.locale ?? locale ?? translationLocale;
      const fileName = getDocumentPdfFileName(
        documentType,
        document.number,
        documentType === "estimate" ? (document as Estimate).title_type : undefined,
        {
          locale: filenameLocale,
          translationLocale: filenameLocale,
          t,
        },
      );

      await invoices.downloadPdf(document.id, fileName, params, { entity_id: activeEntity.id });

      onDownloadSuccess?.(fileName);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      onDownloadError?.("Download failed");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  /**
   * Download e-SLOG XML
   */
  const downloadEslog = async (document: Document, documentType: DocumentType) => {
    if (!activeEntity?.id) {
      onDownloadError?.("Download failed");
      return;
    }

    setIsDownloadingEslog(true);

    try {
      const typeMap: Partial<Record<DocumentType, ESlogDocumentType>> = {
        invoice: "invoice",
        credit_note: "credit_note",
        estimate: "estimate",
        advance_invoice: "advance_invoice",
      };
      const eslogType = typeMap[documentType];

      if (!eslogType) {
        throw new Error("e-SLOG download not available");
      }
      const xml = await eSlog.download(document.id, { type: eslogType }, { entity_id: activeEntity.id });

      const blob = new Blob([xml], { type: "application/xml" });
      downloadBlob(blob, `${document.number}.xml`);
    } catch (error) {
      console.error("Error downloading e-SLOG:", error);
      onDownloadError?.("e-SLOG download failed");
    } finally {
      setIsDownloadingEslog(false);
    }
  };

  /**
   * Download Slovenian UJP package ZIP.
   */
  const downloadUjp = async (document: Document) => {
    if (!activeEntity?.id) {
      onDownloadError?.("Download failed");
      return;
    }

    setIsDownloadingUjp(true);

    try {
      const blob = await ujp.download(document.id, { entity_id: activeEntity.id });
      downloadBlob(blob, `${document.number} UJP.zip`);
    } catch (error) {
      console.error("Error downloading UJP package:", error);
      onDownloadError?.("UJP package download failed");
    } finally {
      setIsDownloadingUjp(false);
    }
  };

  const downloadGermanEInvoice = async (
    document: Document,
    documentType: Extract<DocumentType, "invoice" | "credit_note">,
    format: "xrechnung" | "zugferd",
  ) => {
    if (!activeEntity?.id) {
      onDownloadError?.("Download failed");
      return;
    }

    const setDownloading = format === "xrechnung" ? setIsDownloadingXRechnung : setIsDownloadingZugferd;
    setDownloading(true);

    try {
      const blob =
        documentType === "invoice"
          ? format === "xrechnung"
            ? await invoices.downloadInvoiceXRechnung(document.id, { entity_id: activeEntity.id })
            : await invoices.downloadInvoiceZugferd(document.id, { entity_id: activeEntity.id })
          : format === "xrechnung"
            ? await creditNotes.downloadCreditNoteXRechnung(document.id, { entity_id: activeEntity.id })
            : await creditNotes.downloadCreditNoteZugferd(document.id, { entity_id: activeEntity.id });
      const suffix = format === "xrechnung" ? "XRechnung.xml" : "ZUGFeRD.pdf";
      const download = typeof blob === "string" ? new Blob([blob], { type: "application/xml" }) : blob;
      downloadBlob(download, `${document.number} ${suffix}`);
      onDownloadSuccess?.(`${document.number} ${suffix}`);
    } catch (error) {
      console.error("Error downloading German e-invoice:", error);
      onDownloadError?.(format === "xrechnung" ? "XRechnung download failed" : "ZUGFeRD download failed");
    } finally {
      setDownloading(false);
    }
  };

  return {
    isDownloadingPdf,
    isDownloadingEslog,
    isDownloadingUjp,
    isDownloadingXRechnung,
    isDownloadingZugferd,
    downloadPdf,
    downloadEslog,
    downloadUjp,
    downloadGermanEInvoice,
  };
}
