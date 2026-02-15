/**
 * Shared document details section for invoices and estimates
 * Handles: number, date, and document-type-specific date field (date_due or date_valid_till)
 */
import type { Entity, Estimate, Invoice } from "@spaceinvoices/js-sdk";
import { CalendarIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/ui/components/ui/button";
import { Calendar } from "@/ui/components/ui/calendar";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { Textarea } from "@/ui/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { CURRENCY_CODES } from "@/ui/lib/constants";
import { cn } from "@/ui/lib/utils";
import type { DocumentTypes } from "../types";
import type { AnyControl } from "./form-types";
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
  premise_id: string;
};

type FinaDevice = {
  id: string;
  device_id: string;
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

type DocumentDetailsSectionProps = {
  control: AnyControl;
  documentType: DocumentTypes;
  t: (key: string) => string;
  children?: React.ReactNode; // For document-specific additions (e.g., mark as paid for invoices)
  fursInline?: FursInlineProps; // FURS premise/device inline with number
  finaInline?: FinaInlineProps; // FINA premise/device inline with number
  serviceDate?: ServiceDateProps; // Service date section (invoice only)
};

export function DocumentDetailsSection({
  control,
  documentType,
  t,
  children,
  fursInline,
  finaInline,
  serviceDate,
}: DocumentDetailsSectionProps) {
  // Determine the date field name based on document type
  // Delivery notes don't have a secondary date field
  const hasSecondaryDate = documentType !== "delivery_note";
  const dateFieldName =
    documentType === "invoice" || documentType === "advance_invoice" ? "date_due" : "date_valid_till";
  const dateFieldLabel =
    documentType === "invoice" || documentType === "advance_invoice" ? t("Due Date") : t("Valid Until");

  // Check if FURS/FINA inline should show premise/device selects
  const showFursSelects = fursInline && !fursInline.isSkipped;
  const showFinaSelects = !!finaInline;

  return (
    <div className="flex-1 space-y-4">
      <h2 className="font-bold text-xl">{t("Details")}</h2>

      {/* Number field - with optional FURS premise/device inline (Premise | Device | Number) */}
      <FormField
        control={control}
        name="number"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Number")} *</FormLabel>
            {showFursSelects ? (
              <div className="flex gap-2">
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
                      <Input {...field} disabled className="flex-1" />
                    </FormControl>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("Number format can be changed in settings")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : showFinaSelects ? (
              <div className="flex gap-2">
                <Select
                  value={finaInline.selectedPremise || ""}
                  onValueChange={(v) => finaInline.onPremiseChange(v ?? undefined)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder={t("Premise")} />
                  </SelectTrigger>
                  <SelectContent>
                    {finaInline.premises.map((premise) => (
                      <SelectItem key={premise.id} value={premise.premise_id}>
                        {premise.premise_id}
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
                      <SelectItem key={device.id} value={device.device_id}>
                        {device.device_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("Number format can be changed in settings")}</p>
                </TooltipContent>
              </Tooltip>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="date"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="">{t("Date")} *</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                  >
                    {field.value ? new Date(field.value).toLocaleDateString() : <span>{t("Pick a date")}</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => field.onChange(date?.toISOString())}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Service Date - Invoice only */}
      {serviceDate && (
        <FormField
          control={control}
          name="date_service"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>{t("Service Date")}</FormLabel>
                <Select
                  value={serviceDate.dateType}
                  onValueChange={(v) => serviceDate.onDateTypeChange(v as "single" | "range")}
                >
                  <SelectTrigger className="h-7 w-auto gap-1 border-none px-2 font-normal text-xs shadow-none">
                    <SelectValue>{serviceDate.dateType === "single" ? t("Single Date") : t("Date Range")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">{t("Single Date")}</SelectItem>
                    <SelectItem value="range">{t("Date Range")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {serviceDate.dateType === "single" ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? new Date(field.value).toLocaleDateString() : <span>{t("Pick a date")}</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? new Date(field.value).toLocaleDateString() : <span>{t("From")}</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date?.toISOString())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <FormField
                    control={control}
                    name="date_service_to"
                    render={({ field: toField }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !toField.value && "text-muted-foreground",
                            )}
                          >
                            {toField.value ? new Date(toField.value).toLocaleDateString() : <span>{t("To")}</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={toField.value ? new Date(toField.value) : undefined}
                            onSelect={(date) => toField.onChange(date?.toISOString())}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {hasSecondaryDate && (
        <FormField
          control={control}
          name={dateFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="">{dateFieldLabel}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                    >
                      {field.value ? new Date(field.value).toLocaleDateString() : <span>{t("Pick a date")}</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => field.onChange(date?.toISOString())}
                    disabled={(date) => date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={control}
        name="currency_code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Currency")} *</FormLabel>
            <Select onValueChange={(value) => value && field.onChange(value)} value={field.value || ""}>
              <FormControl>
                <SelectTrigger className="h-10">
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
// Helper functions for template variable replacement (shared with InputWithPreview)
function formatVariableName(varName: string): string {
  return varName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getVariableValue(
  varName: string,
  entity?: Entity | null,
  document?: Partial<Invoice | Estimate> | null,
): string | null {
  if (!entity) return null;

  // Entity-related variables
  if (varName === "entity_name") return entity.name || null;
  if (varName === "entity_email") return (entity.settings as any)?.email || null;

  // Date variables
  if (varName === "current_date") {
    return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  if (varName === "current_year") return new Date().getFullYear().toString();

  // Document-specific variables
  if (document) {
    if (varName === "document_number") return (document as any).number || null;
    if (varName === "document_date" && (document as any).date) {
      return new Date((document as any).date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (varName === "document_total" && (document as any).total_with_tax) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: (document as any).currency_code || "USD",
      }).format(Number((document as any).total_with_tax));
    }
    if (varName === "document_currency") return (document as any).currency_code || null;

    // Invoice due date
    if (varName === "document_due_date" && (document as any).date_due) {
      return new Date((document as any).date_due).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    // Estimate valid until
    if (varName === "document_valid_until" && (document as any).date_valid_till) {
      return new Date((document as any).date_valid_till).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    // Customer variables
    if ((document as any).customer) {
      if (varName === "customer_name") return (document as any).customer.name || null;
      if (varName === "customer_email") return (document as any).customer.email || null;
    }
  }

  return null;
}

function replaceTemplateVariablesForPreview(
  template: string,
  entity?: Entity | null,
  document?: Partial<Invoice | Estimate> | null,
): React.ReactNode[] {
  if (!template) return [];

  const parts: React.ReactNode[] = [];
  const regex = /\{([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  match = regex.exec(template);
  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(template.slice(lastIndex, match.index));
    }

    const varName = match[1];
    const actualValue = getVariableValue(varName, entity, document);
    const displayValue = actualValue || formatVariableName(varName);

    parts.push(
      <span
        key={match.index}
        className={cn(
          "rounded px-1.5 py-0.5 font-medium text-xs",
          actualValue ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {displayValue}
      </span>,
    );

    lastIndex = regex.lastIndex;
    match = regex.exec(template);
  }

  if (lastIndex < template.length) {
    parts.push(template.slice(lastIndex));
  }

  return parts;
}

export function DocumentNoteField({
  control,
  t,
  entity,
  document,
}: {
  control: AnyControl;
  t: (key: string) => string;
  entity?: Entity | null;
  document?: Partial<Invoice | Estimate> | null;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <FormField
      control={control}
      name="note"
      render={({ field }) => {
        const hasContent = field.value;
        const showPreview = !isFocused && hasContent && entity;
        const preview = showPreview ? replaceTemplateVariablesForPreview(field.value || "", entity, document) : null;

        return (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>{t("Note")}</FormLabel>
              <SmartCodeInsertButton
                textareaRef={textareaRef}
                value={field.value || ""}
                onInsert={(newValue) => field.onChange(newValue)}
                t={t}
              />
            </div>
            <FormControl>
              <div className="relative">
                <Textarea
                  {...field}
                  ref={(e) => {
                    field.ref(e);
                    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                  }}
                  value={field.value || ""}
                  placeholder={showPreview ? "" : t("Add payment instructions, terms, or other notes...")}
                  rows={5}
                  className={cn("resize-y", showPreview && "text-transparent caret-transparent")}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
                {showPreview && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-start overflow-hidden rounded-md border border-input bg-background px-3 py-2 shadow-xs">
                    <div className="w-full whitespace-pre-wrap text-base md:text-sm">{preview}</div>
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
}: {
  control: AnyControl;
  t: (key: string) => string;
  entity?: Entity | null;
  document?: Partial<Invoice | Estimate> | null;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <FormField
      control={control}
      name="payment_terms"
      render={({ field }) => {
        const hasContent = field.value;
        const showPreview = !isFocused && hasContent && entity;
        const preview = showPreview ? replaceTemplateVariablesForPreview(field.value || "", entity, document) : null;

        return (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>{t("Payment Terms")}</FormLabel>
              <SmartCodeInsertButton
                textareaRef={textareaRef}
                value={field.value || ""}
                onInsert={(newValue) => field.onChange(newValue)}
                t={t}
              />
            </div>
            <FormControl>
              <div className="relative">
                <Textarea
                  {...field}
                  ref={(e) => {
                    field.ref(e);
                    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                  }}
                  value={field.value || ""}
                  placeholder={showPreview ? "" : t("Add payment terms...")}
                  rows={3}
                  className={cn("resize-y", showPreview && "text-transparent caret-transparent")}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
                {showPreview && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-start overflow-hidden rounded-md border border-input bg-background px-3 py-2 shadow-xs">
                    <div className="w-full whitespace-pre-wrap text-base md:text-sm">{preview}</div>
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
