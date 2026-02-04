import type { Entity, Invoice } from "@spaceinvoices/js-sdk";
import { AlertCircle, CheckCircle2, Download, FileCode2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

// Type for eslog data
interface EslogData {
  validation_enabled?: boolean | null;
  validation_status?: "valid" | "invalid" | "not_validated" | null;
  validation_errors?: string[] | null;
  validated_at?: string | null;
}

interface EslogInfoDisplayProps extends ComponentTranslationProps {
  invoice: Invoice;
  /** Entity is used to determine if e-SLOG should be shown (for SI entities) */
  entity?: Entity | null;
  onDownload?: () => void;
  isDownloading?: boolean;
  showDownloadButton?: boolean;
  /** When true, force show the component even if no eslog data exists (for SI entities with validation enabled) */
  forceShow?: boolean;
}

/**
 * e-SLOG Info Display Component
 *
 * Shows e-SLOG validation status, errors, and download button for valid documents
 */
export function EslogInfoDisplay({
  invoice,
  entity,
  onDownload,
  isDownloading,
  showDownloadButton = true,
  forceShow = false,
  t: translateFn,
  namespace,
  locale,
}: EslogInfoDisplayProps) {
  const t = createTranslation({
    t: translateFn,
    namespace,
    locale,
    translations: {},
  });

  // Cast eslog to the proper type
  const eslog = invoice.eslog as EslogData | undefined | null;

  // Check if entity is Slovenian and has e-SLOG validation enabled in settings
  const isSlovenianEntity = entity?.country_code === "SI";
  const entityEslogEnabled = !!(entity?.settings as any)?.eslog_validation_enabled;

  // Show component if:
  // 1. Document has eslog data, OR
  // 2. Entity is Slovenian with eslog enabled (forceShow), OR
  // 3. forceShow is explicitly true
  const shouldShow = eslog || (forceShow && isSlovenianEntity && entityEslogEnabled);

  if (!shouldShow) {
    return null;
  }

  // If no eslog data but we should show (SI entity with setting enabled), treat as not_validated
  const effectiveEslog: EslogData = eslog || {
    validation_status: "not_validated",
    validation_enabled: null,
    validation_errors: null,
    validated_at: null,
  };

  const getStatusBadge = () => {
    switch (effectiveEslog.validation_status) {
      case "valid":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {t("Valid")}
          </Badge>
        );
      case "invalid":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
            <XCircle className="mr-1 h-3 w-3" />
            {t("Invalid")}
          </Badge>
        );
      case "not_validated":
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">{t("Not validated")}</Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">{t("Not validated")}</Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode2 className="h-5 w-5" />
          {t("e-SLOG 2.0")}
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>{t("Slovenian electronic invoice format (EN 16931)")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Errors */}
        {effectiveEslog.validation_status === "invalid" &&
          effectiveEslog.validation_errors &&
          effectiveEslog.validation_errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("Validation Errors")}</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {effectiveEslog.validation_errors.map((error, index) => (
                    <li key={index} className="text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

        {/* Download Button for valid documents */}
        {showDownloadButton && effectiveEslog.validation_status === "valid" && onDownload && (
          <Button onClick={onDownload} disabled={isDownloading} className="w-full" variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? t("Downloading...") : t("Download e-SLOG XML")}
          </Button>
        )}

        {/* Not validated info */}
        {(effectiveEslog.validation_status === "not_validated" || !effectiveEslog.validation_status) && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-600 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {t(
              "This document has not been validated for e-SLOG. Enable validation in entity settings or on the document to validate.",
            )}
          </div>
        )}

        {/* Validation timestamp */}
        {effectiveEslog.validated_at && (
          <div className="pt-2 text-muted-foreground text-sm">
            {t("Validated at")}: {new Date(effectiveEslog.validated_at).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
