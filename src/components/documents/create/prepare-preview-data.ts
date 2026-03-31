import type { CreateInvoiceRequest } from "@spaceinvoices/js-sdk";
import { normalizeDateOnlyInput } from "../../../lib/date-only";

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

export function normalizeDocumentPreviewDates<T extends Record<string, any>>(document: T): T {
  return {
    ...document,
    ...(document.date ? { date: normalizeDateOnlyInput(document.date) } : {}),
    ...(document.date_due ? { date_due: normalizeDateOnlyInput(document.date_due) } : {}),
    ...(document.date_valid_till ? { date_valid_till: normalizeDateOnlyInput(document.date_valid_till) } : {}),
    ...(document.date_service ? { date_service: normalizeDateOnlyInput(document.date_service) } : {}),
    ...(document.date_service_to ? { date_service_to: normalizeDateOnlyInput(document.date_service_to) } : {}),
  };
}
