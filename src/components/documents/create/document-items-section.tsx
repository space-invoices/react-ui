/**
 * Shared document items section for invoices and estimates
 * Handles: item management (add, remove, reorder)
 */
import { PlusIcon } from "lucide-react";
import type { MutableRefObject } from "react";
import type { UseFormGetValues, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Button } from "@/ui/components/ui/button";
import DocumentAddItemForm from "./document-add-item-form";
import type { AnyControl } from "./form-types";

/** Map of item index to gross price mode */
export type PriceModesMap = Record<number, boolean>;

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
}: DocumentItemsSectionProps) {
  const addItem = () => {
    const currentItems = getValues("items") || [];
    setValue("items", [
      ...currentItems,
      {
        name: "",
        description: "",
        quantity: 1,
        price: undefined,
        taxes: [],
      },
    ]);
  };

  const removeItem = (index: number) => {
    const currentItems = getValues("items") || [];
    setValue(
      "items",
      currentItems.filter((_: unknown, i: number) => i !== index),
    );
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const items = getValues("items");
    const newItems = [...items];
    [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    setValue("items", newItems);
  };

  const moveItemDown = (index: number) => {
    const items = getValues("items");
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setValue("items", newItems);
  };

  const items = watch("items") || [];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold text-xl">{t("Items")}</h2>

      {items.map((_: unknown, index: number) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: index is stable
        <div key={index}>
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
            initialIsGrossPrice={initialPriceModes[index] ?? false}
            onPriceModeChange={(isGross) => {
              if (priceModesRef) {
                priceModesRef.current[index] = isGross;
              }
            }}
          />
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addItem} className="w-full cursor-pointer border-dashed">
        <PlusIcon className="mr-2 h-4 w-4" /> {t("Add item")}
      </Button>
    </div>
  );
}
