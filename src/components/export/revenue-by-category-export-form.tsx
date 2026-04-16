import { getClientHeaders } from "@spaceinvoices/js-sdk";
import { Calendar, Download, Loader2 } from "lucide-react";
import { useState } from "react";

import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type ExportFormat = "xlsx" | "csv";

const MAX_DATE_RANGE_MS = 365 * 24 * 60 * 60 * 1000;

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentYearRange(): { from: string; to: string } {
  const now = new Date();
  return {
    from: `${now.getFullYear()}-01-01`,
    to: formatDateLocal(now),
  };
}

function isDateRangeValid(dateFrom: string, dateTo: string): boolean {
  if (!dateFrom || !dateTo) return false;
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  return to.getTime() - from.getTime() <= MAX_DATE_RANGE_MS && to >= from;
}

export type RevenueByCategoryExportFormProps = {
  entityId: string;
  token: string;
  accountId?: string | null;
  language?: string;
  apiBaseUrl?: string;
  onSuccess?: (fileName: string) => void;
  onError?: (error: Error) => void;
} & ComponentTranslationProps;

const translations = {
  en: {
    "revenue-by-category-export.error.dates-required": "Select both a start and end date.",
    "export-page.error.date-range-exceeded": "Date range cannot exceed one year.",
    "export-page.format": "Format",
    "export-page.formats.xlsx": "Excel (.xlsx)",
    "export-page.formats.csv": "CSV (.csv)",
    "export-page.date-from": "Date from",
    "export-page.date-to": "Date to",
    "export-page.exporting": "Exporting...",
    "revenue-by-category-export.button": "Export revenue by category",
  },
} as const;

export function RevenueByCategoryExportForm({
  entityId,
  token,
  accountId,
  language,
  t: translateFn,
  namespace,
  locale,
  translationLocale,
  apiBaseUrl = "",
  onSuccess,
  onError,
}: RevenueByCategoryExportFormProps) {
  const t = createTranslation({ t: translateFn, namespace, locale, translationLocale, translations });
  const defaultDates = getCurrentYearRange();
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
      onError?.(new Error(t("revenue-by-category-export.error.dates-required")));
      return;
    }

    if (!validateDateRange(dateFrom, dateTo)) {
      onError?.(new Error(t("export-page.error.date-range-exceeded")));
      return;
    }

    setIsExporting(true);

    try {
      const queryParams = new URLSearchParams({
        format: exportFormat,
        date_from: dateFrom,
        date_to: dateTo,
        ...(language ? { language } : {}),
      });

      const response = await fetch(`${apiBaseUrl}/documents/export/revenue-by-category?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-entity-id": entityId,
          ...(accountId ? { "x-account-id": accountId } : {}),
          ...getClientHeaders("ui"),
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || `Export failed: ${response.statusText}`);
      }

      const contentDisposition = response.headers.get("content-disposition");
      let fileName = `revenue-by-category.${exportFormat}`;
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="revenue-category-export-format">{t("export-page.format")}</Label>
          <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
            <SelectTrigger id="revenue-category-export-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xlsx">{t("export-page.formats.xlsx")}</SelectItem>
              <SelectItem value="csv">{t("export-page.formats.csv")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="revenue-category-date-from">{t("export-page.date-from")}</Label>
          <div className="relative">
            <Input
              id="revenue-category-date-from"
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
          <Label htmlFor="revenue-category-date-to">{t("export-page.date-to")}</Label>
          <div className="relative">
            <Input
              id="revenue-category-date-to"
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

      {dateRangeError && <p className="text-destructive text-sm">{t("export-page.error.date-range-exceeded")}</p>}

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
            {t("revenue-by-category-export.button")}
          </>
        )}
      </Button>
    </div>
  );
}
