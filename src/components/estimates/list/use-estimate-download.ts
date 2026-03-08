import type { Estimate } from "@spaceinvoices/js-sdk";
import { useState } from "react";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useEntities } from "@/ui/providers/entities-context";
import { useSDK } from "@/ui/providers/sdk-provider";

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
  const { sdk } = useSDK();
  const t = createTranslation(i18nProps);

  const downloadPDF = async (estimate: Estimate) => {
    if (!activeEntity?.id || !sdk) {
      console.error("Missing SDK or active entity for PDF download");
      onDownloadError?.(t("Failed to download PDF"));
      return;
    }

    setIsDownloading(true);
    onDownloadStart?.();

    try {
      const fileName = `${t("Estimate")} ${estimate.number}.pdf`;
      await sdk.invoices.downloadPdf(estimate.id, fileName, {}, { entity_id: activeEntity.id });

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
