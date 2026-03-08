/**
 * Shared document items section for invoices and estimates
 * Handles: item management (add, remove, reorder)
 */
import { PlusIcon, SeparatorHorizontal } from "lucide-react";
import type { MutableRefObject } from "react";
import type { UseFormGetValues, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Button } from "@/ui/components/ui/button";
import DocumentAddItemForm from "./document-add-item-form";
import type { AnyControl } from "./form-types";

/** Map of item index to gross price mode */
export type PriceModesMap = Record<number, boolean>;

function reindexPriceModes(priceModes: PriceModesMap, nextLength: number): PriceModesMap {
  const reindexed: PriceModesMap = {};
  for (let index = 0; index < nextLength; index += 1) {
    reindexed[index] = priceModes[index] ?? false;
  }
  return reindexed;
}

type DocumentItemsSectionProps = {
  control: AnyControl;

  watch: UseFormWatch<any>;

  setValue: UseFormSetValue<any>;

  getValues: UseFormGetValues<any>;
  entityId: string;
  currencyCode?: string;
  onAddNewTax?: () => void;
  t: (key: string) => string;
  /** When true, tax controls are disabled (e.g., for VIES reverse charge) */
  taxesDisabled?: boolean;
  /** Message to show when taxes are disabled */
  taxesDisabledMessage?: string;
  /** Maximum number of taxes per item, derived from country rules. Defaults to 1. */
  maxTaxesPerItem?: number;
  /** Ref to collect price modes per item (for submit transformation) */
  priceModesRef?: MutableRefObject<PriceModesMap>;
  /** Initial price modes (from duplicated document) */
  initialPriceModes?: PriceModesMap;
  /** Called when item ordering or price mode changes outside normal field edits. */
  onItemsStateChange?: () => void;
};

export function DocumentItemsSection({
  control,
  watch,
  setValue,
  getValues,
  entityId,
  currencyCode,
  onAddNewTax,
  t,
  taxesDisabled,
  taxesDisabledMessage,
  maxTaxesPerItem,
  priceModesRef,
  initialPriceModes = {},
  onItemsStateChange,
}: DocumentItemsSectionProps) {
  const { fields, append, remove, move } = useFieldArray({
    control: control as any,
    name: "items",
  });

  const syncPriceModes = (updater: (current: PriceModesMap) => PriceModesMap) => {
    if (!priceModesRef) return;
    priceModesRef.current = updater(priceModesRef.current ?? {});
  };

  const addItem = () => {
    append({
      name: "",
      description: "",
      quantity: 1,
      price: undefined,
      taxes: [],
    });
    syncPriceModes((current) => ({ ...current, [fields.length]: false }));
    onItemsStateChange?.();
  };

  const addSeparator = () => {
    append({
      type: "separator",
      name: "",
      description: "",
    });
    syncPriceModes((current) => ({ ...current, [fields.length]: false }));
    onItemsStateChange?.();
  };

  const removeItem = (index: number) => {
    remove(index);
    syncPriceModes((current) => {
      const next: PriceModesMap = {};
      let nextIndex = 0;
      for (let currentIndex = 0; currentIndex < fields.length; currentIndex += 1) {
        if (currentIndex === index) continue;
        next[nextIndex] = current[currentIndex] ?? false;
        nextIndex += 1;
      }
      return next;
    });
    onItemsStateChange?.();
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    move(index, index - 1);
    syncPriceModes((current) => {
      const next = reindexPriceModes(current, fields.length);
      [next[index], next[index - 1]] = [next[index - 1], next[index]];
      return next;
    });
    onItemsStateChange?.();
  };

  const moveItemDown = (index: number) => {
    if (index === fields.length - 1) return;
    move(index, index + 1);
    syncPriceModes((current) => {
      const next = reindexPriceModes(current, fields.length);
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    onItemsStateChange?.();
  };

  const items = watch("items") || fields;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold text-xl">{t("Items")}</h2>

      {fields.map((field, index: number) => (
        <div key={field.id}>
          <DocumentAddItemForm
            form={{ control, watch, setValue, getValues } as any}
            index={index}
            control={control}
            entityId={entityId}
            currencyCode={currencyCode}
            onRemove={() => removeItem(index)}
            onMoveUp={() => moveItemUp(index)}
            onMoveDown={() => moveItemDown(index)}
            onAddNewTax={onAddNewTax}
            showRemove={items.length > 1}
            showMoveUp={index > 0}
            showMoveDown={index < items.length - 1}
            t={t}
            taxesDisabled={taxesDisabled}
            taxesDisabledMessage={taxesDisabledMessage}
            maxTaxesPerItem={maxTaxesPerItem}
            initialIsGrossPrice={priceModesRef?.current[index] ?? initialPriceModes[index] ?? false}
            onPriceModeChange={(isGross) => {
              if (priceModesRef) {
                priceModesRef.current[index] = isGross;
              }
              onItemsStateChange?.();
            }}
          />
        </div>
      ))}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={addItem} className="flex-1 cursor-pointer border-dashed">
          <PlusIcon className="mr-2 h-4 w-4" /> {t("Add item")}
        </Button>
        <Button type="button" variant="ghost" onClick={addSeparator} className="cursor-pointer text-muted-foreground">
          <SeparatorHorizontal className="mr-2 h-4 w-4" /> {t("Add separator")}
        </Button>
      </div>
    </div>
  );
}
