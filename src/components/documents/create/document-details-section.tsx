/**
 * Shared document details section for invoices and estimates
 * Handles: number, date, and document-type-specific date field (date_due or date_valid_till)
 */
import type { Entity, Estimate, Invoice, TransactionTypeCheckResponse } from "@spaceinvoices/js-sdk";
import { CalendarIcon, ChevronDown, Globe, Info, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { ContentLocaleButton } from "@/ui/components/document-content-translations";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Calendar } from "@/ui/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/components/ui/collapsible";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { Textarea } from "@/ui/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { CURRENCY_CODES } from "@/ui/lib/constants";
import {
  formatDateOnlyForDisplay,
  normalizeDateOnlyInput,
  toLocalCalendarDate,
  toLocalDateOnlyString,
} from "@/ui/lib/date-only";
import {
  DEFAULT_CONTENT_LOCALE,
  type DocumentContentLocaleMode,
  type LocalizedContentMap,
  readLocalizedValue,
  writeLocalizedValue,
} from "@/ui/lib/document-content-translations";
import { replaceTemplateVariablesForMarkdownPreview } from "@/ui/lib/template-variables";
import { cn } from "@/ui/lib/utils";
import { type DocumentTypes, getDocumentConfig } from "../types";
import type { AnyControl } from "./form-types";
import { MarkdownPreview, MarkdownTextareaToolbar } from "./markdown-textarea-toolbar";
import { SmartCodeInsertButton } from "./smart-code-insert-button";

type FursPremise = {
  id: string;
  business_premise_name: string;
};

type FursDevice = {
  id: string;
  electronic_device_name: string;
};

type FursInlineProps = {
  premises: FursPremise[];
  devices: FursDevice[];
  selectedPremise?: string;
  selectedDevice?: string;
  onPremiseChange: (value: string | undefined) => void;
  onDeviceChange: (value: string | undefined) => void;
  isSkipped?: boolean;
};

type FinaPremise = {
  id: string;
  business_premise_name: string;
};

type FinaDevice = {
  id: string;
  electronic_device_name: string;
};

type FinaInlineProps = {
  premises: FinaPremise[];
  devices: FinaDevice[];
  selectedPremise?: string;
  selectedDevice?: string;
  onPremiseChange: (value: string | undefined) => void;
  onDeviceChange: (value: string | undefined) => void;
};

type ServiceDateProps = {
  dateType: "single" | "range";
  onDateTypeChange: (type: "single" | "range") => void;
};

const DUE_DAYS_PRESETS = [0, 7, 14, 30, 60, 90] as const;

type LocalizedFieldProps = {
  translationsEnabled?: boolean;
  activeContentLocale?: DocumentContentLocaleMode;
  defaultContentLocale?: string | null;
  uiLocale?: string | null;
  fieldTranslations?: LocalizedContentMap | null | undefined;
  onContentLocaleChange?: (locale: DocumentContentLocaleMode) => void;
  onFieldTranslationsChange?: (next: LocalizedContentMap) => void;
};

type DueDaysProps = {
  dueDaysType: number | "custom";
  onDueDaysTypeChange: (type: number | "custom") => void;
};

type DateLockProps = {
  isLocked: boolean;
  reason: string;
};

const LABEL_WIDTH = "w-[6.5rem] shrink-0";
const MIN_DOCUMENT_DATE = new Date("1900-01-01");

function isBeforeDateOnly(date: Date, minDateOnly: string | undefined): boolean {
  return !!minDateOnly && toLocalDateOnlyString(date) < minDateOnly;
}

function formatCalendarButtonDate(value: Date | string | null | undefined, locale: string): string {
  return formatDateOnlyForDisplay(value, locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function extractSequenceNumber(fullNumber: string, premise?: string, device?: string): string {
  if (!fullNumber || (!premise && !device)) return fullNumber;
  const parts = fullNumber.split(/[-/]/);
  const filtered = parts.filter((part) => !(premise && part === premise) && !(device && part === device));
  return filtered.join("") || fullNumber;
}

type DocumentDetailsSectionProps = {
  control: AnyControl;
  documentType: DocumentTypes;
  t: (key: string) => string;
  locale?: string;
  children?: React.ReactNode; // For document-specific additions (e.g., mark as paid for invoices)
  fursInline?: FursInlineProps; // FURS premise/device inline with number
  finaInline?: FinaInlineProps; // FINA premise/device inline with number
  serviceDate?: ServiceDateProps; // Service date section (invoice only)
  dueDays?: DueDaysProps; // Due days selector (invoice only)
  dateLock?: DateLockProps;
};

export function DocumentDetailsSection({
  control,
  documentType,
  t,
  locale = "en-US",
  children,
  fursInline,
  finaInline,
  serviceDate,
  dueDays,
  dateLock,
}: DocumentDetailsSectionProps) {
  const documentConfig = getDocumentConfig(documentType);
  const hasSecondaryDate = documentConfig.dateFieldName !== null;
  const dateFieldName = documentConfig.dateFieldName;
  const dateFieldLabel = documentConfig.dateFieldLabel ? t(documentConfig.dateFieldLabel) : "";
  const watchedIssueDate = useWatch({ control, name: "date" });
  const watchedServiceStartDate = useWatch({ control, name: "date_service" });
  const issueDateOnly = normalizeDateOnlyInput(typeof watchedIssueDate === "string" ? watchedIssueDate : undefined);
  const serviceStartDateOnly = normalizeDateOnlyInput(
    typeof watchedServiceStartDate === "string" ? watchedServiceStartDate : undefined,
  );

  // Check if FURS/FINA inline should show premise/device selects
  const showFursSelects = fursInline && !fursInline.isSkipped;
  const showFinaSelects = !!finaInline;

  return (
    <div className="mt-6 flex-1 space-y-3 md:mt-0">
      <h2 className="font-bold text-xl">{t("Details")}</h2>

      {/* Number field - inline with optional FURS/FINA premise/device + sequence number */}
      <FormField
        control={control}
        name="number"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-3">
              <FormLabel className={LABEL_WIDTH}>{t("Number")} *</FormLabel>
              {showFursSelects ? (
                <div className="flex flex-1 items-center gap-2">
                  <Select
                    value={fursInline.selectedPremise || ""}
                    onValueChange={(v) => fursInline.onPremiseChange(v ?? undefined)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder={t("Premise")} />
                    </SelectTrigger>
                    <SelectContent>
                      {fursInline.premises.map((premise) => (
                        <SelectItem key={premise.id} value={premise.business_premise_name}>
                          {premise.business_premise_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={fursInline.selectedDevice || ""}
                    onValueChange={(v) => fursInline.onDeviceChange(v ?? undefined)}
                    disabled={!fursInline.selectedPremise || fursInline.devices.length === 0}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder={t("Device")} />
                    </SelectTrigger>
                    <SelectContent>
                      {fursInline.devices.map((device) => (
                        <SelectItem key={device.id} value={device.electronic_device_name}>
                          {device.electronic_device_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <FormControl>
                        <Input
                          disabled
                          readOnly
                          className="flex-1 text-right"
                          value={extractSequenceNumber(
                            field.value || "",
                            fursInline.selectedPremise,
                            fursInline.selectedDevice,
                          )}
                        />
                      </FormControl>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{field.value || t("Number format can be changed in settings")}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : showFinaSelects ? (
                <div className="flex flex-1 items-center gap-2">
                  <Select
                    value={finaInline.selectedPremise || ""}
                    onValueChange={(v) => finaInline.onPremiseChange(v ?? undefined)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder={t("Premise")} />
                    </SelectTrigger>
                    <SelectContent>
                      {finaInline.premises.map((premise) => (
                        <SelectItem key={premise.id} value={premise.business_premise_name}>
                          {premise.business_premise_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={finaInline.selectedDevice || ""}
                    onValueChange={(v) => finaInline.onDeviceChange(v ?? undefined)}
                    disabled={!finaInline.selectedPremise || finaInline.devices.length === 0}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder={t("Device")} />
                    </SelectTrigger>
                    <SelectContent>
                      {finaInline.devices.map((device) => (
                        <SelectItem key={device.id} value={device.electronic_device_name}>
                          {device.electronic_device_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <FormControl>
                        <Input
                          disabled
                          readOnly
                          className="flex-1 text-right"
                          value={extractSequenceNumber(
                            field.value || "",
                            finaInline.selectedPremise,
                            finaInline.selectedDevice,
                          )}
                        />
                      </FormControl>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{field.value || t("Number format can be changed in settings")}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FormControl>
                      <Input {...field} disabled className="flex-1" />
                    </FormControl>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("Number format can be changed in settings")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="date"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-3">
              <FormLabel className={LABEL_WIDTH}>{t("Date")} *</FormLabel>
              {dateLock?.isLocked ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FormControl>
                      <Button type="button" variant="outline" disabled className="flex-1 pl-3 text-left font-normal">
                        {formatCalendarButtonDate(field.value || new Date(), locale)}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{dateLock.reason}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("flex-1 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? formatCalendarButtonDate(field.value, locale) : <span>{t("Pick a date")}</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toLocalCalendarDate(field.value)}
                      defaultMonth={toLocalCalendarDate(field.value)}
                      onSelect={(date) => field.onChange(date ? toLocalDateOnlyString(date) : undefined)}
                      disabled={(date) => date > new Date() || date < MIN_DOCUMENT_DATE}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Service Date - select replaces label */}
      {serviceDate && (
        <FormField
          control={control}
          name="date_service"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-3">
                <Select
                  value={serviceDate.dateType}
                  onValueChange={(v) => serviceDate.onDateTypeChange(v as "single" | "range")}
                >
                  <SelectTrigger
                    className={cn(
                      LABEL_WIDTH,
                      "h-auto border-none p-0 font-medium text-sm shadow-none [&>svg]:ml-1 [&>svg]:size-3.5",
                    )}
                  >
                    <SelectValue>
                      {serviceDate.dateType === "single" ? t("Service Date") : t("Service Period")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">{t("Service Date")}</SelectItem>
                    <SelectItem value="range">{t("Service Period")}</SelectItem>
                  </SelectContent>
                </Select>
                {serviceDate.dateType === "single" ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn("flex-1 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? (
                            formatCalendarButtonDate(field.value, locale)
                          ) : (
                            <span>{t("Pick a date")}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={toLocalCalendarDate(field.value)}
                        defaultMonth={toLocalCalendarDate(field.value)}
                        onSelect={(date) => field.onChange(date ? toLocalDateOnlyString(date) : undefined)}
                        disabled={(date) => date < MIN_DOCUMENT_DATE}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? formatCalendarButtonDate(field.value, locale) : <span>{t("From")}</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={toLocalCalendarDate(field.value)}
                          defaultMonth={toLocalCalendarDate(field.value)}
                          onSelect={(date) => field.onChange(date ? toLocalDateOnlyString(date) : undefined)}
                          disabled={(date) => date < MIN_DOCUMENT_DATE}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <FormField
                      control={control}
                      name="date_service_to"
                      render={({ field: toField }) => (
                        <FormItem>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !toField.value && "text-muted-foreground",
                                  )}
                                >
                                  {toField.value ? (
                                    formatCalendarButtonDate(toField.value, locale)
                                  ) : (
                                    <span>{t("To")}</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={toLocalCalendarDate(toField.value)}
                                defaultMonth={toLocalCalendarDate(toField.value) ?? toLocalCalendarDate(field.value)}
                                onSelect={(date) => toField.onChange(date ? toLocalDateOnlyString(date) : undefined)}
                                disabled={(date) =>
                                  date < MIN_DOCUMENT_DATE || isBeforeDateOnly(date, serviceStartDateOnly)
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {hasSecondaryDate && (
        <FormField
          control={control}
          name={dateFieldName!}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-3">
                <FormLabel className={LABEL_WIDTH}>{dateFieldLabel}</FormLabel>
                {documentType === "invoice" && dueDays && (
                  <Select
                    value={String(dueDays.dueDaysType)}
                    onValueChange={(v) => dueDays.onDueDaysTypeChange(v === "custom" ? "custom" : Number(v))}
                  >
                    <SelectTrigger className="h-8 w-auto shrink-0 gap-1 border-none px-2 text-xs shadow-none">
                      <SelectValue>
                        {dueDays.dueDaysType === "custom"
                          ? t("Custom")
                          : dueDays.dueDaysType === 0
                            ? t("On receipt")
                            : t(`${dueDays.dueDaysType} days`)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DUE_DAYS_PRESETS.map((days) => (
                        <SelectItem key={days} value={String(days)}>
                          {days === 0 ? t("On receipt") : t(`${days} days`)}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">{t("Custom")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("flex-1 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? formatCalendarButtonDate(field.value, locale) : <span>{t("Pick a date")}</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toLocalCalendarDate(field.value)}
                      defaultMonth={toLocalCalendarDate(field.value) ?? toLocalCalendarDate(watchedIssueDate)}
                      onSelect={(date) => {
                        field.onChange(date ? toLocalDateOnlyString(date) : undefined);
                        if (dueDays && dueDays.dueDaysType !== "custom") {
                          dueDays.onDueDaysTypeChange("custom");
                        }
                      }}
                      disabled={(date) => date < MIN_DOCUMENT_DATE || isBeforeDateOnly(date, issueDateOnly)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={control}
        name="reference"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-3">
              <FormLabel className={LABEL_WIDTH}>{t("Reference")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder={t("e.g., PO-2024-001")} />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="currency_code"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-3">
              <FormLabel className={LABEL_WIDTH}>{t("Currency")} *</FormLabel>
              <Select onValueChange={(value) => value && field.onChange(value)} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger className="h-10 flex-1">
                    <SelectValue placeholder={t("Select currency")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CURRENCY_CODES.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Document-specific additions (e.g., mark as paid for invoices) */}
      {children}
    </div>
  );
}

/**
 * Note field component with smart code insertion button
 * Exported for use in document forms (placed after items section)
 */
export function DocumentNoteField({
  control,
  t,
  entity,
  document,
  translationsEnabled = false,
  activeContentLocale = DEFAULT_CONTENT_LOCALE,
  defaultContentLocale,
  uiLocale,
  fieldTranslations,
  onContentLocaleChange,
  onFieldTranslationsChange,
}: {
  control: AnyControl;
  t: (key: string) => string;
  entity?: Entity | null;
  document?: Partial<Invoice | Estimate> | null;
} & LocalizedFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <FormField
      control={control}
      name="note"
      render={({ field }) => {
        const visibleValue = readLocalizedValue(field.value, fieldTranslations, activeContentLocale);
        const hasContent = visibleValue;
        const showPreview = !isFocused && hasContent && entity;
        const preview = showPreview
          ? replaceTemplateVariablesForMarkdownPreview(visibleValue || "", entity, document, t)
          : null;
        const setVisibleValue = (newValue: string) => {
          if (!translationsEnabled || activeContentLocale === DEFAULT_CONTENT_LOCALE) {
            field.onChange(newValue);
            return;
          }
          onFieldTranslationsChange?.(writeLocalizedValue(fieldTranslations, activeContentLocale, newValue));
        };

        return (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>{t("Note")}</FormLabel>
              <div className="flex items-center gap-2">
                <MarkdownTextareaToolbar
                  textareaRef={textareaRef}
                  value={visibleValue || ""}
                  onChange={setVisibleValue}
                  t={t}
                />
                <SmartCodeInsertButton
                  textareaRef={textareaRef}
                  value={visibleValue || ""}
                  onInsert={setVisibleValue}
                  t={t}
                />
                {translationsEnabled && onContentLocaleChange && (
                  <ContentLocaleButton
                    activeLocale={activeContentLocale}
                    defaultLocale={defaultContentLocale}
                    onChange={onContentLocaleChange}
                    uiLocale={uiLocale}
                    t={t}
                  />
                )}
              </div>
            </div>
            <FormControl>
              <div className="relative">
                <Textarea
                  name={field.name}
                  ref={(e) => {
                    field.ref(e);
                    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                  }}
                  value={visibleValue || ""}
                  placeholder={showPreview ? "" : t("Add payment instructions, terms, or other notes...")}
                  rows={5}
                  className={cn("resize-y", showPreview && "text-transparent caret-transparent")}
                  onChange={(event) => {
                    setVisibleValue(event.target.value);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={(_event) => {
                    field.onBlur();
                    setIsFocused(false);
                  }}
                />
                {showPreview && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-start overflow-hidden rounded-md border border-input bg-background px-3 py-2 shadow-xs">
                    <MarkdownPreview value={preview ?? ""} className="w-full text-base md:text-sm" />
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/**
 * Tax clause field component with smart code insertion button
 * Similar to DocumentNoteField, auto-populated from entity settings based on transaction type
 */
type TransactionType = TransactionTypeCheckResponse["transaction_type"];

const TRANSACTION_TYPE_LABELS: Record<NonNullable<TransactionType>, string> = {
  domestic: "Domestic",
  intra_eu_b2b: "EU B2B",
  intra_eu_b2c: "EU B2C",
  "3w_b2b": "3W B2B",
  "3w_b2c": "3W B2C",
};

const TRANSACTION_TYPE_VARIANTS: Record<NonNullable<TransactionType>, "secondary" | "default" | "outline"> = {
  domestic: "secondary",
  intra_eu_b2b: "default",
  intra_eu_b2c: "outline",
  "3w_b2b": "outline",
  "3w_b2c": "outline",
};

export function DocumentTaxClauseField({
  control,
  t,
  entity,
  document,
  transactionType,
  isTransactionTypeFetching,
  isFinaNonDomestic,
  translationsEnabled = false,
  activeContentLocale = DEFAULT_CONTENT_LOCALE,
  defaultContentLocale,
  uiLocale,
  fieldTranslations,
  onContentLocaleChange,
  onFieldTranslationsChange,
}: {
  control: AnyControl;
  t: (key: string) => string;
  entity?: Entity | null;
  document?: Partial<Invoice | Estimate> | null;
  transactionType?: TransactionType;
  isTransactionTypeFetching?: boolean;
  isFinaNonDomestic?: boolean;
} & LocalizedFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const effectiveTransactionType = transactionType ?? "domestic";
  const showTransactionInfo = true;

  return (
    <FormField
      control={control}
      name="tax_clause"
      render={({ field }) => {
        const visibleValue = readLocalizedValue(field.value, fieldTranslations, activeContentLocale);
        const hasContent = visibleValue;
        const showPreview = !isFocused && hasContent && entity;
        const preview = showPreview
          ? replaceTemplateVariablesForMarkdownPreview(visibleValue || "", entity, document, t)
          : null;
        const setVisibleValue = (newValue: string) => {
          if (!translationsEnabled || activeContentLocale === DEFAULT_CONTENT_LOCALE) {
            field.onChange(newValue);
            return;
          }
          onFieldTranslationsChange?.(writeLocalizedValue(fieldTranslations, activeContentLocale, newValue));
        };

        return (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>{t("Tax Clause")}</FormLabel>
              <div className="flex items-center gap-2">
                <MarkdownTextareaToolbar
                  textareaRef={textareaRef}
                  value={visibleValue || ""}
                  onChange={setVisibleValue}
                  t={t}
                />
                <SmartCodeInsertButton
                  textareaRef={textareaRef}
                  value={visibleValue || ""}
                  onInsert={setVisibleValue}
                  t={t}
                />
                {translationsEnabled && onContentLocaleChange && (
                  <ContentLocaleButton
                    activeLocale={activeContentLocale}
                    defaultLocale={defaultContentLocale}
                    onChange={onContentLocaleChange}
                    uiLocale={uiLocale}
                    t={t}
                  />
                )}
              </div>
            </div>
            {showTransactionInfo && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1.5 text-sm">
                {isTransactionTypeFetching ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>{t("Determining transaction type...")}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Globe className="size-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("Transaction type")}:</span>
                      <Badge variant={TRANSACTION_TYPE_VARIANTS[effectiveTransactionType]}>
                        {t(TRANSACTION_TYPE_LABELS[effectiveTransactionType])}
                      </Badge>
                    </div>
                    {isFinaNonDomestic && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Info className="size-3.5" />
                        <span>{t("This invoice will not be fiscalized (non-domestic transaction)")}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <FormControl>
              <div className="relative">
                <Textarea
                  name={field.name}
                  ref={(e) => {
                    field.ref(e);
                    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                  }}
                  value={visibleValue || ""}
                  placeholder={showPreview ? "" : t("Add tax clause...")}
                  rows={3}
                  className={cn("resize-y", showPreview && "text-transparent caret-transparent")}
                  onChange={(event) => {
                    setVisibleValue(event.target.value);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => {
                    field.onBlur();
                    setIsFocused(false);
                  }}
                />
                {showPreview && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-start overflow-hidden rounded-md border border-input bg-background px-3 py-2 shadow-xs">
                    <MarkdownPreview value={preview ?? ""} className="w-full text-base md:text-sm" />
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/**
 * Signature field component with smart code insertion button
 * Wrapped in a collapsible for a clean form layout
 */
export function DocumentSignatureField({
  control,
  t,
  entity,
  document,
  translationsEnabled = false,
  activeContentLocale = DEFAULT_CONTENT_LOCALE,
  defaultContentLocale,
  uiLocale,
  fieldTranslations,
  onContentLocaleChange,
  onFieldTranslationsChange,
}: {
  control: AnyControl;
  t: (key: string) => string;
  entity?: Entity | null;
  document?: Partial<Invoice | Estimate> | null;
} & LocalizedFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <FormField
      control={control}
      name="signature"
      render={({ field }) => {
        const visibleValue = readLocalizedValue(field.value, fieldTranslations, activeContentLocale);
        const hasContent = visibleValue;
        const showPreview = !isFocused && hasContent && entity;
        const preview = showPreview
          ? replaceTemplateVariablesForMarkdownPreview(visibleValue || "", entity, document, t)
          : null;
        const setVisibleValue = (newValue: string) => {
          if (!translationsEnabled || activeContentLocale === DEFAULT_CONTENT_LOCALE) {
            field.onChange(newValue);
            return;
          }
          onFieldTranslationsChange?.(writeLocalizedValue(fieldTranslations, activeContentLocale, newValue));
        };

        return (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>{t("Signature")}</FormLabel>
              <div className="flex items-center gap-2">
                <MarkdownTextareaToolbar
                  textareaRef={textareaRef}
                  value={visibleValue || ""}
                  onChange={setVisibleValue}
                  t={t}
                />
                <SmartCodeInsertButton
                  textareaRef={textareaRef}
                  value={visibleValue || ""}
                  onInsert={setVisibleValue}
                  t={t}
                />
                {translationsEnabled && onContentLocaleChange && (
                  <ContentLocaleButton
                    activeLocale={activeContentLocale}
                    defaultLocale={defaultContentLocale}
                    onChange={onContentLocaleChange}
                    uiLocale={uiLocale}
                    t={t}
                  />
                )}
              </div>
            </div>
            <FormControl>
              <div className="relative">
                <Textarea
                  name={field.name}
                  ref={(e) => {
                    field.ref(e);
                    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                  }}
                  value={visibleValue || ""}
                  placeholder={showPreview ? "" : t("Add signature text...")}
                  rows={2}
                  className={cn("resize-y", showPreview && "text-transparent caret-transparent")}
                  onChange={(event) => {
                    setVisibleValue(event.target.value);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => {
                    field.onBlur();
                    setIsFocused(false);
                  }}
                />
                {showPreview && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-start overflow-hidden rounded-md border border-input bg-background px-3 py-2 shadow-xs">
                    <MarkdownPreview value={preview ?? ""} className="w-full text-base md:text-sm" />
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/**
 * Payment terms field component with smart code insertion button
 * Similar to DocumentNoteField, exported for use in document forms
 */
export function DocumentPaymentTermsField({
  control,
  t,
  entity,
  document,
  translationsEnabled = false,
  activeContentLocale = DEFAULT_CONTENT_LOCALE,
  defaultContentLocale,
  uiLocale,
  fieldTranslations,
  onContentLocaleChange,
  onFieldTranslationsChange,
}: {
  control: AnyControl;
  t: (key: string) => string;
  entity?: Entity | null;
  document?: Partial<Invoice | Estimate> | null;
} & LocalizedFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <FormField
      control={control}
      name="payment_terms"
      render={({ field }) => {
        const visibleValue = readLocalizedValue(field.value, fieldTranslations, activeContentLocale);
        const hasContent = visibleValue;
        const showPreview = !isFocused && hasContent && entity;
        const preview = showPreview
          ? replaceTemplateVariablesForMarkdownPreview(visibleValue || "", entity, document, t)
          : null;
        const setVisibleValue = (newValue: string) => {
          if (!translationsEnabled || activeContentLocale === DEFAULT_CONTENT_LOCALE) {
            field.onChange(newValue);
            return;
          }
          onFieldTranslationsChange?.(writeLocalizedValue(fieldTranslations, activeContentLocale, newValue));
        };

        return (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>{t("Payment Terms")}</FormLabel>
              <div className="flex items-center gap-2">
                <MarkdownTextareaToolbar
                  textareaRef={textareaRef}
                  value={visibleValue || ""}
                  onChange={setVisibleValue}
                  t={t}
                />
                <SmartCodeInsertButton
                  textareaRef={textareaRef}
                  value={visibleValue || ""}
                  onInsert={setVisibleValue}
                  t={t}
                />
                {translationsEnabled && onContentLocaleChange && (
                  <ContentLocaleButton
                    activeLocale={activeContentLocale}
                    defaultLocale={defaultContentLocale}
                    onChange={onContentLocaleChange}
                    uiLocale={uiLocale}
                    t={t}
                  />
                )}
              </div>
            </div>
            <FormControl>
              <div className="relative">
                <Textarea
                  name={field.name}
                  ref={(e) => {
                    field.ref(e);
                    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                  }}
                  value={visibleValue || ""}
                  placeholder={showPreview ? "" : t("Add payment terms...")}
                  rows={3}
                  className={cn("resize-y", showPreview && "text-transparent caret-transparent")}
                  onChange={(event) => {
                    setVisibleValue(event.target.value);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => {
                    field.onBlur();
                    setIsFocused(false);
                  }}
                />
                {showPreview && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-start overflow-hidden rounded-md border border-input bg-background px-3 py-2 shadow-xs">
                    <MarkdownPreview value={preview ?? ""} className="w-full text-base md:text-sm" />
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/**
 * Footer field component with collapsible wrapper and smart code insertion button
 * Collapsed by default, opens if content exists
 */
export function DocumentFooterField({
  control,
  t,
  entity,
  document,
  translationsEnabled = false,
  activeContentLocale = DEFAULT_CONTENT_LOCALE,
  defaultContentLocale,
  uiLocale,
  fieldTranslations,
  onContentLocaleChange,
  onFieldTranslationsChange,
}: {
  control: AnyControl;
  t: (key: string) => string;
  entity?: Entity | null;
  document?: Partial<Invoice | Estimate> | null;
} & LocalizedFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <FormField
      control={control}
      name="footer"
      render={({ field }) => {
        const visibleValue = readLocalizedValue(field.value, fieldTranslations, activeContentLocale);
        const hasContent = visibleValue;
        const showPreview = !isFocused && hasContent && entity;
        const preview = showPreview
          ? replaceTemplateVariablesForMarkdownPreview(visibleValue || "", entity, document, t)
          : null;
        const setVisibleValue = (newValue: string) => {
          if (!translationsEnabled || activeContentLocale === DEFAULT_CONTENT_LOCALE) {
            field.onChange(newValue);
            return;
          }
          onFieldTranslationsChange?.(writeLocalizedValue(fieldTranslations, activeContentLocale, newValue));
        };

        return (
          <FormItem>
            <Collapsible defaultOpen={!!hasContent}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex items-center gap-1 font-medium text-sm">
                    <ChevronDown className="size-4 transition-transform [[data-panel-hidden]_&]:-rotate-90 [[data-panel-open]_&]:rotate-0" />
                    {t("Footer")}
                  </button>
                </CollapsibleTrigger>
                <div className="flex items-center gap-2 [[data-panel-hidden]_&]:hidden">
                  <MarkdownTextareaToolbar
                    textareaRef={textareaRef}
                    value={visibleValue || ""}
                    onChange={setVisibleValue}
                    t={t}
                  />
                  <SmartCodeInsertButton
                    textareaRef={textareaRef}
                    value={visibleValue || ""}
                    onInsert={setVisibleValue}
                    t={t}
                  />
                  {translationsEnabled && onContentLocaleChange && (
                    <ContentLocaleButton
                      activeLocale={activeContentLocale}
                      defaultLocale={defaultContentLocale}
                      onChange={onContentLocaleChange}
                      uiLocale={uiLocale}
                      t={t}
                    />
                  )}
                </div>
              </div>
              <CollapsibleContent className="mt-2">
                <FormControl>
                  <div className="relative">
                    <Textarea
                      name={field.name}
                      ref={(e) => {
                        field.ref(e);
                        (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                      }}
                      value={visibleValue || ""}
                      placeholder={showPreview ? "" : t("Add document footer...")}
                      rows={2}
                      className={cn("resize-y", showPreview && "text-transparent caret-transparent")}
                      onChange={(event) => {
                        setVisibleValue(event.target.value);
                      }}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => {
                        field.onBlur();
                        setIsFocused(false);
                      }}
                    />
                    {showPreview && (
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-start overflow-hidden rounded-md border border-input bg-background px-3 py-2 shadow-xs">
                        <MarkdownPreview value={preview ?? ""} className="w-full text-base md:text-sm" />
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </CollapsibleContent>
            </Collapsible>
          </FormItem>
        );
      }}
    />
  );
}
