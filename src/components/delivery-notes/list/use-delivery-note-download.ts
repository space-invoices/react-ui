import type { DeliveryNote } from "@spaceinvoices/js-sdk";
import { invoices } from "@spaceinvoices/js-sdk";
import { useState } from "react";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useEntities } from "@/ui/providers/entities-context";

type UseDeliveryNoteDownloadProps = {
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
} & ComponentTranslationProps;

export function useDeliveryNoteDownload({
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  ...i18nProps
}: UseDeliveryNoteDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { activeEntity } = useEntities();
  const t = createTranslation(i18nProps);

  const downloadPDF = async (deliveryNote: DeliveryNote) => {
    if (!activeEntity?.id) {
      onDownloadError?.(t("Failed to download PDF"));
      return;
    }

    setIsDownloading(true);
    onDownloadStart?.();

    try {
      const fileName = `${t("Delivery Note")} ${deliveryNote.number}.pdf`;
      await invoices.downloadPdf(deliveryNote.id, fileName, {}, { entity_id: activeEntity.id });

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
