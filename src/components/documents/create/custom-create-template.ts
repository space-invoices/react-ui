type CustomCreateTemplate = {
  items: any[];
  total: number;
  total_with_tax: number;
  total_discount?: number | null;
  taxes?: any[];
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sanitizeItemTaxes(taxes: any[] | undefined): any[] {
  return (taxes ?? []).map((tax) => ({
    tax_id: tax?.tax_id ?? undefined,
    rate: tax?.rate ?? undefined,
    classification: tax?.classification ?? undefined,
    reverse_charge: tax?.reverse_charge ?? false,
    pt_exemption_code: tax?.pt_exemption_code ?? undefined,
    pt_exemption_reason: tax?.pt_exemption_reason ?? undefined,
  }));
}

function sanitizeDiscounts(discounts: any[] | undefined): any[] {
  return (discounts ?? []).map((discount) => ({
    value: discount?.value,
    type: discount?.type ?? undefined,
  }));
}

function getTaxIdentityKey(tax: any): string {
  return JSON.stringify({
    rate: tax?.rate ?? null,
    reverse_charge: tax?.reverse_charge ?? false,
  });
}

function collectResolvedItemTaxIds(items: any[] | undefined): Map<string, Set<string>> {
  const taxIdsByKey = new Map<string, Set<string>>();

  for (const item of items ?? []) {
    if (item?.type === "separator") continue;

    for (const tax of item?.taxes ?? []) {
      if (!tax?.tax_id) continue;

      const key = getTaxIdentityKey(tax);
      const existing = taxIdsByKey.get(key);
      if (existing) {
        existing.add(tax.tax_id);
      } else {
        taxIdsByKey.set(key, new Set([tax.tax_id]));
      }
    }
  }

  return taxIdsByKey;
}

export function toCustomCreateItem(item: any): any {
  if (item?.type === "separator") {
    return {
      type: "separator",
      name: item?.name,
      description: item?.description ?? undefined,
    };
  }

  return {
    type: item?.type ?? undefined,
    item_id: item?.item_id ?? undefined,
    name: item?.name,
    description: item?.description ?? undefined,
    classification: item?.classification ?? undefined,
    price: item?.price ?? undefined,
    gross_price: item?.gross_price ?? undefined,
    quantity: item?.quantity ?? undefined,
    unit: item?.unit ?? undefined,
    taxes: sanitizeItemTaxes(item?.taxes),
    discounts: sanitizeDiscounts(item?.discounts),
    total: item?.total ?? undefined,
    total_with_tax: item?.total_with_tax ?? undefined,
    metadata: item?.metadata ?? undefined,
  };
}

export function sanitizeSummaryTaxes(taxes: any[] | undefined, items?: any[]): any[] {
  const resolvedItemTaxIds = collectResolvedItemTaxIds(items);

  return (taxes ?? []).map((tax) => ({
    tax_id:
      tax?.tax_id ??
      (() => {
        const candidates = resolvedItemTaxIds.get(getTaxIdentityKey(tax));
        if (!candidates || candidates.size !== 1) return undefined;
        return Array.from(candidates)[0];
      })(),
    rate: tax?.rate ?? null,
    base: tax?.base ?? 0,
    amount: tax?.amount ?? 0,
    reverse_charge: tax?.reverse_charge ?? false,
  }));
}

function getSummaryTaxKey(tax: any): string {
  return JSON.stringify({
    tax_id: tax?.tax_id ?? null,
    rate: tax?.rate ?? null,
    reverse_charge: tax?.reverse_charge ?? false,
  });
}

export function sumSummaryTaxes(documents: Array<{ taxes?: any[]; items?: any[] }>): any[] {
  const aggregated = new Map<string, any>();

  for (const document of documents) {
    for (const tax of sanitizeSummaryTaxes(document.taxes, document.items)) {
      const key = getSummaryTaxKey(tax);
      const existing = aggregated.get(key);
      if (existing) {
        existing.base = round2(existing.base + tax.base);
        existing.amount = round2(existing.amount + tax.amount);
      } else {
        aggregated.set(key, { ...tax });
      }
    }
  }

  return Array.from(aggregated.values());
}

export function buildCustomCreateTemplateFromDocument(document: any): CustomCreateTemplate {
  return {
    items: (document?.items ?? []).map(toCustomCreateItem),
    total: document?.total ?? 0,
    total_with_tax: document?.total_with_tax ?? 0,
    total_discount: document?.total_discount ?? 0,
    taxes: sanitizeSummaryTaxes(document?.taxes, document?.items),
  };
}

export function applyCustomCreateTemplate<T extends Record<string, any>>(payload: T, template: CustomCreateTemplate): T {
  const { calculation_mode: _calculationMode, ...restPayload } = payload;

  return {
    ...restPayload,
    items: template.items,
    total: template.total,
    total_with_tax: template.total_with_tax,
    total_discount: template.total_discount ?? 0,
    taxes: template.taxes ?? [],
  } as unknown as T;
}
