import { getDisplayDocumentNumber } from "@/ui/lib/document-display";

type TranslateFn = (key: string) => string;

const AUTO_APPLIED_CREDIT_NOTE_TEMPLATE = "Auto-applied credit note for voided invoice {number}";
const AUTO_BILLING_STRIPE_NOTE = "Automatic billing payment via Stripe";
const AUTO_APPLIED_CREDIT_NOTE_REGEX = /^Auto-applied credit note for voided invoice (.+)$/;

type PaymentDocumentLike = {
  Invoice?: { id: string; number: string } | null;
  CreditNote?: { id: string; number: string } | null;
  AdvanceInvoice?: { id: string; number: string } | null;
  IncomingPurchaseDocument?: {
    id: string;
    supplier_document_number?: string | null;
  } | null;
};

export type PaymentDocumentDisplay = {
  id: string;
  label: string;
  isNavigable: boolean;
};

export function getPaymentTypeLabel(type: string, t: TranslateFn): string {
  switch (type) {
    case "cash":
      return t("cash");
    case "bank_transfer":
      return t("bank_transfer");
    case "card":
      return t("card");
    case "check":
      return t("check");
    case "credit_note":
      return t("credit_note");
    case "advance":
      return t("advance_payment");
    case "other":
      return t("other");
    default:
      return type;
  }
}

export function localizePaymentNote(note: string | null | undefined, t: TranslateFn): string | null | undefined {
  if (!note) {
    return note;
  }

  if (note === AUTO_BILLING_STRIPE_NOTE) {
    return t(AUTO_BILLING_STRIPE_NOTE);
  }

  const autoAppliedMatch = note.match(AUTO_APPLIED_CREDIT_NOTE_REGEX);
  if (autoAppliedMatch) {
    return t(AUTO_APPLIED_CREDIT_NOTE_TEMPLATE).replace("{number}", autoAppliedMatch[1] ?? "");
  }

  return note;
}

export function getPaymentDocumentDisplay(payment: PaymentDocumentLike): PaymentDocumentDisplay | null {
  if (payment.Invoice) {
    return {
      id: payment.Invoice.id,
      label: getDisplayDocumentNumber(payment.Invoice, (key) => key),
      isNavigable: true,
    };
  }

  if (payment.CreditNote) {
    return {
      id: payment.CreditNote.id,
      label: getDisplayDocumentNumber(payment.CreditNote, (key) => key),
      isNavigable: true,
    };
  }

  if (payment.AdvanceInvoice) {
    return {
      id: payment.AdvanceInvoice.id,
      label: getDisplayDocumentNumber(payment.AdvanceInvoice, (key) => key),
      isNavigable: true,
    };
  }

  if (payment.IncomingPurchaseDocument) {
    return {
      id: payment.IncomingPurchaseDocument.id,
      label: payment.IncomingPurchaseDocument.supplier_document_number || payment.IncomingPurchaseDocument.id,
      isNavigable: false,
    };
  }

  return null;
}
