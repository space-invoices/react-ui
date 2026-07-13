import type { Estimate } from "@spaceinvoices/js-sdk";
import { invoices } from "@spaceinvoices/js-sdk";
import { useState } from "react";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useEntities } from "@/ui/providers/entities-context";
import { getDocumentPdfFileName } from "../../documents/shared/document-pdf-filename";

type UseEstimateDownloadProps = {
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
} & ComponentTranslationProps;

export function useEstimateDownload({
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  ...i18nProps
}: UseEstimateDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { activeEntity } = useEntities();
  const t = createTranslation(i18nProps);

  const downloadPDF = async (estimate: Estimate) => {
    if (!activeEntity?.id) {
      onDownloadError?.(t("Failed to download PDF"));
      return;
    }

    setIsDownloading(true);
    onDownloadStart?.();

    try {
      const filenameLocale = activeEntity.locale ?? i18nProps.locale ?? i18nProps.translationLocale;
      const fileName = getDocumentPdfFileName("estimate", estimate.number, estimate.title_type, {
        ...i18nProps,
        locale: filenameLocale,
        translationLocale: filenameLocale,
      });
      await invoices.downloadPdf(estimate.id, fileName, {}, { entity_id: activeEntity.id });

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
