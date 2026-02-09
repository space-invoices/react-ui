import type { Item } from "@spaceinvoices/js-sdk";
import { ChevronDown, ChevronUp, DollarSign, Minus, Percent, Plus, PlusIcon, Trash2 } from "lucide-react";
import { useState } from "react";
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

import DocumentAddItemTaxRateField from "./document-add-item-tax-rate-field";

type DocumentAddItemFormProps = {
  index: number;
  control: Control<any>;
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
};

export default function DocumentAddItemForm({
  index,
  control,
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
}: DocumentAddItemFormProps) {
  const taxes = useWatch({
    control,
    name: `items.${index}.taxes`,
  });

  // Component-local state for gross/net price mode (not in form schema)
  const [isGrossPrice, setIsGrossPrice] = useState(initialIsGrossPrice);

  const setPriceMode = (mode: string) => {
    const isGross = mode === "gross";
    setIsGrossPrice(isGross);
    onPriceModeChange?.(isGross);
  };

  const addTax = () => {
    const currentTaxes = taxes || [];
    if (currentTaxes.length >= maxTaxesPerItem) return;

    form.setValue(`items.${index}.taxes`, [
      ...currentTaxes,
      {
        rate: 22,
      },
    ]);
  };

  const removeTax = (taxIndex: number) => {
    const currentTaxes = taxes || [];
    form.setValue(
      `items.${index}.taxes`,
      currentTaxes.filter((_: any, i: number) => i !== taxIndex),
    );
  };

  // Handle item selection from combobox
  const handleItemSelect = (item: Item | null, customName?: string) => {
    if (item) {
      // Selected a saved item - set item_id and prefill fields for visual feedback
      form.setValue(`items.${index}.item_id`, item.id);
      form.setValue(`items.${index}.name`, item.name);

      // Prefill price (use gross_price if available, otherwise price)
      if (item.gross_price !== null && item.gross_price !== undefined) {
        form.setValue(`items.${index}.price`, item.gross_price);
        setIsGrossPrice(true);
        onPriceModeChange?.(true);
      } else if (item.price !== null && item.price !== undefined) {
        form.setValue(`items.${index}.price`, item.price);
        setIsGrossPrice(false);
        onPriceModeChange?.(false);
      }

      // Prefill description
      if (item.description) {
        form.setValue(`items.${index}.description`, item.description);
      }

      // Prefill taxes from item's tax_ids (or clear if item has no taxes)
      if (item.tax_ids && item.tax_ids.length > 0) {
        form.setValue(
          `items.${index}.taxes`,
          item.tax_ids.map((tax_id) => ({ tax_id })),
        );
      } else {
        form.setValue(`items.${index}.taxes`, []);
      }
    } else if (customName) {
      // Custom name entered - clear item_id, just use the name
      form.setValue(`items.${index}.item_id`, undefined);
      form.setValue(`items.${index}.name`, customName);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {/* Header row with name and remove button */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <FormField
            control={control}
            name={`items.${index}.name`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <ItemCombobox
                    entityId={entityId}
                    value={field.value}
                    onSelect={handleItemSelect}
                    placeholder={t("Search or enter item name...")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {showRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Middle row with unit, quantity, price, discount */}
      <div className="grid w-full grid-cols-12 gap-4">
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>
                {t("Quantity")} <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`items.${index}.price`}
          render={({ field }) => (
            <FormItem className="col-span-3">
              <FormLabel>
                {isGrossPrice ? t("Gross price") : t("Price")} <span className="text-red-500">*</span>
              </FormLabel>
              <div className="flex">
                <FormControl>
                  <Input
                    type="number"
                    className="rounded-r-none"
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
            <FormItem className="col-span-2">
              <FormLabel>{t("Unit")}</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormItem className="col-span-2">
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

        <div className="col-span-3 space-y-2">
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

      {/* Bottom row with description and move buttons */}
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
