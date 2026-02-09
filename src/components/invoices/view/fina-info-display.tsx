import type { Invoice } from "@spaceinvoices/js-sdk";
import { AlertCircle, Check, CheckCircle2, Clock, Copy, ExternalLink, XCircle } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import de from "../../entities/fina-settings-form/locales/de";
import en from "../../entities/fina-settings-form/locales/en";
import sl from "../../entities/fina-settings-form/locales/sl";

const translations = { de, sl, en } as const;

type FinaData = {
  status?: "success" | "pending" | "failed";
  error?: string;
  fiscalized_at?: string;
  data?: {
    zki?: string;
    jir?: string;
    premise_id?: string;
    device_id?: string;
    invoice_number?: string;
    qr_code_url?: string;
  };
};

interface FinaInfoDisplayProps extends ComponentTranslationProps {
  invoice: Invoice;
}

export function FinaInfoDisplay({ invoice, t: translateFn, namespace, locale }: FinaInfoDisplayProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const t = createTranslation({
    t: translateFn,
    namespace,
    locale,
    translations,
  });

  const fina = (invoice as any).fina as FinaData | undefined;

  if (!fina) {
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
    switch (fina.status) {
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
          {t("FINA Fiscalization")}
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>{t("Croatian tax authority fiscalization details")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Message */}
        {fina.status === "failed" && fina.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("Fiscalization Error")}</AlertTitle>
            <AlertDescription>{fina.error}</AlertDescription>
          </Alert>
        )}

        {/* FINA Data */}
        {fina.data && (
          <div className="space-y-3">
            {/* ZKI Code */}
            {fina.data.zki && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{t("ZKI")}</p>
                  <p className="font-mono text-muted-foreground text-xs">{fina.data.zki}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(fina.data!.zki!, "zki")}>
                  {copiedField === "zki" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {/* JIR Code */}
            {fina.data.jir && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{t("JIR")}</p>
                  <p className="font-mono text-muted-foreground text-xs">{fina.data.jir}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(fina.data!.jir!, "jir")}>
                  {copiedField === "jir" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {/* Business Premise & Device */}
            <div className="grid grid-cols-2 gap-3">
              {fina.data.premise_id && (
                <div className="space-y-1">
                  <p className="font-medium text-sm">{t("Business Premise")}</p>
                  <p className="text-muted-foreground text-sm">{fina.data.premise_id}</p>
                </div>
              )}
              {fina.data.device_id && (
                <div className="space-y-1">
                  <p className="font-medium text-sm">{t("Electronic Device")}</p>
                  <p className="text-muted-foreground text-sm">{fina.data.device_id}</p>
                </div>
              )}
            </div>

            {/* Invoice Number */}
            {fina.data.invoice_number && (
              <div className="space-y-1">
                <p className="font-medium text-sm">{t("Invoice Number")}</p>
                <p className="text-muted-foreground text-sm">{fina.data.invoice_number}</p>
              </div>
            )}

            {/* QR Code URL */}
            {fina.data.qr_code_url && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{t("QR Code")}</p>
                  <a
                    href={fina.data.qr_code_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary text-xs hover:underline"
                  >
                    {t("QR Code")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(fina.data!.qr_code_url!, "qr_url")}>
                  {copiedField === "qr_url" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Fiscalized Timestamp */}
        {fina.fiscalized_at && (
          <div className="pt-2 text-muted-foreground text-sm">
            {t("Fiscalized at")}: {new Date(fina.fiscalized_at).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
