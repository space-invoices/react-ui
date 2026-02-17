type TFunction = (key: string, options?: Record<string, unknown>) => string;

import { Calendar, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type ExportFormat = "xlsx" | "csv";

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
  if (!dateFrom || !dateTo) return false;
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  return to.getTime() - from.getTime() <= MAX_DATE_RANGE_MS && to >= from;
}

export type SalesPerItemExportFormProps = {
  entityId: string;
  token: string;
  accountId?: string | null;
  language: string;
  t: TFunction;
  /** Base URL for API calls (required in embed context where relative paths don't reach the API) */
  apiBaseUrl?: string;
  onSuccess?: (fileName: string) => void;
  onError?: (error: Error) => void;
};

export function SalesPerItemExportForm({
  entityId,
  token,
  accountId,
  language,
  t,
  apiBaseUrl = "",
  onSuccess,
  onError,
}: SalesPerItemExportFormProps) {
  const defaultDates = getPreviousMonthRange();
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [dateFrom, setDateFrom] = useState(defaultDates.from);
  const [dateTo, setDateTo] = useState(defaultDates.to);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRangeError, setDateRangeError] = useState(false);

  const validateDateRange = (from: string, to: string) => {
    const isValid = isDateRangeValid(from, to);
    setDateRangeError(!isValid && !!from && !!to);
    return isValid;
  };

  const handleExport = async () => {
    if (!dateFrom || !dateTo) {
      onError?.(new Error(t("sales-per-item-export.error.dates-required")));
      return;
    }

    if (!validateDateRange(dateFrom, dateTo)) {
      onError?.(new Error(t("export-page.error.date-range-exceeded")));
      return;
    }

    setIsExporting(true);

    try {
      const exportLanguage = language === "sl" ? "sl" : "en";
      const queryParams: Record<string, string> = {
        format: exportFormat,
        date_from: dateFrom,
        date_to: dateTo,
        language: exportLanguage,
      };

      const response = await fetch(
        `${apiBaseUrl}/documents/export/sales-per-item?${new URLSearchParams(queryParams).toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-entity-id": entityId,
            ...(accountId && { "x-account-id": accountId }),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const contentDisposition = response.headers.get("content-disposition");
      let fileName = `sales-per-item.${exportFormat}`;
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
    }
  };

  const datesProvided = !!dateFrom && !!dateTo;

  return (
    <div className="space-y-6">
      {/* Export Format */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sales-export-format">{t("export-page.format")}</Label>
          <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
            <SelectTrigger id="sales-export-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xlsx">{t("export-page.formats.xlsx")}</SelectItem>
              <SelectItem value="csv">{t("export-page.formats.csv")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sales-date-from">{t("export-page.date-from")}</Label>
          <div className="relative">
            <Input
              id="sales-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                if (dateTo) validateDateRange(e.target.value, dateTo);
              }}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              className="cursor-pointer pr-9 [&::-webkit-calendar-picker-indicator]:hidden"
            />
            <Calendar className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sales-date-to">{t("export-page.date-to")}</Label>
          <div className="relative">
            <Input
              id="sales-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                if (dateFrom) validateDateRange(dateFrom, e.target.value);
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

      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={isExporting || dateRangeError || !datesProvided}
        className="w-full"
        size="lg"
      >
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
