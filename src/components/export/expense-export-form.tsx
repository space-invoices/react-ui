import { getClientHeaders } from "@spaceinvoices/js-sdk";
import { Calendar, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { getLocaleLanguage } from "@/ui/lib/locale";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { getPreviousMonthRange, isDateRangeValid } from "./export-date-range";
import { downloadExportFile } from "./export-download";

type ExpenseDateBasis = "document" | "received";

export type ExpenseExportFormProps = {
  entityId: string;
  token: string;
  accountId?: string | null;
  language: string;
  apiBaseUrl?: string;
  onSuccess?: (fileName: string) => void;
  onError?: (error: Error) => void;
  onLoadingChange?: (isLoading: boolean) => void;
} & ComponentTranslationProps;

const translations = {
  en: {
    "export-page.format": "Format",
    "export-page.formats.xlsx": "Excel (.xlsx)",
    "export-page.expense-date-basis": "Filter dates by",
    "expenses.date": "Document date",
    "expenses.date-received": "Received date",
    "export-page.date-from": "Date from",
    "export-page.date-to": "Date to",
    "export-page.error.date-range-exceeded": "Date range cannot exceed one year.",
    "export-page.clear-dates": "Clear dates",
    "export-page.exporting": "Exporting...",
    "export-page.expense-export-button": "Export expenses",
  },
} as const;

export function ExpenseExportForm({
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
  onLoadingChange,
}: ExpenseExportFormProps) {
  const t = createTranslation({ t: translateFn, namespace, locale, translationLocale, translations });
  const defaultDates = getPreviousMonthRange();
  const [dateBasis, setDateBasis] = useState<ExpenseDateBasis>("document");
  const [dateFrom, setDateFrom] = useState(defaultDates.from);
  const [dateTo, setDateTo] = useState(defaultDates.to);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRangeError, setDateRangeError] = useState(false);

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
    onLoadingChange?.(true);

    try {
      const query: Record<string, string> = {
        format: "xlsx",
        date_basis: dateBasis,
        language: getLocaleLanguage(language),
      };
      if (dateFrom) query.date_from = dateFrom;
      if (dateTo) query.date_to = dateTo;

      const fileName = await downloadExportFile({
        apiBaseUrl,
        path: "/expenses/export",
        query,
        fallbackFileName: "expenses_export.xlsx",
        format: "xlsx",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-entity-id": entityId,
          ...(accountId && { "x-account-id": accountId }),
          ...getClientHeaders("ui"),
        },
      });

      onSuccess?.(fileName);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setIsExporting(false);
      onLoadingChange?.(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("export-page.format")}</Label>
          <div className="flex h-9 items-center rounded-md border bg-muted/20 px-3 text-sm">
            {t("export-page.formats.xlsx")}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-export-date-basis">{t("export-page.expense-date-basis")}</Label>
          <Select value={dateBasis} onValueChange={(value) => setDateBasis(value as ExpenseDateBasis)}>
            <SelectTrigger id="expense-export-date-basis" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="document">{t("expenses.date")}</SelectItem>
              <SelectItem value="received">{t("expenses.date-received")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expense-export-date-from">{t("export-page.date-from")}</Label>
          <div className="relative">
            <Input
              id="expense-export-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                validateDateRange(event.target.value, dateTo);
              }}
              onClick={(event) => (event.target as HTMLInputElement).showPicker?.()}
              className="cursor-pointer pr-9 [&::-webkit-calendar-picker-indicator]:hidden"
            />
            <Calendar className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-export-date-to">{t("export-page.date-to")}</Label>
          <div className="relative">
            <Input
              id="expense-export-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                validateDateRange(dateFrom, event.target.value);
              }}
              onClick={(event) => (event.target as HTMLInputElement).showPicker?.()}
              className={`cursor-pointer pr-9 [&::-webkit-calendar-picker-indicator]:hidden ${dateRangeError ? "border-destructive" : ""}`}
            />
            <Calendar className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {dateRangeError && <p className="text-destructive text-sm">{t("export-page.error.date-range-exceeded")}</p>}

      {(dateFrom || dateTo) && (
        <Button
          type="button"
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

      <Button onClick={handleExport} disabled={isExporting || dateRangeError} className="w-full" size="lg">
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("export-page.exporting")}
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            {t("export-page.expense-export-button")}
          </>
        )}
      </Button>
    </div>
  );
}
