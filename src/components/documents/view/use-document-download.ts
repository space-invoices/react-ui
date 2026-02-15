import type { AdvanceInvoice, CreditNote, DeliveryNote, Estimate, Invoice } from "@spaceinvoices/js-sdk";
import { useState } from "react";
import { useEntities } from "@/ui/providers/entities-context";
import { useSDK } from "@/ui/providers/sdk-provider";

type Document = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;
type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";

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
  const { sdk } = useSDK();
  const { activeEntity } = useEntities();

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingEslog, setIsDownloadingEslog] = useState(false);

  /**
   * Download PDF in specified locale
   */
  const downloadPdf = async (document: Document, documentType: DocumentType, _locale: string) => {
    if (!sdk || !activeEntity?.id) {
      onDownloadError?.("Download failed");
      return;
    }

    setIsDownloadingPdf(true);
    onDownloadStart?.();

    try {
      // SDK signature: renderPdf(id, params?, SDKMethodOptions?)
      // entity_id goes in SDKMethodOptions (last arg), not params
      // Note: renderPdf is on invoices module but works with any document ID via /documents/{id}/pdf
      const blob = await sdk.invoices.renderPdf(document.id, {}, { entity_id: activeEntity.id });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = downloadUrl;

      const typeLabel = TYPE_LABELS[documentType] || "Document";
      const fileName = `${typeLabel} ${document.number}.pdf`;
      link.download = fileName;

      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

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
    if (!sdk || !activeEntity?.id) {
      onDownloadError?.("Download failed");
      return;
    }

    setIsDownloadingEslog(true);

    try {
      const typeMap: Record<DocumentType, string> = {
        invoice: "invoice",
        advance_invoice: "advance_invoice",
        credit_note: "credit_note",
        estimate: "estimate",
        delivery_note: "delivery_note",
      };

      // e-SLOG download - cast to any since the SDK structure may vary
      const eSlogModule = (sdk as any).eSlog;
      if (!eSlogModule?.download) {
        throw new Error("e-SLOG download not available");
      }
      const xml = await eSlogModule.download(document.id, typeMap[documentType], { entity_id: activeEntity.id });

      const blob = new Blob([xml], { type: "application/xml" });
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document.number}.xml`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
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
