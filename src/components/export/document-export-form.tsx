import { Calendar, Download, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";
export type ExportFormat = "xlsx" | "csv" | "pdf_zip";

const ALL_DOCUMENT_TYPES: DocumentType[] = ["invoice", "estimate", "credit_note", "advance_invoice", "delivery_note"];

// Maximum date range for export (1 year in milliseconds)
const MAX_DATE_RANGE_MS = 365 * 24 * 60 * 60 * 1000;

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousMonthRange(): { from: string; to: string } {
  const now = new Date();
  const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    from: formatDateLocal(firstDayPrevMonth),
    to: formatDateLocal(lastDayPrevMonth),
  };
}

function isDateRangeValid(dateFrom: string, dateTo: string): boolean {
  if (!dateFrom || !dateTo) return true;
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  return to.getTime() - from.getTime() <= MAX_DATE_RANGE_MS;
}

export type DocumentExportFormProps = {
  entityId: string;
  token: string;
  accountId?: string | null;
  language: string;
  /** Base URL for API calls (required in embed context where relative paths don't reach the API) */
  apiBaseUrl?: string;
  onSuccess?: (fileName: string) => void;
  onError?: (error: Error) => void;
  onPdfExportStarted?: (jobId: string) => void;
  onLoadingChange?: (isLoading: boolean, toastId: string | number | null) => void;
} & ComponentTranslationProps;

const translations = {
  en: {
    "export-page.document-type": "Document type",
    "export-page.types.invoice": "Invoice",
    "export-page.types.estimate": "Estimate",
    "export-page.types.credit_note": "Credit note",
    "export-page.types.advance_invoice": "Advance invoice",
    "export-page.types.delivery_note": "Delivery note",
    "export-page.format": "Format",
    "export-page.formats.xlsx": "Excel (.xlsx)",
    "export-page.formats.csv": "CSV (.csv)",
    "export-page.formats.pdf_zip": "PDF ZIP archive",
    "export-page.pdf-export-info":
      "PDF export runs asynchronously and generates a ZIP archive for the selected document types.",
    "export-page.date-from": "Date from",
    "export-page.date-to": "Date to",
    "export-page.error.date-range-exceeded": "Date range cannot exceed one year.",
    "export-page.clear-dates": "Clear dates",
    "export-page.exporting": "Exporting...",
    "export-page.export-button": "Export documents",
  },
} as const;

export function DocumentExportForm({
  entityId,
  token,
  accountId,
  language,
  t: translateFn,
  namespace,
  locale,
  apiBaseUrl = "",
  onSuccess,
  onError,
  onPdfExportStarted,
  onLoadingChange,
}: DocumentExportFormProps) {
  const t = createTranslation({ t: translateFn, namespace, locale, translations });
  const defaultDates = getPreviousMonthRange();
  const [documentType, setDocumentType] = useState<DocumentType>("invoice");
  const [selectedTypes, setSelectedTypes] = useState<DocumentType[]>(["invoice"]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [dateFrom, setDateFrom] = useState(defaultDates.from);
  const [dateTo, setDateTo] = useState(defaultDates.to);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRangeError, setDateRangeError] = useState(false);

  const toastIdRef = useRef<string | number | null>(null);

  const toggleType = (type: DocumentType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        // Don't allow deselecting the last type
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  const validateDateRange = (from: string, to: string) => {
    const isValid = isDateRangeValid(from, to);
    setDateRangeError(!isValid);
    return isValid;
  };

  const handleExport = async () => {
    if (!validateDateRange(dateFrom, dateTo)) {
      onError?.(new Error(t("export-page.error.date-range-exceeded")));
      return;
    }

    setIsExporting(true);
    onLoadingChange?.(true, null);

    // PDF export is async - different flow
    if (exportFormat === "pdf_zip") {
      try {
        const response = await fetch(`${apiBaseUrl}/documents/export/pdf`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-entity-id": entityId,
            ...(accountId && { "x-account-id": accountId }),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            types: selectedTypes,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || `Export failed: ${response.statusText}`);
        }

        const data = await response.json();
        onPdfExportStarted?.(data.id);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error("Unknown error"));
      } finally {
        setIsExporting(false);
        onLoadingChange?.(false, toastIdRef.current);
        toastIdRef.current = null;
      }
      return;
    }

    // XLSX/CSV export - synchronous download
    try {
      const queryParams: Record<string, string> = {
        type: documentType,
        format: exportFormat,
      };
      if (dateFrom) {
        queryParams.date_from = dateFrom;
      }
      if (dateTo) {
        queryParams.date_to = dateTo;
      }

      const response = await fetch(`${apiBaseUrl}/documents/export?${new URLSearchParams(queryParams).toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-entity-id": entityId,
          ...(accountId && { "x-account-id": accountId }),
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const contentDisposition = response.headers.get("content-disposition");
      let fileName = `${documentType}s_export.${exportFormat}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match) {
          fileName = match[1];
        }
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);

      onSuccess?.(fileName);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setIsExporting(false);
      onLoadingChange?.(false, toastIdRef.current);
      toastIdRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Document Type + Export Format */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="document-type">{t("export-page.document-type")}</Label>
          {exportFormat === "pdf_zip" ? (
            <fieldset className="space-y-2 rounded-md border p-3">
              {ALL_DOCUMENT_TYPES.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={() => toggleType(type)}
                  />
                  <Label htmlFor={`type-${type}`} className="cursor-pointer font-normal">
                    {t(`export-page.types.${type}`)}
                  </Label>
                </div>
              ))}
            </fieldset>
          ) : (
            <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
              <SelectTrigger id="document-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoice">{t("export-page.types.invoice")}</SelectItem>
                <SelectItem value="estimate">{t("export-page.types.estimate")}</SelectItem>
                <SelectItem value="credit_note">{t("export-page.types.credit_note")}</SelectItem>
                <SelectItem value="advance_invoice">{t("export-page.types.advance_invoice")}</SelectItem>
                <SelectItem value="delivery_note">{t("export-page.types.delivery_note")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="export-format">{t("export-page.format")}</Label>
          <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
            <SelectTrigger id="export-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xlsx">{t("export-page.formats.xlsx")}</SelectItem>
              <SelectItem value="csv">{t("export-page.formats.csv")}</SelectItem>
              <SelectItem value="pdf_zip">{t("export-page.formats.pdf_zip")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {exportFormat === "pdf_zip" && (
        <p className="text-muted-foreground text-sm">{t("export-page.pdf-export-info")}</p>
      )}

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date-from">{t("export-page.date-from")}</Label>
          <div className="relative">
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                validateDateRange(e.target.value, dateTo);
              }}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              className="cursor-pointer pr-9 [&::-webkit-calendar-picker-indicator]:hidden"
            />
            <Calendar className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date-to">{t("export-page.date-to")}</Label>
          <div className="relative">
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                validateDateRange(dateFrom, e.target.value);
              }}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              className={`cursor-pointer pr-9 [&::-webkit-calendar-picker-indicator]:hidden ${dateRangeError ? "border-destructive" : ""}`}
            />
            <Calendar className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Date range error message */}
      {dateRangeError && <p className="text-destructive text-sm">{t("export-page.error.date-range-exceeded")}</p>}

      {/* Clear dates button */}
      {(dateFrom || dateTo) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDateFrom("");
            setDateTo("");
            setDateRangeError(false);
          }}
        >
          {t("export-page.clear-dates")}
        </Button>
      )}

      {/* Export Button */}
      <Button onClick={handleExport} disabled={isExporting || dateRangeError} className="w-full" size="lg">
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("export-page.exporting")}
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            {t("export-page.export-button")}
          </>
        )}
      </Button>
    </div>
  );
}
