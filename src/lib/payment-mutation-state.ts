import type { Payment } from "@spaceinvoices/js-sdk";

export function isActiveIssuedDirectAdvancePayment(payment: Payment): boolean {
  return (
    !!payment.advance_invoice_id &&
    !payment.invoice_id &&
    payment.AdvanceInvoice?.is_draft === false &&
    !payment.AdvanceInvoice.voided_at
  );
}
