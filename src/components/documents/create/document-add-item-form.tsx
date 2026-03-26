import type { Item } from "@spaceinvoices/js-sdk";
import { ChevronDown, ChevronUp, DollarSign, Minus, Percent, Plus, PlusIcon, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Control, UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";

import { ItemCombobox } from "@/ui/components/items/item-combobox";
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
import { Textarea } from "@/ui/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { getEntityCountryCapabilities } from "@/ui/lib/country-capabilities";
import { useEntities } from "@/ui/providers/entities-context";

import DocumentAddItemTaxRateField from "./document-add-item-tax-rate-field";

type DocumentAddItemFormProps = {
  index: number;
  control: Control<any>;
  documentType?: "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";
  entityId: string;
  currencyCode?: string;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddNewTax?: () => void;
  showRemove: boolean;
  showMoveUp: boolean;
  showMoveDown: boolean;
  form: UseFormReturn<any>;
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
};

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
}: DocumentAddItemFormProps) {
  const { activeEntity } = useEntities();
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
  const lockPortugalSavedItemFields = countryCapabilities.isPortugal && !!selectedSavedItemId;

  const taxes = useWatch({
    control,
    name: `items.${index}.taxes`,
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
    form.setValue(`items.${index}.name`, nextName, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  // Handle item selection from combobox
  const handleItemSelect = (item: Item | null, customName?: string) => {
    const itemIdPath = `items.${index}.item_id`;
    const itemNamePath = `items.${index}.name`;
    const itemQuantityPath = `items.${index}.quantity`;
    const itemPricePath = `items.${index}.price`;
    const itemDescriptionPath = `items.${index}.description`;
    const itemClassificationPath = `items.${index}.classification`;
    const itemTaxesPath = `items.${index}.taxes`;
    const rowValidationPaths = [itemNamePath, itemQuantityPath, itemPricePath, itemTaxesPath] as const;
    if (item) {
      // Selected a saved item - set item_id and prefill fields for visual feedback
      form.setValue(itemIdPath, item.id, { shouldDirty: true, shouldTouch: true });
      form.setValue(itemNamePath, item.name, { shouldDirty: true, shouldTouch: true, shouldValidate: true });

      // Prefill price (use gross_price if available, otherwise price)
      if (item.gross_price !== null && item.gross_price !== undefined) {
        form.setValue(itemPricePath, item.gross_price, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        setIsGrossPrice(true);
        onPriceModeChange?.(true);
      } else if (item.price !== null && item.price !== undefined) {
        form.setValue(itemPricePath, item.price, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        setIsGrossPrice(false);
        onPriceModeChange?.(false);
      }

      // Prefill description
      if (item.description) {
        form.setValue(itemDescriptionPath, item.description, { shouldDirty: true, shouldTouch: true });
      }

      if (item.classification) {
        form.setValue(itemClassificationPath, item.classification, { shouldDirty: true, shouldTouch: true });
      }

      // Prefill taxes from item's tax_ids (or clear if item has no taxes)
      if (item.tax_ids && item.tax_ids.length > 0) {
        form.setValue(
          itemTaxesPath,
          item.tax_ids.map((tax_id) => ({ tax_id })),
          { shouldDirty: true, shouldTouch: true },
        );
      } else {
        form.setValue(itemTaxesPath, [], { shouldDirty: true, shouldTouch: true });
      }

      form.clearErrors(rowValidationPaths as any);
      if (form.formState.isSubmitted) {
        void form.trigger();
      }
    } else if (customName) {
      // Custom name entered - clear item_id, just use the name
      form.setValue(itemIdPath, undefined, { shouldDirty: true, shouldTouch: true });
      form.setValue(itemNamePath, customName, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
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
                  <FormLabel className="text-muted-foreground text-xs">{t("Section header")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("Section title...")} {...field} />
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
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder={t("Description")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
                <FormControl>
                  <ItemCombobox
                    entityId={entityId}
                    value={field.value}
                    onSelect={handleItemSelect}
                    onCommitInlineName={setInlineItemName}
                    onInlineInputChange={setInlineItemName}
                    commitOnBlurMode={field.value ? "update-inline" : "create"}
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
                  <Input
                    type="number"
                    data-demo={
                      index === 0
                        ? "marketing-demo-item-quantity-0"
                        : index === 1
                          ? "marketing-demo-item-quantity-1"
                          : undefined
                    }
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
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
                    <Input
                      type="number"
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
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
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
              <FormItem className="col-span-1 lg:col-span-2">
                <FormLabel>{t("Unit")}</FormLabel>
                <FormControl>
                  <Input {...field} disabled={lockPortugalSavedItemFields} />
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
                      <Input
                        type="number"
                        placeholder="0"
                        className="rounded-r-none"
                        value={discount.value || ""}
                        onChange={(e) =>
                          setDiscount(e.target.value ? Number(e.target.value) : undefined, discount.type || "percent")
                        }
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
                  <DocumentAddItemTaxRateField
                    // biome-ignore lint/suspicious/noArrayIndexKey: index is stable
                    key={taxIndex}
                    index={index}
                    taxIndex={taxIndex}
                    control={control}
                    entityId={entityId}
                    onRemove={() => removeTax(taxIndex)}
                    onAddNewTax={onAddNewTax}
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
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea placeholder={t("Description")} {...field} disabled={lockPortugalSavedItemFields} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
