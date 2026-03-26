import { Download, FileText, Loader2 } from "lucide-react";
import type { FC } from "react";
import { Alert, AlertDescription } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { useFursInternalActDownloads } from "../furs-settings.hooks";

interface FursInternalActDownloadCardProps {
  entityId: string;
  certificateValid: boolean;
  hasPremises: boolean;
  hasPremiseWithDevice: boolean;
  t: (key: string) => string;
}

function getDisabledReason({
  certificateValid,
  hasPremises,
  hasPremiseWithDevice,
  t,
}: Omit<FursInternalActDownloadCardProps, "entityId">) {
  if (!certificateValid) {
    return t("Upload a valid certificate to download the internal act");
  }

  if (!hasPremises) {
    return t("Register at least one active business premise to download the internal act");
  }

  if (!hasPremiseWithDevice) {
    return t("Register at least one electronic device to download the internal act");
  }

  return null;
}

export const FursInternalActDownloadCard: FC<FursInternalActDownloadCardProps> = ({
  entityId,
  certificateValid,
  hasPremises,
  hasPremiseWithDevice,
  t,
}) => {
  const { downloadFursInternalActPdf, downloadFursInternalActDocx, isDownloadingPdf, isDownloadingDocx } =
    useFursInternalActDownloads(t);

  const disabledReason = getDisabledReason({
    certificateValid,
    hasPremises,
    hasPremiseWithDevice,
    t,
  });
  const canDownload = disabledReason === null;
  const isDownloading = isDownloadingPdf || isDownloadingDocx;

  return (
    <Card data-testid="furs-internal-act-download-card" className="border-dashed bg-muted/20 p-4">
      <CardHeader className="p-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>{t("Internal Act")}</CardTitle>
            <CardDescription>
              {t(
                "Download the internal act in printable PDF or editable DOCX form before enabling FURS fiscalization.",
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-0">
        <p className="text-muted-foreground text-sm">
          {t("The internal act contains your current business premises, devices, and invoice numbering setup.")}
        </p>

        {disabledReason && (
          <Alert>
            <AlertDescription>{disabledReason}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={!canDownload || isDownloading}
            onClick={() => downloadFursInternalActPdf(entityId)}
            data-testid="furs-internal-act-download-pdf"
          >
            {isDownloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isDownloadingPdf ? t("Preparing PDF...") : t("Download PDF")}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={!canDownload || isDownloading}
            onClick={() => downloadFursInternalActDocx(entityId)}
            data-testid="furs-internal-act-download-docx"
          >
            {isDownloadingDocx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isDownloadingDocx ? t("Preparing DOCX...") : t("Download DOCX")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
