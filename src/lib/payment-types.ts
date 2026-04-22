export const DOCUMENT_PAYMENT_FORM_LABELS = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  check: "Check",
  paypal: "PayPal",
  coupon: "Coupon",
  credit_note: "Credit Note",
  advance: "Advance",
  other: "Other",
} as const;

export const DOCUMENT_PAYMENT_FORM_TYPES = Object.keys(
  DOCUMENT_PAYMENT_FORM_LABELS,
) as Array<keyof typeof DOCUMENT_PAYMENT_FORM_LABELS>;

export function getDocumentPaymentTypeTranslationKey(type: string): string {
  switch (type) {
    case "advance":
      return "advance_payment";
    default:
      return type;
  }
}

export function getDocumentPaymentTypeFallbackLabel(type: string): string {
  switch (type) {
    case "advance":
      return "Advance payment";
    case "paypal":
      return "PayPal";
    case "coupon":
      return "Coupon";
    default:
      return DOCUMENT_PAYMENT_FORM_LABELS[
        type as keyof typeof DOCUMENT_PAYMENT_FORM_LABELS
      ] ?? type;
  }
}
