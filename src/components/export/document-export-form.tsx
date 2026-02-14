type TFunction = (key: string, options?: Record<string, unknown>) => string;

import { Calendar, Download, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export type DocumentType = "invoice" | "estimate" | "credit_note";
export type ExportFormat = "xlsx" | "csv" | "pdf_zip";

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
  language: string;
  t: TFunction;
  onSuccess?: (fileName: string) => void;
  onError?: (error: Error) => void;
  onPdfExportStarted?: (jobId: string) => void;
  onLoadingChange?: (isLoading: boolean, toastId: string | number | null) => void;
};

export function DocumentExportForm({
  entityId,
  token,
  language,
  t,
  onSuccess,
  onError,
  onPdfExportStarted,
  onLoadingChange,
}: DocumentExportFormProps) {
  const defaultDates = getPreviousMonthRange();
  const [documentType, setDocumentType] = useState<DocumentType>("invoice");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [dateFrom, setDateFrom] = useState(defaultDates.from);
  const [dateTo, setDateTo] = useState(defaultDates.to);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRangeError, setDateRangeError] = useState(false);

  const toastIdRef = useRef<string | number | null>(null);

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
        const response = await fetch("/documents/export/pdf", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-entity-id": entityId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: documentType,
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
      const exportLanguage = language === "sl" ? "sl" : "en";
      const queryParams: Record<string, string> = {
        type: documentType,
        format: exportFormat,
        language: exportLanguage,
      };
      if (dateFrom) {
        queryParams.date_from = dateFrom;
      }
      if (dateTo) {
        queryParams.date_to = dateTo;
      }

      const response = await fetch(`/documents/export?${new URLSearchParams(queryParams).toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-entity-id": entityId,
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
          <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
            <SelectTrigger id="document-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">{t("export-page.types.invoice")}</SelectItem>
              <SelectItem value="estimate">{t("export-page.types.estimate")}</SelectItem>
              <SelectItem value="credit_note">{t("export-page.types.credit_note")}</SelectItem>
            </SelectContent>
          </Select>
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
