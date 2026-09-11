/**
 * Generic card method, kept because payments already recorded with it must stay readable
 * and editable. It is not offered for a new choice: a document reports which card product
 * was used, and only the person taking the payment knows that.
 */
export const GENERIC_CARD_PAYMENT_TYPE = "card";

export const DOCUMENT_PAYMENT_FORM_LABELS = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  check: "Check",
  paypal: "PayPal",
  coupon: "Coupon",
  credit_note: "Credit Note",
  advance: "Advance",
  other: "Other",
} as const;

/**
 * The methods a standalone payment form offers. Credit and debit card are the shared
 * choices everywhere, because the API accepts them for every country and they carry the
 * distinction Portugal and other fiscal exports report. The generic `card` is deliberately
 * absent: `getPaymentTypeOptions` puts it back when the payment being edited already uses it.
 */
export const DOCUMENT_PAYMENT_FORM_TYPES = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
  "check",
  "paypal",
  "coupon",
  "credit_note",
  "advance",
  "other",
] as const satisfies ReadonlyArray<keyof typeof DOCUMENT_PAYMENT_FORM_LABELS>;

export type DocumentPaymentFormType = (typeof DOCUMENT_PAYMENT_FORM_TYPES)[number];

/**
 * The payment methods to offer, given the method already recorded on the payment being
 * edited. That method stays selectable even when it is no longer offered for a new choice,
 * so opening an existing generic card payment never silently relabels it as credit or debit.
 * Changing it is then an explicit act by the user.
 */
export function getPaymentTypeOptions(
  baseTypes: readonly string[],
  options: { currentType?: string | null } = {},
): string[] {
  const { currentType } = options;
  const resolved = [...baseTypes];

  if (currentType && !resolved.includes(currentType)) {
    resolved.push(currentType);
  }

  return resolved;
}

/**
 * Translation key for a payment method in the forms, which key their copy on the
 * human-readable English label. An unknown method falls back to its own value so a method
 * added by the API is still shown instead of rendering blank.
 */
export function getDocumentPaymentTypeLabelKey(type: string): string {
  return DOCUMENT_PAYMENT_FORM_LABELS[type as keyof typeof DOCUMENT_PAYMENT_FORM_LABELS] ?? type;
}

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
      return DOCUMENT_PAYMENT_FORM_LABELS[type as keyof typeof DOCUMENT_PAYMENT_FORM_LABELS] ?? type;
  }
}
