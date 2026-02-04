import type { FursFiscalizationResponse, Invoice } from "@spaceinvoices/js-sdk";
import { AlertCircle, Check, CheckCircle2, Clock, Copy, XCircle } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import de from "../../entities/furs-settings-form/locales/de";
import en from "../../entities/furs-settings-form/locales/en";
import sl from "../../entities/furs-settings-form/locales/sl";

const translations = { de, sl, en } as const;

// Type alias for easier use
type FursData = FursFiscalizationResponse;

interface FursInfoDisplayProps extends ComponentTranslationProps {
  invoice: Invoice;
}

/**
 * FURS Fiscalization Info Display Component
 *
 * Shows FURS fiscalization status, ZOI, EOR, QR code, and other related data
 */
export function FursInfoDisplay({ invoice, t: translateFn, namespace, locale }: FursInfoDisplayProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const t = createTranslation({
    t: translateFn,
    namespace,
    locale,
    translations,
  });

  // Cast furs to the proper type (SDK has it as object, but it's actually FursData)
  const furs = invoice.furs as FursData | undefined;

  // If no FURS data, don't render anything
  if (!furs) {
    return null;
  }

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getStatusBadge = () => {
    switch (furs.status) {
      case "success":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {t("Fiscalized")}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            <Clock className="mr-1 h-3 w-3" />
            {t("Pending")}
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
            <XCircle className="mr-1 h-3 w-3" />
            {t("Failed")}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("FURS Fiscalization")}
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>{t("Slovenian tax authority fiscalization details")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Message */}
        {furs.status === "failed" && furs.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("Fiscalization Error")}</AlertTitle>
            <AlertDescription>{furs.error}</AlertDescription>
          </Alert>
        )}

        {/* Cancellation Info */}
        {furs.cancellation_reason && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("Cancelled")}</AlertTitle>
            <AlertDescription>{furs.cancellation_reason}</AlertDescription>
          </Alert>
        )}

        {/* FURS Data */}
        {furs.data && (
          <div className="space-y-3">
            {/* ZOI Code */}
            {furs.data.zoi && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{t("ZOI")}</p>
                  <p className="font-mono text-muted-foreground text-xs">{furs.data.zoi}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(furs.data!.zoi!, "zoi")}>
                  {copiedField === "zoi" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {/* EOR Code */}
            {furs.data.eor && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{t("EOR")}</p>
                  <p className="font-mono text-muted-foreground text-xs">{furs.data.eor}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(furs.data!.eor!, "eor")}>
                  {copiedField === "eor" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {/* Cancelled EOR */}
            {furs.data.cancelled && furs.data.cancelled_eor && (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                <div className="space-y-1">
                  <p className="font-medium text-red-900 text-sm dark:text-red-100">{t("Cancellation EOR")}</p>
                  <p className="font-mono text-red-700 text-xs dark:text-red-300">{furs.data.cancelled_eor}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(furs.data!.cancelled_eor!, "cancelled_eor")}
                >
                  {copiedField === "cancelled_eor" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            {/* Business Premise & Device */}
            <div className="grid grid-cols-2 gap-3">
              {furs.data.business_premise_name && (
                <div className="space-y-1">
                  <p className="font-medium text-sm">{t("Business Premise")}</p>
                  <p className="text-muted-foreground text-sm">{furs.data.business_premise_name}</p>
                </div>
              )}
              {furs.data.electronic_device_name && (
                <div className="space-y-1">
                  <p className="font-medium text-sm">{t("Electronic Device")}</p>
                  <p className="text-muted-foreground text-sm">{furs.data.electronic_device_name}</p>
                </div>
              )}
            </div>

            {/* Invoice Number & Iteration */}
            {furs.data.invoice_number && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{t("Invoice Number")}</p>
                  <p className="text-muted-foreground text-sm">{furs.data.invoice_number}</p>
                </div>
                {furs.data.iteration !== undefined && (
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{t("Iteration")}</p>
                    <p className="text-muted-foreground text-sm">{furs.data.iteration}</p>
                  </div>
                )}
              </div>
            )}

            {/* QR Code */}
            {furs.data.qr_code && (
              <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
                <p className="font-medium text-sm">{t("QR Code")}</p>
                <img src={`data:image/png;base64,${furs.data.qr_code}`} alt="FURS QR Code" className="h-48 w-48" />
              </div>
            )}
          </div>
        )}

        {/* Fiscalized Timestamp */}
        {furs.fiscalized_at && (
          <div className="pt-2 text-muted-foreground text-sm">
            {t("Fiscalized at")}: {new Date(furs.fiscalized_at).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
