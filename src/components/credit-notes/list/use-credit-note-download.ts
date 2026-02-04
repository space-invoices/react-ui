import { useState } from "react";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useEntities } from "@/ui/providers/entities-context";
import { useSDK } from "@/ui/providers/sdk-provider";

// Type for credit note - using any until SDK is regenerated
type CreditNote = any;

type UseCreditNoteDownloadProps = {
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
} & ComponentTranslationProps;

export function useCreditNoteDownload({
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  ...i18nProps
}: UseCreditNoteDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { activeEntity } = useEntities();
  const { sdk } = useSDK();
  const t = createTranslation(i18nProps);

  const downloadPDF = async (creditNote: CreditNote) => {
    if (!activeEntity?.id || !sdk) {
      console.error("Missing SDK or active entity for PDF download");
      onDownloadError?.(t("Failed to download PDF"));
      return;
    }

    setIsDownloading(true);
    onDownloadStart?.();

    try {
      // SDK signature: renderPdf(id, params?, SDKMethodOptions?)
      // entity_id goes in SDKMethodOptions (last arg), not params
      // Note: renderPdf is on invoices module but works with any document ID
      const blob = await sdk.invoices.renderPdf(creditNote.id, {}, { entity_id: activeEntity.id });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const fileName = `${t("Credit Note")} ${creditNote.number}.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      onDownloadSuccess?.(fileName);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      onDownloadError?.(t("Failed to download PDF"));
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    isDownloading,
    downloadPDF,
  };
}
