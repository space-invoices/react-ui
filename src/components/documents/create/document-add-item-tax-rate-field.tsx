import type { Tax } from "@spaceinvoices/js-sdk";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import type { Control } from "react-hook-form";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/ui/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { useListTaxes } from "../../taxes/taxes.hooks";

/**
 * Get the current active rate from a tax (most recent rate by valid_from)
 */
function getCurrentRate(tax: Tax): number {
  if (!tax.tax_rates || tax.tax_rates.length === 0) {
    return 0;
  }
  // Sort by valid_from descending and get the first (most recent)
  const sorted = [...tax.tax_rates].sort((a, b) => {
    const dateA = a.valid_from ? new Date(a.valid_from).getTime() : 0;
    const dateB = b.valid_from ? new Date(b.valid_from).getTime() : 0;
    return dateB - dateA;
  });
  return sorted[0].rate;
}

type DocumentAddItemTaxRateFieldProps = {
  index: number;
  taxIndex: number;
  control: Control<any>;
  entityId: string;
  onRemove: () => void;
  onAddNewTax?: () => void;
  showLabel?: boolean;
} & ComponentTranslationProps;

export default function DocumentAddItemTaxRateField({
  index,
  taxIndex,
  control,
  entityId,
  onRemove,
  onAddNewTax,
  showLabel = true,
  t,
}: DocumentAddItemTaxRateFieldProps) {
  const translate = t || ((key: string) => key);
  const { setValue } = useFormContext();

  // Fetch available taxes
  const { data: taxesResponse } = useListTaxes(entityId);
  const taxes = taxesResponse?.data || [];

  // Watch current selection
  const selectedTaxId = useWatch({
    control,
    name: `items.${index}.taxes.${taxIndex}.tax_id`,
  });

  // Auto-select default tax (or first tax) when taxes are loaded and no selection exists
  useEffect(() => {
    if (taxes.length > 0 && !selectedTaxId) {
      // Prefer the default tax, fallback to first tax
      const defaultTax = taxes.find((tax) => tax.is_default) || taxes[0];
      setValue(`items.${index}.taxes.${taxIndex}.tax_id`, defaultTax.id);
    }
  }, [taxes, selectedTaxId, setValue, index, taxIndex]);

  // Handle tax selection - only store tax_id, API resolves rate
  const handleSelect = (value: string) => {
    if (value === "__create__") {
      onAddNewTax?.();
      return;
    }

    setValue(`items.${index}.taxes.${taxIndex}.tax_id`, value);
  };

  // Get display label for selected tax
  const selectedTax = taxes.find((t) => t.id === selectedTaxId);

  return (
    <FormField
      control={control}
      name={`items.${index}.taxes.${taxIndex}.tax_id`}
      render={({ field }) => (
        <FormItem>
          {showLabel && <FormLabel>{translate("Tax")}</FormLabel>}
          <div className="flex items-center gap-1">
            <FormControl className="min-w-0 flex-1">
              <Select value={field.value ?? ""} onValueChange={handleSelect}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="Tax">{selectedTax ? `${getCurrentRate(selectedTax)}%` : null}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {taxes.map((tax) => (
                    <SelectItem key={tax.id} value={tax.id}>
                      {tax.name} {getCurrentRate(tax)}%
                    </SelectItem>
                  ))}
                  {onAddNewTax && (
                    <SelectItem value="__create__">
                      <Plus className="size-4" />
                      {translate("Add...")}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </FormControl>
            <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="h-9 w-9 shrink-0">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
