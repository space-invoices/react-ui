import type { Item } from "@spaceinvoices/js-sdk";

import {
  DEFAULT_CONTENT_LOCALE,
  type DocumentContentLocaleMode,
  type LocalizedContentMap,
  writeLocalizedValue,
} from "@/ui/lib/document-content-translations";

export type PriceModesMap = Record<number, boolean>;

type LocalizedFieldUpdateOptions = {
  translationsEnabled: boolean;
  contentLocale: DocumentContentLocaleMode;
  currentTranslations: Record<string, unknown> | undefined;
  existingLocalizedValue: LocalizedContentMap | null | undefined;
  field: "name" | "description";
  value: string;
};

type CustomItemNameUpdateOptions = {
  customName: string;
  translationsEnabled: boolean;
  contentLocale: DocumentContentLocaleMode;
  currentTranslations: Record<string, unknown> | undefined;
  itemTranslations: Record<string, unknown> | undefined;
};

function normalizeLocalizedContentMap(value: unknown): LocalizedContentMap | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export function buildLocalizedFieldUpdate({
  translationsEnabled,
  contentLocale,
  currentTranslations,
  existingLocalizedValue,
  field,
  value,
}: LocalizedFieldUpdateOptions): { name?: string; translations?: Record<string, unknown> } {
  if (!translationsEnabled || contentLocale === DEFAULT_CONTENT_LOCALE) {
    if (field === "name") {
      return { name: value };
    }

    return {
      translations: currentTranslations,
    };
  }

  return {
    translations: {
      ...(currentTranslations ?? {}),
      [field]: writeLocalizedValue(normalizeLocalizedContentMap(existingLocalizedValue), contentLocale, value),
    },
  };
}

export function buildCustomItemNameUpdate({
  customName,
  translationsEnabled,
  contentLocale,
  currentTranslations,
  itemTranslations,
}: CustomItemNameUpdateOptions): { item_id: undefined; name?: string; translations?: Record<string, unknown> } {
  const localizedUpdate = buildLocalizedFieldUpdate({
    translationsEnabled,
    contentLocale,
    currentTranslations,
    existingLocalizedValue: itemTranslations?.name as LocalizedContentMap | null | undefined,
    field: "name",
    value: customName,
  });

  return {
    item_id: undefined,
    ...localizedUpdate,
  };
}

export function buildSelectedItemState(item: Item): {
  values: Record<string, unknown>;
  isGrossPrice: boolean;
} {
  const hasGrossPrice = item.gross_price !== null && item.gross_price !== undefined;
  const hasNetPrice = item.price !== null && item.price !== undefined;

  return {
    values: {
      item_id: item.id,
      name: item.name,
      ...(hasGrossPrice ? { price: item.gross_price } : hasNetPrice ? { price: item.price } : {}),
      ...(item.description ? { description: item.description } : {}),
      translations: item.translations ?? {},
      unit: item.unit ?? undefined,
      e_invoicing: item.e_invoicing ?? undefined,
      ...(item.classification ? { classification: item.classification } : {}),
      financial_category_id: item.financial_category_id ?? undefined,
      taxes: item.tax_ids?.length ? item.tax_ids.map((tax_id) => ({ tax_id })) : [],
    },
    isGrossPrice: hasGrossPrice,
  };
}

export function buildInitialItemTaxes(isTaxSubject: boolean, hasEntityTaxes: boolean): Array<{ tax_id: undefined }> {
  return isTaxSubject && hasEntityTaxes ? [{ tax_id: undefined }] : [];
}

export function reindexPriceModes(priceModes: PriceModesMap, nextLength: number): PriceModesMap {
  const reindexed: PriceModesMap = {};
  for (let index = 0; index < nextLength; index += 1) {
    reindexed[index] = priceModes[index] ?? false;
  }
  return reindexed;
}

export function appendPriceMode(priceModes: PriceModesMap, nextIndex: number, value = false): PriceModesMap {
  return { ...priceModes, [nextIndex]: value };
}

export function removePriceMode(priceModes: PriceModesMap, currentLength: number, removeIndex: number): PriceModesMap {
  const next: PriceModesMap = {};
  let nextIndex = 0;
  for (let currentIndex = 0; currentIndex < currentLength; currentIndex += 1) {
    if (currentIndex === removeIndex) continue;
    next[nextIndex] = priceModes[currentIndex] ?? false;
    nextIndex += 1;
  }
  return next;
}

export function movePriceMode(
  priceModes: PriceModesMap,
  currentLength: number,
  from: number,
  to: number,
): PriceModesMap {
  const next = reindexPriceModes(priceModes, currentLength);
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
