import type { Tax } from "@spaceinvoices/js-sdk";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/ui/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

import { useListTaxes } from "./taxes.hooks";

const translations = {
  en: {
    Tax: "Tax",
    "Add...": "Add...",
  },
} as const;

/**
 * Get the current active rate from a tax (most recent rate by valid_from)
 */
export function getCurrentRate(tax: Tax): number {
  if (!tax.tax_rates || tax.tax_rates.length === 0) {
    return 0;
  }

  const sorted = [...tax.tax_rates].sort((a, b) => {
    const dateA = a.valid_from ? new Date(a.valid_from).getTime() : 0;
    const dateB = b.valid_from ? new Date(b.valid_from).getTime() : 0;
    return dateB - dateA;
  });

  return sorted[0].rate;
}

type TaxSelectFieldProps = {
  name: string;
  control: any;
  entityId: string;
  onRemove?: () => void;
  onAddNewTax?: () => void;
  showLabel?: boolean;
  disabled?: boolean;
} & ComponentTranslationProps;

export default function TaxSelectField({
  name,
  control,
  entityId,
  onRemove,
  onAddNewTax,
  showLabel = true,
  disabled = false,
  t: translateFn,
  namespace,
  locale,
  translationLocale,
}: TaxSelectFieldProps) {
  const translate = createTranslation({ t: translateFn, namespace, locale, translationLocale, translations });
  const { setValue } = useFormContext();
  const { data: taxesResponse } = useListTaxes(entityId);
  const taxes = taxesResponse?.data || [];

  const selectedTaxId = useWatch({
    control,
    name,
  });

  useEffect(() => {
    if (disabled || taxes.length === 0 || selectedTaxId) {
      return;
    }

    const defaultTax = taxes.find((tax) => tax.is_default) || taxes[0];
    setValue(name, defaultTax.id, { shouldDirty: true, shouldTouch: true });
  }, [disabled, name, selectedTaxId, setValue, taxes]);

  const handleSelect = (value: string) => {
    if (value === "__create__") {
      onAddNewTax?.();
      return;
    }

    setValue(name, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  const selectedTax = taxes.find((tax) => tax.id === selectedTaxId);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {showLabel && <FormLabel>{translate("Tax")}</FormLabel>}
          <div className="flex items-center gap-1">
            <FormControl className="min-w-0 flex-1">
              <Select value={field.value ?? ""} onValueChange={handleSelect}>
                <SelectTrigger size="sm" className="w-full" disabled={disabled}>
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
            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRemove}
                className="h-9 w-9 shrink-0"
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
