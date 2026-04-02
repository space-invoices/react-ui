import {
  type AdvanceInvoice,
  type CreditNote,
  type DeliveryNote,
  downloadBlob,
  type Estimate,
  eSlog,
  type Invoice,
  invoices,
} from "@spaceinvoices/js-sdk";
import { useState } from "react";
import { useEntities } from "@/ui/providers/entities-context";

type Document = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;
type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";
type ESlogDocumentType = "invoice" | "estimate" | "credit_note";

// Document type labels for PDF filename
const TYPE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  estimate: "Estimate",
  credit_note: "Credit Note",
  advance_invoice: "Advance Invoice",
  delivery_note: "Delivery Note",
};

interface UseDocumentDownloadOptions {
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
}: UseDocumentDownloadOptions = {}) {
  const { activeEntity } = useEntities();

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingEslog, setIsDownloadingEslog] = useState(false);

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
      const typeLabel =
        documentType === "estimate" && (document as Estimate).title_type === "proforma_invoice"
          ? "Proforma Invoice"
          : TYPE_LABELS[documentType] || "Document";
      const params = language ? { language } : {};
      const fileName = `${typeLabel} ${document.number}.pdf`;

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

  return {
    isDownloadingPdf,
    isDownloadingEslog,
    downloadPdf,
    downloadEslog,
  };
}
