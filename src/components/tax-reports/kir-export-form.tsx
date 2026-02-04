import type SDK from "@spaceinvoices/js-sdk";

type TFunction = (key: string, options?: Record<string, unknown>) => string;

import { Download, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type PeriodType = "month" | "quarter";

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function getPreviousMonth(): { year: number; month: number } {
  const now = new Date();
  const prevMonth = now.getMonth(); // 0-indexed, so this is already previous month
  const year = prevMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = prevMonth === 0 ? 12 : prevMonth;
  return { year, month };
}

type KirExportFormProps = {
  sdk: SDK;
  entityId: string;
  t: TFunction;
  onSuccess?: (fileName: string) => void;
  onError?: (error: Error) => void;
  onLoadingChange?: (isLoading: boolean, toastId: string | number | null) => void;
};

export function KirExportForm({ sdk, entityId, t, onSuccess, onError, onLoadingChange }: KirExportFormProps) {
  const defaultPeriod = getPreviousMonth();
  const [year, setYear] = useState(defaultPeriod.year);
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [month, setMonth] = useState(defaultPeriod.month);
  const [quarter, setQuarter] = useState(Math.ceil(defaultPeriod.month / 3));
  const [isExporting, setIsExporting] = useState(false);

  const toastIdRef = useRef<string | number | null>(null);

  // Generate year options (current year + 5 previous years)
  const currentYear = getCurrentYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const handleExport = async () => {
    setIsExporting(true);
    onLoadingChange?.(true, null);

    try {
      const blob = await sdk.taxReports.generateKirExport(
        {
          year: year.toString(),
          month: periodType === "month" ? month.toString() : undefined,
          quarter: periodType === "quarter" ? quarter.toString() : undefined,
        },
        { entity_id: entityId },
      );

      // Generate filename
      const fileName = `KIR_${year}_${periodType === "month" ? `M${month}` : `Q${quarter}`}.zip`;

      // Download the file
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
      console.error("KIR export error:", error);
      onError?.(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setIsExporting(false);
      onLoadingChange?.(false, toastIdRef.current);
      toastIdRef.current = null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Year Selection */}
      <div className="space-y-2">
        <Label htmlFor="kir-year">{t("kir-export.year")}</Label>
        <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger id="kir-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Period Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="kir-period-type">{t("kir-export.period-type")}</Label>
        <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
          <SelectTrigger id="kir-period-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">{t("kir-export.period-types.month")}</SelectItem>
            <SelectItem value="quarter">{t("kir-export.period-types.quarter")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Month/Quarter Selection */}
      {periodType === "month" ? (
        <div className="space-y-2">
          <Label htmlFor="kir-month">{t("kir-export.month")}</Label>
          <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger id="kir-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {t(`kir-export.months.${m}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="kir-quarter">{t("kir-export.quarter")}</Label>
          <Select value={quarter.toString()} onValueChange={(v) => setQuarter(Number(v))}>
            <SelectTrigger id="kir-quarter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((q) => (
                <SelectItem key={q} value={q.toString()}>
                  {t(`kir-export.quarters.${q}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Export Button */}
      <Button onClick={handleExport} disabled={isExporting} className="w-full">
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("kir-export.exporting")}
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            {t("kir-export.export-button")}
          </>
        )}
      </Button>
    </div>
  );
}
