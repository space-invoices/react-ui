import { normalizeEInvoicingUnitCodeOverride } from "@space-invoices/e-invoicing/unit-codes";
import type { Item, Tax } from "@spaceinvoices/js-sdk";
import { ChevronDown, ChevronUp, DollarSign, FileCode2, Minus, Percent, Plus, PlusIcon, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWatch } from "react-hook-form";

import { Combobox, type ComboboxOption } from "@/ui/components/combobox";
import { ContentLocaleButton } from "@/ui/components/document-content-translations";
import { ItemCombobox } from "@/ui/components/items/item-combobox";
import TaxSelectField from "@/ui/components/taxes/tax-select-field";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { Textarea } from "@/ui/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { getEntityCountryCapabilities } from "@/ui/lib/country-capabilities";
import {
  DEFAULT_CONTENT_LOCALE,
  type DocumentContentLocaleMode,
  readLocalizedValue,
  writeLocalizedValue,
} from "@/ui/lib/document-content-translations";
import { NumericInput } from "@/ui/lib/numeric-input";
import { cn } from "@/ui/lib/utils";
import { useEntities } from "@/ui/providers/entities-context";
import { buildCustomItemNameUpdate, buildSelectedItemState } from "./document-item-state";
import { MarkdownTextareaToolbar } from "./markdown-textarea-toolbar";

type DocumentAddItemFormProps = {
  index: number;
  control: any;
  documentType?: "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";
  entityId: string;
  currencyCode?: string;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddNewTax?: () => void;
  onFindEstimatedTax?: () => Promise<Tax | null | undefined> | Tax | null | undefined;
  showRemove: boolean;
  showMoveUp: boolean;
  showMoveDown: boolean;
  form: any;
  t: (key: string) => string;
  /** When true, tax controls are disabled (e.g., for VIES reverse charge) */
  taxesDisabled?: boolean;
  /** Message to show when taxes are disabled */
  taxesDisabledMessage?: string;
  /** Maximum number of taxes per item, derived from country rules. Defaults to 1. */
  maxTaxesPerItem?: number;
  /** Initial gross price mode (from duplicated document) */
  initialIsGrossPrice?: boolean;
  /** Called when price mode changes - used to collect state at submit */
  onPriceModeChange?: (isGross: boolean) => void;
  locale?: string;
  translationsEnabled?: boolean;
  contentLocale?: DocumentContentLocaleMode;
  defaultContentLocale?: string | null;
  onContentLocaleChange?: (locale: DocumentContentLocaleMode) => void;
};

const E_INVOICING_UNIT_CODE_OPTIONS: ComboboxOption[] = [
  { value: "E48", label: "E48 - service" },
  { value: "C62", label: "C62 - unit/piece" },
  { value: "DAY", label: "DAY - day" },
  { value: "HUR", label: "HUR - hour" },
  { value: "MON", label: "MON - month" },
  { value: "MIN", label: "MIN - minute" },
  { value: "KGM", label: "KGM - kilogram" },
  { value: "GRM", label: "GRM - gram" },
  { value: "MGM", label: "MGM - milligram" },
  { value: "LTR", label: "LTR - litre" },
  { value: "MLT", label: "MLT - millilitre" },
  { value: "MTR", label: "MTR - metre" },
  { value: "MTK", label: "MTK - square metre" },
  { value: "MTQ", label: "MTQ - cubic metre" },
  { value: "SET", label: "SET - set" },
];

const CLEAR_E_INVOICING_UNIT_CODE_OPTION: ComboboxOption = {
  value: "__clear__",
  label: "Clear unit code",
};

function getEInvoicingUnitCodeLabel(value: string | null | undefined): string | undefined {
  const normalizedValue = normalizeEInvoicingUnitCodeOverride(value, "peppol");
  if (!normalizedValue) return undefined;
  return E_INVOICING_UNIT_CODE_OPTIONS.find((option) => option.value === normalizedValue)?.label ?? normalizedValue;
}

type EInvoicingUnitCodeComboboxProps = {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  t: (key: string) => string;
  disabled?: boolean;
};

function EInvoicingUnitCodeCombobox({ value, onValueChange, t, disabled }: EInvoicingUnitCodeComboboxProps) {
  const [search, setSearch] = useState("");
  const normalizedValue = normalizeEInvoicingUnitCodeOverride(value, "peppol");

  const options = useMemo(() => {
    const query = search.trim().toUpperCase();
    const normalizedCustomCode = normalizeEInvoicingUnitCodeOverride(query, "peppol");
    const matchingOptions = E_INVOICING_UNIT_CODE_OPTIONS.filter((option) =>
      `${option.value} ${option.label}`.toUpperCase().includes(query),
    );
    const nextOptions = normalizedValue
      ? [{ ...CLEAR_E_INVOICING_UNIT_CODE_OPTION, label: t("Clear unit code") }, ...matchingOptions]
      : matchingOptions;

    if (
      normalizedCustomCode &&
      !nextOptions.some((option) => option.value === normalizedCustomCode) &&
      (!query || normalizedCustomCode.includes(query))
    ) {
      nextOptions.unshift({ value: normalizedCustomCode, label: `${normalizedCustomCode} - ${t("custom code")}` });
    }

    if (normalizedValue && !nextOptions.some((option) => option.value === normalizedValue)) {
      nextOptions.unshift({
        value: normalizedValue,
        label: getEInvoicingUnitCodeLabel(normalizedValue) ?? normalizedValue,
      });
    }

    return nextOptions;
  }, [normalizedValue, search, t]);

  return (
    <Combobox
      options={options}
      value={normalizedValue ?? ""}
      selectedLabel={getEInvoicingUnitCodeLabel(normalizedValue)}
      placeholder={t("Select XML unit code")}
      emptyText={t("Enter a supported UN/ECE code")}
      disabled={disabled}
      onSearch={setSearch}
      onValueChange={(nextValue) => {
        onValueChange(nextValue === CLEAR_E_INVOICING_UNIT_CODE_OPTION.value ? null : nextValue);
        setSearch("");
      }}
    />
  );
}

type EInvoicingUnitCodeControlProps = {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  hasError?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  t: (key: string) => string;
};

function EInvoicingUnitCodeControl({
  value,
  onValueChange,
  hasError,
  errorMessage,
  disabled,
  t,
}: EInvoicingUnitCodeControlProps) {
  const [open, setOpen] = useState(false);
  const normalizedValue = normalizeEInvoicingUnitCodeOverride(value, "peppol");
  const tooltip = normalizedValue
    ? `${t("E-invoicing unit settings")}: ${normalizedValue}`
    : t("E-invoicing unit settings");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                "ml-1",
                normalizedValue && "text-primary-readable",
                hasError && "text-destructive hover:text-destructive",
              )}
              aria-label={tooltip}
              aria-invalid={hasError || undefined}
            >
              <FileCode2 className="size-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 gap-3 p-3" align="end">
        <div className="space-y-1">
          <FormLabel>{t("E-invoicing unit code")}</FormLabel>
          <p className="text-muted-foreground text-xs">
            {t("Only affects e-invoicing XML. The document unit stays unchanged.")}
          </p>
        </div>
        <EInvoicingUnitCodeCombobox
          value={value}
          disabled={disabled}
          onValueChange={(nextValue) => {
            onValueChange(nextValue);
            setOpen(false);
          }}
          t={t}
        />
        {errorMessage && <p className="text-destructive text-xs">{errorMessage}</p>}
      </PopoverContent>
    </Popover>
  );
}

// NumericInput / parseNumericFormValue moved to the shared @/ui/lib/numeric-input module.

export default function DocumentAddItemForm({
  index,
  control,
  documentType,
  entityId,
  currencyCode: _currencyCode,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddNewTax,
  onFindEstimatedTax,
  showRemove,
  showMoveUp,
  showMoveDown,
  form,
  t,
  taxesDisabled,
  taxesDisabledMessage,
  maxTaxesPerItem = 1,
  initialIsGrossPrice = false,
  onPriceModeChange,
  locale = "en",
  translationsEnabled = false,
  contentLocale = DEFAULT_CONTENT_LOCALE,
  defaultContentLocale,
  onContentLocaleChange,
}: DocumentAddItemFormProps) {
  const { activeEntity } = useEntities();
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const countryCapabilities = getEntityCountryCapabilities(activeEntity);
  const itemType = useWatch({
    control,
    name: `items.${index}.type`,
  });
  const isSeparator = itemType === "separator";
  const selectedSavedItemId = useWatch({
    control,
    name: `items.${index}.item_id`,
  });
  const itemClassification = useWatch({
    control,
    name: `items.${index}.classification`,
  });
  const unitCodeFieldName = `items.${index}.e_invoicing.unit_code`;
  const itemEInvoicingUnitCode = useWatch({
    control,
    name: unitCodeFieldName,
  });
  const lockPortugalSavedItemFields = countryCapabilities.isPortugal && !!selectedSavedItemId;
  const unitCodeFieldState = form?.getFieldState?.(unitCodeFieldName, form.formState);
  const hasEInvoicingUnitCodeError = !!unitCodeFieldState?.error;
  const showEInvoicingUnitCodeControl =
    countryCapabilities.hasEInvoicing ||
    countryCapabilities.hasEslog ||
    !!itemEInvoicingUnitCode ||
    hasEInvoicingUnitCodeError;

  const taxes = useWatch({
    control,
    name: `items.${index}.taxes`,
  });
  const itemTranslations = useWatch({
    control,
    name: `items.${index}.translations`,
  });
  // Component-local state for gross/net price mode (not in form schema)
  const [isGrossPrice, setIsGrossPrice] = useState(initialIsGrossPrice);

  useEffect(() => {
    setIsGrossPrice(initialIsGrossPrice);
  }, [initialIsGrossPrice]);

  useEffect(() => {
    if (countryCapabilities.isPortugal && documentType === "advance_invoice" && !itemClassification) {
      form.setValue(`items.${index}.classification`, "advance", { shouldDirty: true, shouldTouch: true });
    }
  }, [countryCapabilities.isPortugal, documentType, form, index, itemClassification]);

  const setPriceMode = (mode: string) => {
    const isGross = mode === "gross";
    setIsGrossPrice(isGross);
    onPriceModeChange?.(isGross);
  };

  const addTax = () => {
    const currentTaxes = taxes || [];
    if (currentTaxes.length >= maxTaxesPerItem) return;

    form.setValue(
      `items.${index}.taxes`,
      [
        ...currentTaxes,
        {
          rate: 22,
        },
      ],
      { shouldDirty: true, shouldTouch: true },
    );
  };

  const removeTax = (taxIndex: number) => {
    const currentTaxes = taxes || [];
    form.setValue(
      `items.${index}.taxes`,
      currentTaxes.filter((_: any, i: number) => i !== taxIndex),
      { shouldDirty: true, shouldTouch: true },
    );
  };

  const setInlineItemName = (nextName: string) => {
    if (!translationsEnabled || contentLocale === DEFAULT_CONTENT_LOCALE) {
      form.setValue(`items.${index}.name`, nextName, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      return;
    }

    form.setValue(
      `items.${index}.translations`,
      {
        ...(form.getValues(`items.${index}.translations`) ?? {}),
        name: writeLocalizedValue(itemTranslations?.name, contentLocale, nextName),
      },
      { shouldDirty: true, shouldTouch: true },
    );
  };

  // Handle item selection from combobox
  const handleItemSelect = (item: Item | null, customName?: string) => {
    const itemIdPath = `items.${index}.item_id`;
    const itemNamePath = `items.${index}.name`;
    const itemTranslationsPath = `items.${index}.translations`;
    const itemTaxesPath = `items.${index}.taxes`;
    const rowValidationPaths = [
      itemNamePath,
      `items.${index}.quantity`,
      `items.${index}.price`,
      itemTaxesPath,
    ] as const;
    if (item) {
      const nextItemState = buildSelectedItemState(item);
      Object.entries(nextItemState.values).forEach(([fieldName, fieldValue]) => {
        form.setValue(`items.${index}.${fieldName}`, fieldValue, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: fieldName === "name" || fieldName === "price",
        });
      });

      if (!("description" in nextItemState.values)) {
        form.setValue(`items.${index}.description`, undefined, { shouldDirty: true, shouldTouch: true });
      }
      setIsGrossPrice(nextItemState.isGrossPrice);
      onPriceModeChange?.(nextItemState.isGrossPrice);

      form.clearErrors(rowValidationPaths as any);
      if (form.formState.isSubmitted) {
        void form.trigger();
      }
    } else if (customName) {
      const customItemState = buildCustomItemNameUpdate({
        customName,
        translationsEnabled,
        contentLocale,
        currentTranslations: form.getValues(itemTranslationsPath) ?? {},
        itemTranslations,
      });
      form.setValue(itemIdPath, customItemState.item_id, { shouldDirty: true, shouldTouch: true });
      if ("name" in customItemState) {
        form.setValue(itemNamePath, customItemState.name, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
      if ("translations" in customItemState) {
        form.setValue(itemTranslationsPath, customItemState.translations, { shouldDirty: true, shouldTouch: true });
      }
      form.clearErrors(itemNamePath);
      if (form.formState.isSubmitted) {
        void form.trigger();
      }
    }
  };

  if (isSeparator) {
    return (
      <div className="space-y-4 rounded-lg border border-muted-foreground/50 border-dashed p-4">
        {/* Header row with name and remove button */}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <FormField
              control={control}
              name={`items.${index}.name`}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-muted-foreground text-xs">{t("Section header")}</FormLabel>
                    {translationsEnabled && onContentLocaleChange && (
                      <ContentLocaleButton
                        activeLocale={contentLocale}
                        defaultLocale={defaultContentLocale}
                        onChange={onContentLocaleChange}
                        uiLocale={locale}
                        t={t}
                      />
                    )}
                  </div>
                  <FormControl>
                    <Input
                      placeholder={t("Section title...")}
                      name={field.name}
                      ref={field.ref}
                      value={readLocalizedValue(field.value, itemTranslations?.name, contentLocale)}
                      onBlur={field.onBlur}
                      onChange={(event) => {
                        if (!translationsEnabled || contentLocale === DEFAULT_CONTENT_LOCALE) {
                          field.onChange(event.target.value);
                          return;
                        }
                        form.setValue(
                          `items.${index}.translations`,
                          {
                            ...(form.getValues(`items.${index}.translations`) ?? {}),
                            name: writeLocalizedValue(itemTranslations?.name, contentLocale, event.target.value),
                          },
                          { shouldDirty: true, shouldTouch: true },
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {showRemove && (
            <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="mt-6">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Description and move buttons */}
        <div className="flex gap-4">
          <div className="flex-1">
            <FormField
              control={control}
              name={`items.${index}.description`}
              render={({ field }) => {
                const visibleDescription = readLocalizedValue(
                  field.value,
                  itemTranslations?.description,
                  contentLocale,
                );
                const setDescription = (nextDescription: string) => {
                  if (!translationsEnabled || contentLocale === DEFAULT_CONTENT_LOCALE) {
                    field.onChange(nextDescription);
                    return;
                  }
                  form.setValue(
                    `items.${index}.translations`,
                    {
                      ...(form.getValues(`items.${index}.translations`) ?? {}),
                      description: writeLocalizedValue(itemTranslations?.description, contentLocale, nextDescription),
                    },
                    { shouldDirty: true, shouldTouch: true },
                  );
                };

                return (
                  <FormItem>
                    <div className="mb-1 flex justify-end gap-2">
                      <MarkdownTextareaToolbar
                        textareaRef={descriptionTextareaRef}
                        value={visibleDescription || ""}
                        onChange={setDescription}
                        t={t}
                      />
                      {translationsEnabled && onContentLocaleChange && (
                        <ContentLocaleButton
                          activeLocale={contentLocale}
                          defaultLocale={defaultContentLocale}
                          onChange={onContentLocaleChange}
                          uiLocale={locale}
                          t={t}
                        />
                      )}
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder={t("Description")}
                        name={field.name}
                        ref={(element) => {
                          if (typeof field.ref === "function") {
                            field.ref(element);
                          }
                          descriptionTextareaRef.current = element;
                        }}
                        value={visibleDescription}
                        onBlur={field.onBlur}
                        onChange={(event) => setDescription(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>

          {(showMoveUp || showMoveDown) && (
            <div className="flex flex-col gap-2">
              {showMoveUp && (
                <Button type="button" variant="ghost" size="icon" onClick={onMoveUp} className="mt-auto">
                  <ChevronUp className="h-4 w-4" />
                </Button>
              )}
              {showMoveDown && (
                <Button type="button" variant="ghost" size="icon" onClick={onMoveDown} className="mt-auto">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {/* Header row with name and remove button */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <FormField
            control={control}
            name={`items.${index}.name`}
            render={({ field, fieldState }) => (
              <FormItem>
                <div className="mb-1 flex justify-end">
                  {translationsEnabled && onContentLocaleChange && (
                    <ContentLocaleButton
                      activeLocale={contentLocale}
                      defaultLocale={defaultContentLocale}
                      onChange={onContentLocaleChange}
                      disabled={lockPortugalSavedItemFields}
                      uiLocale={locale}
                      t={t}
                    />
                  )}
                </div>
                <FormControl>
                  <ItemCombobox
                    entityId={entityId}
                    value={readLocalizedValue(field.value, itemTranslations?.name, contentLocale)}
                    onSelect={handleItemSelect}
                    onCommitInlineName={setInlineItemName}
                    onInlineInputChange={setInlineItemName}
                    commitOnBlurMode={
                      readLocalizedValue(field.value, itemTranslations?.name, contentLocale)
                        ? "update-inline"
                        : "create"
                    }
                    placeholder="Search or enter item name..."
                    inputTestId={`document-item-input-${index}`}
                    inputDataDemo={`marketing-demo-item-name-${index}`}
                    t={t}
                    locale={locale}
                    disabled={lockPortugalSavedItemFields}
                    ariaInvalid={!!fieldState.error}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {countryCapabilities.isPortugal && (
          <div className="w-40">
            <FormField
              control={control}
              name={`items.${index}.classification`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t("Classification")}</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.value)}
                      disabled={lockPortugalSavedItemFields}
                    >
                      <option value="" disabled>
                        {t("Select classification")}
                      </option>
                      <option value="product" disabled={documentType === "advance_invoice"}>
                        {t("Product")}
                      </option>
                      <option value="service" disabled={documentType === "advance_invoice"}>
                        {t("Service")}
                      </option>
                      <option value="advance">{t("Advance")}</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {showRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Middle row with unit, quantity, price, discount */}
      <div className="pb-2">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-12">
          <FormField
            control={control}
            name={`items.${index}.quantity`}
            render={({ field }) => (
              <FormItem className="col-span-1 lg:col-span-2">
                <FormLabel>
                  {t("Quantity")} <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <NumericInput
                    data-demo={
                      index === 0
                        ? "marketing-demo-item-quantity-0"
                        : index === 1
                          ? "marketing-demo-item-quantity-1"
                          : undefined
                    }
                    {...field}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    inputLocale={locale}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`items.${index}.price`}
            render={({ field }) => (
              <FormItem className="col-span-1 lg:col-span-3">
                <FormLabel>
                  {isGrossPrice ? t("Gross price") : t("Price")} <span className="text-red-500">*</span>
                </FormLabel>
                <div className="flex">
                  <FormControl>
                    <NumericInput
                      className="rounded-r-none"
                      data-demo={
                        index === 0
                          ? "marketing-demo-item-price-0"
                          : index === 1
                            ? "marketing-demo-item-price-1"
                            : undefined
                      }
                      {...field}
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      inputLocale={locale}
                    />
                  </FormControl>
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" size="icon" className="rounded-l-none border-l-0">
                            {isGrossPrice ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {isGrossPrice ? t("Gross price (tax included)") : t("Net price (before tax)")}
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end">
                      <DropdownMenuRadioGroup value={isGrossPrice ? "gross" : "net"} onValueChange={setPriceMode}>
                        <DropdownMenuRadioItem value="net">{t("Net price")}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="gross">{t("Gross price")}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`items.${index}.unit`}
            render={({ field }) => (
              <FormItem className="col-span-1 gap-1 lg:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>{t("Unit")}</FormLabel>
                  {showEInvoicingUnitCodeControl && (
                    <FormField
                      control={control}
                      name={unitCodeFieldName}
                      render={({ field: unitCodeField }) => (
                        <EInvoicingUnitCodeControl
                          value={unitCodeField.value}
                          disabled={lockPortugalSavedItemFields}
                          hasError={hasEInvoicingUnitCodeError}
                          errorMessage={unitCodeFieldState?.error?.message}
                          onValueChange={unitCodeField.onChange}
                          t={t}
                        />
                      )}
                    />
                  )}
                </div>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} disabled={lockPortugalSavedItemFields} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`items.${index}.discounts`}
            render={({ field }) => {
              const discount = field.value?.[0] || { value: 0, type: "percent" };
              const isPercent = discount.type !== "amount";

              const setDiscount = (value: number | undefined, type: "percent" | "amount") => {
                field.onChange(value !== undefined ? [{ value, type }] : []);
              };

              const _toggleType = () => {
                setDiscount(discount.value, isPercent ? "amount" : "percent");
              };

              return (
                <FormItem className="col-span-1 lg:col-span-2">
                  <FormLabel>{t("Discount")}</FormLabel>
                  <div className="flex">
                    <FormControl>
                      <NumericInput
                        placeholder="0"
                        className="rounded-r-none"
                        value={discount.value || ""}
                        onValueChange={(nextValue) =>
                          setDiscount(typeof nextValue === "number" ? nextValue : undefined, discount.type || "percent")
                        }
                        inputLocale={locale}
                      />
                    </FormControl>
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="icon" className="rounded-l-none border-l-0">
                              {isPercent ? <Percent className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {isPercent ? t("Percentage discount") : t("Fixed amount discount")}
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDiscount(discount.value, "percent")}>
                          <Percent className="mr-2 h-4 w-4" />
                          {t("Percentage")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDiscount(discount.value, "amount")}>
                          <DollarSign className="mr-2 h-4 w-4" />
                          {t("Fixed amount")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <div className="col-span-2 space-y-2 lg:col-span-3">
            <FormLabel>{t("Tax")}</FormLabel>
            {taxesDisabled ? (
              <div className="rounded-md border border-muted-foreground/50 border-dashed bg-muted/50 p-2 text-muted-foreground text-sm">
                {taxesDisabledMessage || t("Taxes disabled")}
              </div>
            ) : (
              <>
                {taxes?.map((_tax: any, taxIndex: number) => (
                  <TaxSelectField
                    // biome-ignore lint/suspicious/noArrayIndexKey: index is stable
                    key={taxIndex}
                    name={`items.${index}.taxes.${taxIndex}.tax_id`}
                    control={control}
                    entityId={entityId}
                    onRemove={() => removeTax(taxIndex)}
                    onAddNewTax={onAddNewTax}
                    onFindEstimatedTax={onFindEstimatedTax}
                    showLabel={false}
                    t={t}
                  />
                ))}

                {(!taxes || taxes.length < maxTaxesPerItem) && (
                  <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={addTax}>
                    <PlusIcon className="h-4 w-4" />
                    {t("Add tax")}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row with description and move buttons */}
      <div className="flex gap-4">
        <div className="flex-1">
          <FormField
            control={control}
            name={`items.${index}.description`}
            render={({ field }) => {
              const visibleDescription = readLocalizedValue(field.value, itemTranslations?.description, contentLocale);
              const setDescription = (nextDescription: string) => {
                if (lockPortugalSavedItemFields) return;
                if (!translationsEnabled || contentLocale === DEFAULT_CONTENT_LOCALE) {
                  field.onChange(nextDescription);
                  return;
                }
                form.setValue(
                  `items.${index}.translations`,
                  {
                    ...(form.getValues(`items.${index}.translations`) ?? {}),
                    description: writeLocalizedValue(itemTranslations?.description, contentLocale, nextDescription),
                  },
                  { shouldDirty: true, shouldTouch: true },
                );
              };

              return (
                <FormItem>
                  <div className="mb-1 flex justify-end gap-2">
                    <MarkdownTextareaToolbar
                      textareaRef={descriptionTextareaRef}
                      value={visibleDescription || ""}
                      onChange={setDescription}
                      t={t}
                      disabled={lockPortugalSavedItemFields}
                    />
                    {translationsEnabled && onContentLocaleChange && (
                      <ContentLocaleButton
                        activeLocale={contentLocale}
                        defaultLocale={defaultContentLocale}
                        onChange={onContentLocaleChange}
                        disabled={lockPortugalSavedItemFields}
                        uiLocale={locale}
                        t={t}
                      />
                    )}
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder={t("Description")}
                      name={field.name}
                      ref={(element) => {
                        if (typeof field.ref === "function") {
                          field.ref(element);
                        }
                        descriptionTextareaRef.current = element;
                      }}
                      value={visibleDescription}
                      disabled={lockPortugalSavedItemFields}
                      onBlur={field.onBlur}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        {(showMoveUp || showMoveDown) && (
          <div className="flex flex-col gap-2">
            {showMoveUp && (
              <Button type="button" variant="ghost" size="icon" onClick={onMoveUp} className="mt-auto">
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            {showMoveDown && (
              <Button type="button" variant="ghost" size="icon" onClick={onMoveDown} className="mt-auto">
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
