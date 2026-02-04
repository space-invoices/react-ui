import type { CreateInvoiceRequest } from "@spaceinvoices/js-sdk";

type ItemWithTaxes = NonNullable<CreateInvoiceRequest["items"]>[number];

/**
 * Filters out items with unresolved tax_ids before sending to preview API.
 *
 * This handles a race condition where the form may add `{ tax_id: undefined }`
 * for tax subject entities before the tax dropdown has auto-selected a value.
 */
export function filterUnresolvedTaxes(items: ItemWithTaxes[] | undefined): ItemWithTaxes[] {
  return (items || []).map((item) => ({
    ...item,
    taxes: (item.taxes || []).filter((tax) => tax.tax_id != null),
  }));
}
