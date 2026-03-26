import { taxReports } from "@spaceinvoices/js-sdk";
import { ChevronDown, Download, Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS,
  normalizeSloveniaAccountingKontoMappings,
  type SloveniaAccountingExportFormat,
  type SloveniaAccountingKontoMappings,
  SloveniaAccountingMappingsFields,
} from "./slovenia-accounting-mappings-fields";

type SloveniaVodExportFormProps = {
  entityId: string;
  onSuccess?: (fileName: string) => void;
  onError?: (error: Error) => void;
} & ComponentTranslationProps;

type SloveniaVodProfile = {
  accounting_exports?: {
    preferred_format?: SloveniaAccountingExportFormat | null;
    konto_mappings?: Partial<Record<keyof SloveniaAccountingKontoMappings, string | null>> | null;
  } | null;
  supported_exports?: {
    vod_xml?: boolean;
    vasco_xml?: boolean;
    minimax_xml?: boolean;
  } | null;
};

type SloveniaVodSupportedExports = NonNullable<SloveniaVodProfile["supported_exports"]>;
type SloveniaVodAccountingExports = {
  preferred_format: SloveniaAccountingExportFormat;
  konto_mappings: SloveniaAccountingKontoMappings;
};

const translations = {
  en: {
    "slovenia-vod.title": "VOD XML",
    "slovenia-vod.loading": "Loading VOD export profile...",
    "slovenia-vod.save": "Save mappings",
    "slovenia-vod.export": "Export VOD ZIP",
    "slovenia-vod.saving": "Saving mappings...",
    "slovenia-vod.exporting": "Generating ZIP...",
    "slovenia-vod.load-error": "Failed to load Slovenia VOD export profile",
    "slovenia-vod.save-error": "Failed to save Slovenia VOD export profile",
    "slovenia-vod.export-error": "Failed to export Slovenia VOD ZIP",
    "slovenia-vod.unsupported": "VOD XML export is not enabled for this entity.",
    "slovenia-vod.notice.title": "Issued documents only",
    "slovenia-vod.notice.description":
      "This first release exports issued documents only. Received-document XML will be added once v2 has a received-invoice source.",
    "slovenia-vod.purchase-note.title": "Purchase mappings are stored now",
    "slovenia-vod.purchase-note.description":
      "These purchase kontos are saved for future exporters and future VOD_prejeti.xml support, but they are not included in this first VOD ZIP.",
    "slovenia-vod.format.label": "Preferred accounting format",
    "slovenia-vod.format.placeholder": "Select accounting format",
    "slovenia-vod.format.vod_xml": "VOD XML",
    "slovenia-vod.format.vasco_xml": "VASCO XML (coming soon)",
    "slovenia-vod.format.minimax_xml": "miniMAX XML (coming soon)",
    "slovenia-vod.date-from": "Date from",
    "slovenia-vod.date-to": "Date to",
    "slovenia-vod.date-range-error": "Date from must be before or equal to date to.",
    "slovenia-vod.mappings.title": "Sales and purchase mappings",
    "slovenia-vod.mappings.description":
      "Save reusable konto mappings for VOD exports and future purchase-side support.",
  },
  sl: {
    "slovenia-vod.title": "VOD XML",
    "slovenia-vod.loading": "Nalaganje VOD profila...",
    "slovenia-vod.save": "Shrani konte",
    "slovenia-vod.export": "Izvozi VOD ZIP",
    "slovenia-vod.saving": "Shranjevanje kontov...",
    "slovenia-vod.exporting": "Generiranje ZIP ...",
    "slovenia-vod.load-error": "Nalaganje slovenskega VOD profila ni uspelo",
    "slovenia-vod.save-error": "Shranjevanje slovenskega VOD profila ni uspelo",
    "slovenia-vod.export-error": "Izvoz slovenskega VOD ZIP ni uspel",
    "slovenia-vod.unsupported": "Izvoz VOD XML za to entiteto ni omogočen.",
    "slovenia-vod.notice.title": "Samo izdani dokumenti",
    "slovenia-vod.notice.description":
      "Ta prva izdaja izvozi samo izdane dokumente. XML za prejete dokumente bo dodan, ko bo v v2 na voljo vir prejetih računov.",
    "slovenia-vod.purchase-note.title": "Nabavni konti se shranijo že zdaj",
    "slovenia-vod.purchase-note.description":
      "Ti nabavni konti se shranijo za prihodnje izvoznike in prihodnjo podporo za VOD_prejeti.xml, vendar še niso vključeni v prvi VOD ZIP.",
    "slovenia-vod.format.label": "Prednostni računovodski format",
    "slovenia-vod.format.placeholder": "Izberi računovodski format",
    "slovenia-vod.format.vod_xml": "VOD XML",
    "slovenia-vod.format.vasco_xml": "VASCO XML (kmalu)",
    "slovenia-vod.format.minimax_xml": "miniMAX XML (kmalu)",
    "slovenia-vod.date-from": "Datum od",
    "slovenia-vod.date-to": "Datum do",
    "slovenia-vod.date-range-error": "Datum od mora biti pred datumom do ali enak datumu do.",
    "slovenia-vod.mappings.title": "Prodajni in nabavni konti",
    "slovenia-vod.mappings.description":
      "Shranite ponovno uporabne konte za izvoz VOD in prihodnjo podporo za nabavno stran.",
  },
  hr: {
    "slovenia-vod.title": "VOD XML",
    "slovenia-vod.loading": "Učitavanje VOD profila...",
    "slovenia-vod.save": "Spremi konta",
    "slovenia-vod.export": "Izvezi VOD ZIP",
    "slovenia-vod.saving": "Spremanje konta...",
    "slovenia-vod.exporting": "Generiranje ZIP-a...",
    "slovenia-vod.load-error": "Učitavanje slovenskog VOD profila nije uspjelo",
    "slovenia-vod.save-error": "Spremanje slovenskog VOD profila nije uspjelo",
    "slovenia-vod.export-error": "Izvoz slovenskog VOD ZIP-a nije uspio",
    "slovenia-vod.unsupported": "VOD XML izvoz nije omogućen za ovaj entitet.",
    "slovenia-vod.notice.title": "Samo izdani dokumenti",
    "slovenia-vod.notice.description":
      "Ovo prvo izdanje izvozi samo izdane dokumente. XML za ulazne dokumente bit će dodan kada v2 dobije izvor zaprimljenih računa.",
    "slovenia-vod.purchase-note.title": "Ulazna konta spremamo već sada",
    "slovenia-vod.purchase-note.description":
      "Ta ulazna konta spremaju se za buduće izvoznike i buduću podršku za VOD_prejeti.xml, ali još nisu uključena u prvi VOD ZIP.",
    "slovenia-vod.format.label": "Preferirani računovodstveni format",
    "slovenia-vod.format.placeholder": "Odaberi računovodstveni format",
    "slovenia-vod.format.vod_xml": "VOD XML",
    "slovenia-vod.format.vasco_xml": "VASCO XML (uskoro)",
    "slovenia-vod.format.minimax_xml": "miniMAX XML (uskoro)",
    "slovenia-vod.date-from": "Datum od",
    "slovenia-vod.date-to": "Datum do",
    "slovenia-vod.date-range-error": "Datum od mora biti prije ili jednak datumu do.",
    "slovenia-vod.mappings.title": "Prodajna i nabavna konta",
    "slovenia-vod.mappings.description":
      "Spremite ponovno upotrebljiva konta za VOD izvoz i buduću podršku za ulaznu stranu.",
  },
} as const;

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

function createDefaultProfile(): {
  accounting_exports: SloveniaVodAccountingExports;
  supported_exports: SloveniaVodSupportedExports;
} {
  return {
    accounting_exports: {
      preferred_format: "vod_xml",
      konto_mappings: DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS,
    },
    supported_exports: {
      vod_xml: false,
      vasco_xml: false,
      minimax_xml: false,
    },
  };
}

function normalizeProfile(profile?: SloveniaVodProfile | null) {
  const defaults = createDefaultProfile();

  return {
    accounting_exports: {
      preferred_format: profile?.accounting_exports?.preferred_format ?? defaults.accounting_exports.preferred_format,
      konto_mappings: normalizeSloveniaAccountingKontoMappings(profile?.accounting_exports?.konto_mappings),
    },
    supported_exports: {
      vod_xml: profile?.supported_exports?.vod_xml ?? defaults.supported_exports.vod_xml,
      vasco_xml: profile?.supported_exports?.vasco_xml ?? defaults.supported_exports.vasco_xml,
      minimax_xml: profile?.supported_exports?.minimax_xml ?? defaults.supported_exports.minimax_xml,
    },
  };
}

function getVodDownloadFileName(dateFrom: string, dateTo: string) {
  return `VOD_${dateFrom}_${dateTo}.zip`;
}

export function SloveniaVodExportForm({
  entityId,
  t: translateFn,
  namespace,
  locale,
  translationLocale,
  onSuccess,
  onError,
}: SloveniaVodExportFormProps) {
  const t = useMemo(
    () => createTranslation({ t: translateFn, namespace, locale, translationLocale, translations }),
    [locale, namespace, translateFn, translationLocale],
  );
  const defaultDateRange = getPreviousMonthRange();
  const [dateFrom, setDateFrom] = useState(defaultDateRange.from);
  const [dateTo, setDateTo] = useState(defaultDateRange.to);
  const [preferredFormat, setPreferredFormat] = useState<SloveniaAccountingExportFormat>("vod_xml");
  const [kontoMappings, setKontoMappings] = useState<SloveniaAccountingKontoMappings>(
    DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS,
  );
  const [supportedExports, setSupportedExports] = useState(createDefaultProfile().supported_exports);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isMappingsOpen, setIsMappingsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsLoadingProfile(true);

      try {
        const profile = await taxReports.getSloveniaTaxProfile({ entity_id: entityId });
        if (!isMounted) return;

        const normalizedProfile = normalizeProfile(profile);
        setPreferredFormat(normalizedProfile.accounting_exports.preferred_format);
        setKontoMappings(normalizedProfile.accounting_exports.konto_mappings);
        setSupportedExports(normalizedProfile.supported_exports);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(t("slovenia-vod.load-error")));
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [entityId, onError, t]);

  const dateRangeInvalid = !!dateFrom && !!dateTo && dateFrom > dateTo;

  const persistProfile = async () => {
    setIsSavingProfile(true);

    try {
      const profile = await taxReports.updateSloveniaTaxProfile(
        {
          accounting_exports: {
            preferred_format: preferredFormat,
            konto_mappings: kontoMappings,
          },
        },
        { entity_id: entityId },
      );

      const normalizedProfile = normalizeProfile(profile);
      setPreferredFormat(normalizedProfile.accounting_exports.preferred_format);
      setKontoMappings(normalizedProfile.accounting_exports.konto_mappings);
      setSupportedExports(normalizedProfile.supported_exports);

      return normalizedProfile;
    } catch (error) {
      throw error instanceof Error ? error : new Error(t("slovenia-vod.save-error"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSave = async () => {
    try {
      await persistProfile();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(t("slovenia-vod.save-error")));
    }
  };

  const handleExport = async () => {
    if (dateRangeInvalid) {
      onError?.(new Error(t("slovenia-vod.date-range-error")));
      return;
    }

    setIsExporting(true);

    try {
      const profile = await persistProfile();

      if (!profile.supported_exports.vod_xml) {
        throw new Error(t("slovenia-vod.unsupported"));
      }

      const blob = await taxReports.exportSloveniaVodXml(
        {
          date_from: dateFrom,
          date_to: dateTo,
        },
        { entity_id: entityId },
      );

      const fileName = getVodDownloadFileName(dateFrom, dateTo);
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
      onError?.(error instanceof Error ? error : new Error(t("slovenia-vod.export-error")));
    } finally {
      setIsExporting(false);
    }
  };

  const buttonsDisabled = isSavingProfile || isExporting || isLoadingProfile;

  return (
    <div className="space-y-6">
      {isLoadingProfile ? (
        <div className="text-muted-foreground text-sm">{t("slovenia-vod.loading")}</div>
      ) : (
        <>
          <Alert>
            <AlertTitle>{t("slovenia-vod.notice.title")}</AlertTitle>
            <AlertDescription>{t("slovenia-vod.notice.description")}</AlertDescription>
          </Alert>

          {!supportedExports.vod_xml ? (
            <Alert>
              <AlertTitle>{t("slovenia-vod.title")}</AlertTitle>
              <AlertDescription>{t("slovenia-vod.unsupported")}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="slovenia-vod-format">{t("slovenia-vod.format.label")}</Label>
              <Select
                value={preferredFormat}
                onValueChange={(value) => setPreferredFormat(value as SloveniaAccountingExportFormat)}
              >
                <SelectTrigger id="slovenia-vod-format">
                  <SelectValue placeholder={t("slovenia-vod.format.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vod_xml">{t("slovenia-vod.format.vod_xml")}</SelectItem>
                  <SelectItem value="vasco_xml" disabled>
                    {t("slovenia-vod.format.vasco_xml")}
                  </SelectItem>
                  <SelectItem value="minimax_xml" disabled>
                    {t("slovenia-vod.format.minimax_xml")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slovenia-vod-date-from">{t("slovenia-vod.date-from")}</Label>
              <Input
                id="slovenia-vod-date-from"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slovenia-vod-date-to">{t("slovenia-vod.date-to")}</Label>
              <Input
                id="slovenia-vod-date-to"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </div>

          {dateRangeInvalid ? <p className="text-destructive text-sm">{t("slovenia-vod.date-range-error")}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={handleExport}
              disabled={buttonsDisabled || dateRangeInvalid || !supportedExports.vod_xml}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("slovenia-vod.exporting")}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {t("slovenia-vod.export")}
                </>
              )}
            </Button>
          </div>

          <Collapsible open={isMappingsOpen} onOpenChange={setIsMappingsOpen} className="space-y-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-muted/50">
              <div>
                <div className="font-medium">{t("slovenia-vod.mappings.title")}</div>
                <div className="text-muted-foreground text-sm">{t("slovenia-vod.mappings.description")}</div>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform ${isMappingsOpen ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4">
              <Alert>
                <AlertTitle>{t("slovenia-vod.purchase-note.title")}</AlertTitle>
                <AlertDescription>{t("slovenia-vod.purchase-note.description")}</AlertDescription>
              </Alert>

              <SloveniaAccountingMappingsFields
                value={kontoMappings}
                onChange={setKontoMappings}
                disabled={isSavingProfile}
              />

              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={handleSave} disabled={buttonsDisabled}>
                  {isSavingProfile && !isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("slovenia-vod.saving")}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t("slovenia-vod.save")}
                    </>
                  )}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}
