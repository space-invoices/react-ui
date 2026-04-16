import { prepareDocumentItems } from "./prepare-document-submission";

type PriceModesMap = Record<number, boolean>;

type ResolvePreservedExpectedTotalOptions = {
  initialExpectedTotalWithTax?: number | null;
  initialItems?: any[];
  currentItems?: any[];
  initialCurrencyCode?: string | null;
  currentCurrencyCode?: string | null;
  initialCalculationMode?: string | null;
  currentCalculationMode?: string | null;
  initialPriceModes?: PriceModesMap;
  currentPriceModes?: PriceModesMap;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeTaxes(taxes: any[] | undefined): any[] {
  return (taxes ?? []).map((tax) => ({
    tax_id: tax?.tax_id ?? null,
    rate: tax?.rate ?? null,
    classification: tax?.classification ?? null,
    reverse_charge: tax?.reverse_charge ?? false,
    pt_exemption_code: tax?.pt_exemption_code ?? null,
    pt_exemption_reason: tax?.pt_exemption_reason ?? null,
  }));
}

function normalizeDiscounts(discounts: any[] | undefined): any[] {
  return (discounts ?? []).map((discount) => ({
    value: discount?.value ?? null,
    type: discount?.type ?? "percent",
  }));
}

function normalizeComparableItems(items: any[] | undefined, priceModes: PriceModesMap = {}): any[] {
  return (prepareDocumentItems(items, priceModes) ?? []).map((item) => {
    if (item?.type === "separator") {
      return { type: "separator" };
    }

    return {
      type: item?.type ?? null,
      quantity: item?.quantity ?? null,
      price: item?.price ?? null,
      gross_price: item?.gross_price ?? null,
      taxes: normalizeTaxes(item?.taxes),
      discounts: normalizeDiscounts(item?.discounts),
    };
  });
}

export function financialInputsMatchInitial(
  options: Omit<ResolvePreservedExpectedTotalOptions, "initialExpectedTotalWithTax">,
): boolean {
  if ((options.initialCurrencyCode ?? null) !== (options.currentCurrencyCode ?? null)) {
    return false;
  }

  if ((options.initialCalculationMode ?? null) !== (options.currentCalculationMode ?? null)) {
    return false;
  }

  const initialComparableItems = normalizeComparableItems(options.initialItems, options.initialPriceModes);
  const currentComparableItems = normalizeComparableItems(options.currentItems, options.currentPriceModes);

  return JSON.stringify(initialComparableItems) === JSON.stringify(currentComparableItems);
}

export function resolvePreservedExpectedTotal(options: ResolvePreservedExpectedTotalOptions): number | undefined {
  const initialExpectedTotalWithTax = options.initialExpectedTotalWithTax;
  if (initialExpectedTotalWithTax == null) {
    return undefined;
  }

  return financialInputsMatchInitial(options) ? initialExpectedTotalWithTax : undefined;
}

export function totalsDifferByCents(left: number | null | undefined, right: number | null | undefined): boolean {
  if (left == null || right == null) {
    return false;
  }

  return Math.round(left * 100) !== Math.round(right * 100);
}

export function roundMoney(value: number): number {
  return round2(value);
}
