type SourceDocumentTax = {
  tax_id?: string | null;
  rate?: number | null;
  classification?: string | null;
  reverse_charge?: boolean | null;
  pt_exemption_code?: string | null;
  pt_exemption_reason?: string | null;
};

type SourceDocumentDiscount = {
  value: number;
  type?: string | null;
};

type SourceDocumentItem = {
  type?: string | null;
  item_id?: string | null;
  name?: string | null;
  description?: string | null;
  quantity?: number | null;
  price?: number | null;
  gross_price?: number | null;
  unit?: string | null;
  classification?: string | null;
  taxes?: SourceDocumentTax[] | null;
  discounts?: SourceDocumentDiscount[] | null;
  metadata?: Record<string, unknown> | null;
};

export function toDocumentFormTaxes(taxes: SourceDocumentTax[] | null | undefined) {
  return (taxes ?? []).map((tax) => ({
    tax_id: tax?.tax_id ?? undefined,
    rate: tax?.rate ?? undefined,
    classification: tax?.classification ?? undefined,
    reverse_charge: tax?.reverse_charge ?? undefined,
    pt_exemption_code: tax?.pt_exemption_code ?? undefined,
    pt_exemption_reason: tax?.pt_exemption_reason ?? undefined,
  }));
}

export function toDocumentFormDiscounts(discounts: SourceDocumentDiscount[] | null | undefined) {
  return (discounts ?? []).map((discount) => ({
    value: discount.value,
    type: discount.type ?? undefined,
  }));
}

export function toDocumentFormItem(item: SourceDocumentItem) {
  return {
    type: item.type ?? undefined,
    name: item.name ?? "",
    description: item.description ?? undefined,
    ...(item.type !== "separator"
      ? {
          item_id: item.item_id ?? undefined,
          quantity: item.quantity ?? 1,
          price: item.gross_price ?? item.price ?? undefined,
          gross_price: item.gross_price ?? undefined,
          unit: item.unit ?? undefined,
          classification: item.classification ?? undefined,
          taxes: toDocumentFormTaxes(item.taxes),
          discounts: toDocumentFormDiscounts(item.discounts),
          metadata: item.metadata ?? undefined,
        }
      : {}),
  };
}
