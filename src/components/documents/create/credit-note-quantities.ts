import type { InvoiceCreditOptions } from "@spaceinvoices/js-sdk";

type SourceLine = { id?: string | null; type?: string | null };
type FormLine = { type?: string | null; quantity?: unknown };

/**
 * Remaining creditable quantity per original invoice line, as the API reports it. The API is
 * the only authority on it: it accounts for earlier partial corrections and voided credits,
 * and it validates the balance again when the credit note is issued.
 */
export type InvoiceCreditRemaining = InvoiceCreditOptions["items"];

function toRemainingByLineId(remaining: InvoiceCreditRemaining): Map<string, number> {
  const byLineId = new Map<string, number>();
  for (const entry of remaining) {
    if (entry?.invoice_item_id) {
      byLineId.set(entry.invoice_item_id, entry.remaining_quantity);
    }
  }
  return byLineId;
}

/**
 * Restrict the lines copied from an invoice to what may still be credited.
 *
 * The source and form line arrays are the same lines in the same order, so each form line is
 * matched to its original by position and then to its remaining quantity by that original's
 * id. Only the quantity is replaced: names, prices, discounts, taxes and exemption wording
 * stay exactly as the invoice states them, because a correction has to reference the values
 * that were invoiced.
 *
 * A line with nothing left to credit is dropped, as is a line the API did not report a
 * balance for — never kept at its full invoiced quantity, which would over-credit. A
 * separator is kept only when a financial line it introduces survives, so the credit note
 * does not carry a heading for a group that no longer exists.
 */
export function applyRemainingCreditQuantities<TForm extends FormLine>(params: {
  sourceItems: SourceLine[] | undefined;
  formItems: TForm[] | undefined;
  remaining: InvoiceCreditRemaining;
}): TForm[] {
  const { sourceItems, formItems, remaining } = params;
  if (!formItems?.length) return [];

  const remainingByLineId = toRemainingByLineId(remaining);

  const kept = formItems.map((formItem, index) => {
    if (formItem?.type === "separator") {
      return formItem;
    }

    const lineId = sourceItems?.[index]?.id;
    const remainingQuantity = lineId ? remainingByLineId.get(lineId) : undefined;
    if (!remainingQuantity || remainingQuantity <= 0) {
      return null;
    }

    return { ...formItem, quantity: remainingQuantity };
  });

  // A dropped entry is always a financial line, so a null only means "this group lost a line".
  const groupKeepsALine = (separatorIndex: number) => {
    for (let index = separatorIndex + 1; index < kept.length; index++) {
      const next = kept[index];
      if (next === null) continue;
      if (next.type === "separator") return false;
      return true;
    }
    return false;
  };

  return kept.filter((item, index): item is TForm => {
    if (item === null) return false;
    if (item.type !== "separator") return true;

    return groupKeepsALine(index);
  });
}

/** Whether any financial line remains, so there is something for a credit note to correct. */
export function hasCreditableLines(items: readonly FormLine[] | undefined): boolean {
  return !!items?.some((item) => item?.type !== "separator");
}
