import type { PriceModesMap } from "./document-items-section";

export const REGULAR_PAYMENT_TYPES = ["cash", "bank_transfer", "card", "check", "other"] as const;

export type RegularPaymentType = (typeof REGULAR_PAYMENT_TYPES)[number];

export type DraftPaymentRow = {
  id?: string;
  type: RegularPaymentType | null;
  amount: string;
  amountTouched: boolean;
};

export type SerializedPaymentRow = {
  type: RegularPaymentType;
  amount: number;
};

export type PaymentRowsEvaluation = {
  payments: SerializedPaymentRow[];
  totalAmount: number;
  hasTypeError: boolean;
  hasAmountError: boolean;
  exceedsTotal: boolean;
  requiresFullAmount: boolean;
  totalMatchesExactly: boolean;
};

export type PaymentRowsValidationMode = "partial_allowed" | "full_required";

export type PaymentRowsValidation = {
  typeError?: string;
  amountError?: string;
  totalError?: string;
  payments: SerializedPaymentRow[];
  totalAmount: number;
};

export function getPaymentValidationMessage(
  evaluation: PaymentRowsEvaluation,
  options?: { requireFullAmount?: boolean },
): string | undefined {
  if (evaluation.hasTypeError) {
    return "Please select a payment type";
  }

  if (evaluation.exceedsTotal) {
    return "Payment amounts cannot exceed the document total";
  }

  if (options?.requireFullAmount && !evaluation.totalMatchesExactly) {
    return "Advance invoices must be fully paid";
  }

  if (evaluation.hasAmountError) {
    return "Payment amount must be greater than 0";
  }

  return undefined;
}

export function getFirstValidPaymentType(paymentRows: DraftPaymentRow[]): RegularPaymentType | undefined {
  return paymentRows.find((row) => isValidPaymentTypeSelection(row.type))?.type ?? undefined;
}

export function createEmptyPaymentRow(): DraftPaymentRow {
  return { id: crypto.randomUUID(), type: null, amount: "", amountTouched: false };
}

export function coercePaymentRowsToType(paymentRows: DraftPaymentRow[], type: RegularPaymentType): DraftPaymentRow[] {
  if (paymentRows.length === 0) {
    return [{ ...createEmptyPaymentRow(), type }];
  }

  return paymentRows.map((row) => ({
    ...row,
    type,
  }));
}

export function isValidPaymentTypeSelection(value: string | null | undefined): value is RegularPaymentType {
  return REGULAR_PAYMENT_TYPES.includes(value as RegularPaymentType);
}

export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function formatAmountInput(amount: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return "";
  return amount.toFixed(2);
}

export function parsePaymentAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;

  return roundCurrency(parsed);
}

export function calculateDocumentTotal(items: any[] | undefined, priceModes: PriceModesMap = {}): number {
  if (!items?.length) return 0;

  const total = items.reduce((sum, item, index) => {
    if (!item || item.type === "separator") return sum;

    const quantity = Number(item.quantity ?? 0);
    const price = Number(item.price ?? 0);
    if (!Number.isFinite(quantity) || !Number.isFinite(price) || quantity <= 0 || price <= 0) {
      return sum;
    }

    const lineBase = quantity * price;
    const isGrossPrice = priceModes[index] ?? false;
    const taxMultiplier =
      1 +
      (Array.isArray(item.taxes)
        ? item.taxes.reduce((taxSum: number, tax: any) => taxSum + Number(tax?.rate ?? 0), 0) / 100
        : 0);

    return sum + (isGrossPrice ? lineBase : lineBase * taxMultiplier);
  }, 0);

  return roundCurrency(total);
}

export function derivePaymentAmounts(paymentRows: DraftPaymentRow[], documentTotal: number): Array<number | null> {
  const resolved = Array<number | null>(paymentRows.length).fill(null);
  const untouchedIndexes: number[] = [];
  let touchedTotal = 0;

  paymentRows.forEach((row, index) => {
    if (!row.amountTouched) {
      untouchedIndexes.push(index);
      return;
    }

    const parsed = parsePaymentAmount(row.amount);
    resolved[index] = parsed;
    if (parsed != null) {
      touchedTotal += parsed;
    }
  });

  const roundedTotal = roundCurrency(documentTotal);
  const remaining = roundCurrency(roundedTotal - touchedTotal);

  if (untouchedIndexes.length === 0) {
    return resolved;
  }

  if (remaining <= 0) {
    untouchedIndexes.forEach((index) => {
      resolved[index] = 0;
    });
    return resolved;
  }

  const equalShare = roundCurrency(remaining / untouchedIndexes.length);
  let allocated = 0;

  untouchedIndexes.forEach((index, arrayIndex) => {
    if (arrayIndex === untouchedIndexes.length - 1) {
      resolved[index] = roundCurrency(remaining - allocated);
      return;
    }

    resolved[index] = equalShare;
    allocated = roundCurrency(allocated + equalShare);
  });

  return resolved;
}

export const derivePaymentRowAmounts = derivePaymentAmounts;

export function getDisplayPaymentAmount(row: DraftPaymentRow, derivedAmount: number | null): string {
  return row.amountTouched ? row.amount : formatAmountInput(derivedAmount);
}

export function getRecordedPaymentTotal(paymentRows: DraftPaymentRow[], documentTotal: number): number {
  const resolvedAmounts = derivePaymentAmounts(paymentRows, documentTotal);
  return roundCurrency(
    resolvedAmounts.reduce<number>((sum, amount) => sum + (amount != null && amount > 0 ? amount : 0), 0),
  );
}

export function evaluatePaymentRows(
  paymentRows: DraftPaymentRow[],
  documentTotal: number,
  options?: { requireFullAmount?: boolean },
): PaymentRowsEvaluation {
  const resolvedAmounts = derivePaymentAmounts(paymentRows, documentTotal);
  const payments: SerializedPaymentRow[] = [];
  let hasTypeError = false;
  let hasAmountError = false;

  paymentRows.forEach((row, index) => {
    if (!isValidPaymentTypeSelection(row.type)) {
      hasTypeError = true;
      return;
    }

    const amount = resolvedAmounts[index];
    if (amount == null || amount <= 0) {
      hasAmountError = true;
      return;
    }

    payments.push({ type: row.type, amount });
  });

  const totalAmount = roundCurrency(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const roundedTotal = roundCurrency(documentTotal);
  const exceedsTotal = totalAmount > roundedTotal;
  const requireFullAmount = options?.requireFullAmount === true;
  const totalMatchesExactly = totalAmount === roundedTotal;

  if (exceedsTotal) {
    hasAmountError = true;
  }

  if (requireFullAmount && !totalMatchesExactly) {
    hasAmountError = true;
  }

  return {
    payments,
    totalAmount,
    hasTypeError,
    hasAmountError,
    exceedsTotal,
    requiresFullAmount: requireFullAmount,
    totalMatchesExactly,
  };
}

export function validatePaymentRows(
  paymentRows: DraftPaymentRow[],
  documentTotal: number,
  mode: PaymentRowsValidationMode,
): PaymentRowsValidation {
  const evaluation = evaluatePaymentRows(paymentRows, documentTotal, {
    requireFullAmount: mode === "full_required",
  });

  if (evaluation.hasTypeError) {
    return {
      payments: evaluation.payments,
      totalAmount: evaluation.totalAmount,
      typeError: "Please select a payment type",
    };
  }

  if (evaluation.exceedsTotal) {
    return {
      payments: evaluation.payments,
      totalAmount: evaluation.totalAmount,
      totalError: "Payment amounts cannot exceed the document total",
    };
  }

  if (mode === "full_required" && !evaluation.totalMatchesExactly) {
    return {
      payments: evaluation.payments,
      totalAmount: evaluation.totalAmount,
      totalError: "Advance invoices must be fully paid",
    };
  }

  if (evaluation.hasAmountError) {
    return {
      payments: evaluation.payments,
      totalAmount: evaluation.totalAmount,
      amountError: "Payment amount must be greater than 0",
    };
  }

  return {
    payments: evaluation.payments,
    totalAmount: evaluation.totalAmount,
  };
}

export function serializePaymentRows(paymentRows: DraftPaymentRow[], documentTotal: number): SerializedPaymentRow[] {
  return evaluatePaymentRows(paymentRows, documentTotal).payments;
}
