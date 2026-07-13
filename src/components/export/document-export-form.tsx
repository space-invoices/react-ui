import { getClientHeaders } from "@spaceinvoices/js-sdk";
import { Calendar, Download, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { buildExportUrl, downloadExportFile } from "./export-download";

export type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";
type EslogDocumentType = Extract<DocumentType, "invoice" | "estimate" | "credit_note" | "advance_invoice">;
type AsyncArchiveExportFormat = "pdf_zip" | "eslog_zip";
export type ExportFormat = "xlsx" | "csv" | AsyncArchiveExportFormat;

const ALL_DOCUMENT_TYPES: DocumentType[] = ["invoice", "estimate", "credit_note", "advance_invoice", "delivery_note"];
const ESLOG_DOCUMENT_TYPES: EslogDocumentType[] = ["invoice", "estimate", "credit_note", "advance_invoice"];

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
  allowEslogZip?: boolean;
  pdfExportInProgress?: boolean;
  eslogExportInProgress?: boolean;
  /** Base URL for API calls (required in embed context where relative paths don't reach the API) */
  apiBaseUrl?: string;
  onSuccess?: (fileName: string) => void;
  onError?: (error: Error) => void;
  onPdfExportStarted?: (jobId: string) => void;
  onEslogExportStarted?: (jobId: string) => void;
  onLoadingChange?: (isLoading: boolean, toastId: string | number | null) => void;
} & ComponentTranslationProps;

const translations = {
  en: {
    "export-page.document-type": "Document type",
    "export-page.presets.invoices-credit-notes": "Invoices + credit notes",
    "export-page.presets.all-sales-documents": "All sales documents",
    "export-page.presets.all-documents": "All documents",
    "export-page.presets.clear": "Clear",
    "export-page.types.invoice": "Invoice",
    "export-page.types.estimate": "Estimate",
    "export-page.types.credit_note": "Credit note",
    "export-page.types.advance_invoice": "Advance invoice",
    "export-page.types.delivery_note": "Delivery note",
    "export-page.format": "Format",
    "export-page.formats.xlsx": "Excel (.xlsx)",
    "export-page.formats.csv": "CSV (.csv)",
    "export-page.formats.pdf_zip": "PDF ZIP archive",
    "export-page.formats.eslog_zip": "e-SLOG ZIP archive",
    "export-page.pdf-export-info":
      "PDF export runs asynchronously and generates a ZIP archive for the selected document types.",
    "export-page.eslog-export-info": "Only valid e-SLOG documents are included; invalid documents are skipped.",
    "export-page.date-from": "Date from",
    "export-page.date-to": "Date to",
    "export-page.error.date-range-exceeded": "Date range cannot exceed one year.",
    "export-page.clear-dates": "Clear dates",
    "export-page.exporting": "Exporting...",
    "export-page.export-button": "Export documents",
  },
  sl: {
    "export-page.presets.invoices-credit-notes": "Računi + dobropisi",
    "export-page.presets.all-sales-documents": "Vsi prodajni dokumenti",
    "export-page.presets.all-documents": "Vsi dokumenti",
    "export-page.presets.clear": "Počisti",
  },
  de: {
    "export-page.presets.invoices-credit-notes": "Rechnungen + Gutschriften",
    "export-page.presets.all-sales-documents": "Alle Verkaufsdokumente",
    "export-page.presets.all-documents": "Alle Dokumente",
    "export-page.presets.clear": "Leeren",
  },
  it: {
    "export-page.presets.invoices-credit-notes": "Fatture + note di credito",
    "export-page.presets.all-sales-documents": "Tutti i documenti di vendita",
    "export-page.presets.all-documents": "Tutti i documenti",
    "export-page.presets.clear": "Cancella",
  },
  fr: {
    "export-page.presets.invoices-credit-notes": "Factures + avoirs",
    "export-page.presets.all-sales-documents": "Tous les documents de vente",
    "export-page.presets.all-documents": "Tous les documents",
    "export-page.presets.clear": "Effacer",
  },
  es: {
    "export-page.presets.invoices-credit-notes": "Facturas + notas de crédito",
    "export-page.presets.all-sales-documents": "Todos los documentos de venta",
    "export-page.presets.all-documents": "Todos los documentos",
    "export-page.presets.clear": "Borrar",
  },
  pt: {
    "export-page.presets.invoices-credit-notes": "Faturas + notas de crédito",
    "export-page.presets.all-sales-documents": "Todos os documentos de venda",
    "export-page.presets.all-documents": "Todos os documentos",
    "export-page.presets.clear": "Limpar",
  },
  nl: {
    "export-page.presets.invoices-credit-notes": "Facturen + creditnota's",
    "export-page.presets.all-sales-documents": "Alle verkoopdocumenten",
    "export-page.presets.all-documents": "Alle documenten",
    "export-page.presets.clear": "Wissen",
  },
  pl: {
    "export-page.presets.invoices-credit-notes": "Faktury + korekty",
    "export-page.presets.all-sales-documents": "Wszystkie dokumenty sprzedaży",
    "export-page.presets.all-documents": "Wszystkie dokumenty",
    "export-page.presets.clear": "Wyczyść",
  },
  hr: {
    "export-page.presets.invoices-credit-notes": "Računi + odobrenja",
    "export-page.presets.all-sales-documents": "Svi prodajni dokumenti",
    "export-page.presets.all-documents": "Svi dokumenti",
    "export-page.presets.clear": "Očisti",
  },
  sv: {
    "export-page.presets.invoices-credit-notes": "Fakturor + kreditnotor",
    "export-page.presets.all-sales-documents": "Alla försäljningsdokument",
    "export-page.presets.all-documents": "Alla dokument",
    "export-page.presets.clear": "Rensa",
  },
  fi: {
    "export-page.presets.invoices-credit-notes": "Laskut + hyvityslaskut",
    "export-page.presets.all-sales-documents": "Kaikki myyntiasiakirjat",
    "export-page.presets.all-documents": "Kaikki asiakirjat",
    "export-page.presets.clear": "Tyhjennä",
  },
  et: {
    "export-page.presets.invoices-credit-notes": "Arved + kreeditarved",
    "export-page.presets.all-sales-documents": "Kõik müügidokumendid",
    "export-page.presets.all-documents": "Kõik dokumendid",
    "export-page.presets.clear": "Tühjenda",
  },
  bg: {
    "export-page.presets.invoices-credit-notes": "Фактури + кредитни известия",
    "export-page.presets.all-sales-documents": "Всички документи за продажби",
    "export-page.presets.all-documents": "Всички документи",
    "export-page.presets.clear": "Изчисти",
  },
  cs: {
    "export-page.presets.invoices-credit-notes": "Faktury + dobropisy",
    "export-page.presets.all-sales-documents": "Všechny prodejní doklady",
    "export-page.presets.all-documents": "Všechny doklady",
    "export-page.presets.clear": "Vymazat",
  },
  sk: {
    "export-page.presets.invoices-credit-notes": "Faktúry + dobropisy",
    "export-page.presets.all-sales-documents": "Všetky predajné doklady",
    "export-page.presets.all-documents": "Všetky doklady",
    "export-page.presets.clear": "Vymazať",
  },
  nb: {
    "export-page.presets.invoices-credit-notes": "Fakturaer + kreditnotaer",
    "export-page.presets.all-sales-documents": "Alle salgsdokumenter",
    "export-page.presets.all-documents": "Alle dokumenter",
    "export-page.presets.clear": "Tøm",
  },
  is: {
    "export-page.presets.invoices-credit-notes": "Reikningar + kreditreikningar",
    "export-page.presets.all-sales-documents": "Öll söluskjöl",
    "export-page.presets.all-documents": "Öll skjöl",
    "export-page.presets.clear": "Hreinsa",
  },
} as const;

export function DocumentExportForm({
  entityId,
  token,
  accountId,
  language: _language,
  allowEslogZip = false,
  pdfExportInProgress = false,
  eslogExportInProgress = false,
  t: translateFn,
  namespace,
  locale,
  translationLocale,
  apiBaseUrl = "",
  onSuccess,
  onError,
  onPdfExportStarted,
  onEslogExportStarted,
  onLoadingChange,
}: DocumentExportFormProps) {
  const t = createTranslation({ t: translateFn, namespace, locale, translationLocale, translations });
  const defaultDates = getPreviousMonthRange();
  const [documentType, setDocumentType] = useState<DocumentType>("invoice");
  const [selectedTypes, setSelectedTypes] = useState<DocumentType[]>(["invoice", "credit_note"]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [dateFrom, setDateFrom] = useState(defaultDates.from);
  const [dateTo, setDateTo] = useState(defaultDates.to);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRangeError, setDateRangeError] = useState(false);

  const toastIdRef = useRef<string | number | null>(null);
  const isAsyncArchiveFormat = exportFormat === "pdf_zip" || exportFormat === "eslog_zip";
  const isMultiTypeSelection = exportFormat === "xlsx" || isAsyncArchiveFormat;
  const visibleDocumentTypes = exportFormat === "eslog_zip" ? ESLOG_DOCUMENT_TYPES : ALL_DOCUMENT_TYPES;
  const asyncExportInProgress =
    exportFormat === "pdf_zip" ? pdfExportInProgress : exportFormat === "eslog_zip" ? eslogExportInProgress : false;
  const hasNoSelectedTypes = isMultiTypeSelection && selectedTypes.length === 0;

  useEffect(() => {
    if (!allowEslogZip && exportFormat === "eslog_zip") {
      setExportFormat("xlsx");
      setSelectedTypes(["invoice"]);
    }
  }, [allowEslogZip, exportFormat]);

  const toggleType = (type: DocumentType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        const next = prev.filter((t) => t !== type);
        setDocumentType(next[0] ?? "invoice");
        return next;
      }
      const next = [...prev, type];
      setDocumentType(next[0] ?? type);
      return next;
    });
  };

  const selectTypes = (types: DocumentType[]) => {
    const allowedTypes = types.filter((type) => visibleDocumentTypes.includes(type));
    setSelectedTypes(allowedTypes);
    setDocumentType(allowedTypes[0] ?? "invoice");
  };

  const validateDateRange = (from: string, to: string) => {
    const isValid = isDateRangeValid(from, to);
    setDateRangeError(!isValid);
    return isValid;
  };

  const handleExportFormatChange = (value: ExportFormat) => {
    setExportFormat(value);

    if (value === "csv") {
      setSelectedTypes([documentType]);
      return;
    }

    if (value === "eslog_zip") {
      setSelectedTypes((prev) => {
        const filtered = prev.filter((type): type is EslogDocumentType =>
          ESLOG_DOCUMENT_TYPES.includes(type as EslogDocumentType),
        );
        return filtered.length > 0 ? filtered : ["invoice"];
      });

      if (!ESLOG_DOCUMENT_TYPES.includes(documentType as EslogDocumentType)) {
        setDocumentType("invoice");
      }
      return;
    }

    if (value === "xlsx" && selectedTypes.length === 0) {
      setSelectedTypes([documentType]);
    }
  };

  const handleExport = async () => {
    if (!validateDateRange(dateFrom, dateTo)) {
      onError?.(new Error(t("export-page.error.date-range-exceeded")));
      return;
    }

    if (hasNoSelectedTypes) {
      return;
    }

    if (isAsyncArchiveFormat && asyncExportInProgress) {
      return;
    }

    setIsExporting(true);
    onLoadingChange?.(true, null);

    // ZIP archive exports run asynchronously
    if (isAsyncArchiveFormat) {
      const exportPath = exportFormat === "eslog_zip" ? "/documents/export/eslog" : "/documents/export/pdf";
      const onAsyncExportStarted = exportFormat === "eslog_zip" ? onEslogExportStarted : onPdfExportStarted;

      try {
        const response = await fetch(buildExportUrl(apiBaseUrl, exportPath), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-entity-id": entityId,
            ...(accountId && { "x-account-id": accountId }),
            ...getClientHeaders("ui"),
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
          throw new Error(error.message || error.error || `Export failed: ${response.statusText}`);
        }

        const data = await response.json();
        onAsyncExportStarted?.(data.id);
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
        format: exportFormat,
      };
      if (exportFormat === "xlsx" && selectedTypes.length > 1) {
        queryParams.types = selectedTypes.join(",");
      } else {
        queryParams.type = exportFormat === "xlsx" ? (selectedTypes[0] ?? documentType) : documentType;
      }
      if (dateFrom) {
        queryParams.date_from = dateFrom;
      }
      if (dateTo) {
        queryParams.date_to = dateTo;
      }

      const fileName = await downloadExportFile({
        apiBaseUrl,
        path: "/documents/export",
        query: queryParams,
        fallbackFileName: `${documentType}s_export.${exportFormat}`,
        format: exportFormat,
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
      onLoadingChange?.(false, toastIdRef.current);
      toastIdRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Document Types */}
      <div className="space-y-2">
        <Label htmlFor="document-type">{t("export-page.document-type")}</Label>
        {isMultiTypeSelection ? (
          <fieldset className="space-y-4 rounded-md border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {exportFormat === "xlsx" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => selectTypes(["invoice", "credit_note"])}
                  >
                    {t("export-page.presets.invoices-credit-notes")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => selectTypes(["invoice", "credit_note", "advance_invoice"])}
                  >
                    {t("export-page.presets.all-sales-documents")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => selectTypes(ALL_DOCUMENT_TYPES)}>
                    {t("export-page.presets.all-documents")}
                  </Button>
                </div>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => selectTypes([])}>
                {t("export-page.presets.clear")}
              </Button>
            </div>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleDocumentTypes.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={selectedTypes.includes(type)}
                    className="bg-background dark:bg-background"
                    onCheckedChange={() => toggleType(type)}
                  />
                  <Label htmlFor={`type-${type}`} className="cursor-pointer font-normal">
                    {t(`export-page.types.${type}`)}
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="rounded-md border bg-muted/20 p-4">
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
          </div>
        )}
      </div>

      {/* Export Format + Date Range */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="export-format">{t("export-page.format")}</Label>
          <Select value={exportFormat} onValueChange={(v) => handleExportFormatChange(v as ExportFormat)}>
            <SelectTrigger id="export-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xlsx">{t("export-page.formats.xlsx")}</SelectItem>
              <SelectItem value="csv">{t("export-page.formats.csv")}</SelectItem>
              <SelectItem value="pdf_zip">{t("export-page.formats.pdf_zip")}</SelectItem>
              {allowEslogZip && <SelectItem value="eslog_zip">{t("export-page.formats.eslog_zip")}</SelectItem>}
            </SelectContent>
          </Select>
        </div>

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
      {isAsyncArchiveFormat && (
        <p className="text-muted-foreground text-sm">
          {t(exportFormat === "eslog_zip" ? "export-page.eslog-export-info" : "export-page.pdf-export-info")}
        </p>
      )}

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
      <Button
        onClick={handleExport}
        disabled={isExporting || dateRangeError || asyncExportInProgress || hasNoSelectedTypes}
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
