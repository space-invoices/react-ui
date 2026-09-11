import type { Payment } from "@spaceinvoices/js-sdk";
import { isPortugalEntity } from "@/ui/lib/country-capabilities";

export function isActiveIssuedDirectAdvancePayment(payment: Payment): boolean {
  return (
    !!payment.advance_invoice_id &&
    !payment.invoice_id &&
    payment.AdvanceInvoice?.is_draft === false &&
    !payment.AdvanceInvoice.voided_at
  );
}

/** The lifecycle field a payable document exposes, whatever its type. */
export type PaymentDocumentLifecycle = { voided_at?: string | null };

/** The entity fields the country rule reads, taken from the country owner so they cannot drift. */
type PaymentPolicyEntity = Parameters<typeof isPortugalEntity>[0];

/**
 * Whether the server will refuse to change this document's payments because it is voided.
 *
 * This is a Portuguese rule, not a general one. Portugal closes a voided document: the API
 * refuses to add, edit or delete a payment against a voided invoice, credit note or advance
 * invoice there. Everywhere else voiding leaves the payment ledger open on purpose, so that a
 * voided document can still be reconciled and settled, and those actions must stay available.
 *
 * Recorded payments stay readable in either case — only the mutations are withheld, and only
 * for Portugal.
 */
export function arePaymentMutationsBlockedByVoid(
  document: PaymentDocumentLifecycle | null | undefined,
  entity: PaymentPolicyEntity,
): boolean {
  return !!document?.voided_at && isPortugalEntity(entity);
}

/**
 * The same rule read from a payment row, for lists that hold the payment rather than the document.
 *
 * A payment can hang off any of the three outgoing documents, and each of them carries its own
 * void state on the payment payload, so all three are asked.
 */
export function isPaymentOnVoidedDocument(payment: Payment, entity: PaymentPolicyEntity): boolean {
  return (
    arePaymentMutationsBlockedByVoid(payment.Invoice, entity) ||
    arePaymentMutationsBlockedByVoid(payment.CreditNote, entity) ||
    arePaymentMutationsBlockedByVoid(payment.AdvanceInvoice, entity)
  );
}
