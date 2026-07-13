import { normalizeDateOnlyInput } from "../../../lib/date-only";

type CustomerData = {
  name?: string | null;
  email?: string | null;
  address?: string | null;
  address_2?: string | null;
  post_code?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  country_code?: string | null;
  tax_number?: string | null;
  company_number?: string | null;
  bank_accounts?: Array<Record<string, unknown>> | null;
  is_end_consumer?: boolean | null;
  ujp?: {
    receiver_name?: string | null;
    receiver_identifier?: string | null;
    receiver_agent?: string | null;
    receiver_mailbox?: string | null;
  } | null;
  e_invoicing?: {
    buyer_reference?: string | null;
  } | null;
  save_customer?: boolean | null;
};

type BaseDocumentValues = {
  number?: string;
  date?: string;
  business_unit_id?: string | null;
  customer_id?: string | null;
  customer?: CustomerData | null;
  translations?: Record<string, unknown> | null;

  items?: any[];
  currency_code?: string;
};

/** Map of item index to gross price mode */
type PriceModesMap = Record<number, boolean>;

type PrepareDocumentOptions = {
  /** Original customer data for comparison (to detect modifications) */
  originalCustomer: CustomerData | null;
  /** Whether the customer form was shown to the user */
  wasCustomerFormShown?: boolean;
  /** For invoices/credit notes: whether to mark as paid */
  markAsPaid?: boolean;
  /** For invoices/credit notes: payment types when markAsPaid is true */
  paymentTypes?: string[];
  /** Structured payments when amounts were already normalized by the form layer */
  payments?: Array<{ type: string; amount?: number }>;
  /** Document type for specific date handling */
  documentType: "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";
  /** Secondary date field value (date_due for invoices, date_valid_till for estimates) */
  secondaryDate?: string;
  /** Map of item index to gross price mode (collected from component state) */
  priceModes?: PriceModesMap;
  /** Whether to save as draft (skips numbering and fiscalization) */
  isDraft?: boolean;
};

const CLEARABLE_TEXT_FIELDS = ["note", "payment_terms", "reference", "signature", "tax_clause", "footer"] as const;
function cleanCustomerBankAccounts(bankAccounts: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return bankAccounts
    .map((account) => {
      const cleanedAccount = Object.fromEntries(
        Object.entries(account).filter(([, value]) => value !== "" && value !== null && value !== undefined),
      );
      if (Object.keys(cleanedAccount).some((key) => key !== "type") && !cleanedAccount.type) {
        cleanedAccount.type = "iban";
      }
      return cleanedAccount;
    })
    .filter((account) => Object.keys(account).some((key) => key !== "type"));
}

function cleanCustomerPayload(customer: CustomerData, originalCustomer?: CustomerData | null): Record<string, unknown> {
  const cleanedCustomer: Record<string, unknown> = { save_customer: true };

  for (const [key, value] of Object.entries(customer)) {
    if (key === "save_customer" || value === undefined) {
      continue;
    }

    if (value === null) {
      if (originalCustomer) {
        cleanedCustomer[key] = null;
      }
      continue;
    }

    if (value === "") {
      if (originalCustomer && (originalCustomer as Record<string, unknown>)[key]) {
        cleanedCustomer[key] = null;
      }
      continue;
    }

    if (key === "bank_accounts" && Array.isArray(value)) {
      const cleanedBankAccounts = cleanCustomerBankAccounts(value);
      if (cleanedBankAccounts.length > 0) {
        cleanedCustomer.bank_accounts = cleanedBankAccounts;
      }
      continue;
    }

    if (key === "ujp" && typeof value === "object" && !Array.isArray(value)) {
      const cleanedUjp = Object.fromEntries(
        Object.entries(value).filter(
          ([, nestedValue]) => nestedValue !== "" && nestedValue !== null && nestedValue !== undefined,
        ),
      );
      if (Object.keys(cleanedUjp).length > 0) {
        cleanedCustomer.ujp = cleanedUjp;
      }
      continue;
    }

    if (key === "e_invoicing" && typeof value === "object" && !Array.isArray(value)) {
      const cleanedEInvoicing = Object.fromEntries(
        Object.entries(value).filter(
          ([, nestedValue]) => nestedValue !== "" && nestedValue !== null && nestedValue !== undefined,
        ),
      );
      if (Object.keys(cleanedEInvoicing).length > 0) {
        cleanedCustomer.e_invoicing = cleanedEInvoicing;
      }
      continue;
    }

    cleanedCustomer[key] = value;
  }

  return cleanedCustomer;
}

function cleanItemEInvoicingPayload(eInvoicing: unknown): Record<string, unknown> | undefined {
  if (!eInvoicing || typeof eInvoicing !== "object" || Array.isArray(eInvoicing)) {
    return undefined;
  }

  if (Object.hasOwn(eInvoicing, "unit_code")) {
    const unitCode = (eInvoicing as { unit_code?: unknown }).unit_code;
    if (typeof unitCode !== "string") {
      return { unit_code: null };
    }

    const trimmedUnitCode = unitCode.trim();
    return trimmedUnitCode ? { unit_code: trimmedUnitCode } : { unit_code: null };
  }

  const cleanedEInvoicing = Object.fromEntries(
    Object.entries(eInvoicing).filter(
      ([, nestedValue]) => nestedValue !== "" && nestedValue !== null && nestedValue !== undefined,
    ),
  );

  return Object.keys(cleanedEInvoicing).length > 0 ? cleanedEInvoicing : undefined;
}

function customerPayloadHasAnyValue(customer: Record<string, unknown>): boolean {
  return Object.keys(customer).some((key) => key !== "save_customer");
}

export function normalizeClearableFormTextField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function prepareDocumentCustomerData<T extends BaseDocumentValues>(
  nextValues: T & { customer?: CustomerData | null; customer_id?: string | null },
  options: Pick<PrepareDocumentOptions, "originalCustomer" | "wasCustomerFormShown">,
): void {
  if (nextValues.customer_id && nextValues.customer) {
    if (options.wasCustomerFormShown === false) {
      delete nextValues.customer;
    } else {
      const cleanedCustomer = cleanCustomerPayload(nextValues.customer, options.originalCustomer);
      nextValues.customer = cleanedCustomer;
    }
  } else if (nextValues.customer) {
    const cleanedCustomer = cleanCustomerPayload(nextValues.customer);

    if (!customerPayloadHasAnyValue(cleanedCustomer)) {
      delete nextValues.customer;
    } else {
      nextValues.customer = cleanedCustomer;
    }
  }
}

export function cleanupEmptyCustomerId<T extends BaseDocumentValues>(
  nextValues: T & { customer_id?: string | null },
): void {
  if (!nextValues.customer_id) {
    delete nextValues.customer_id;
  }
}

export function prepareDocumentItems(items: any[] | undefined, priceModes: PriceModesMap = {}): any[] | undefined {
  if (!items) {
    return items;
  }

  return items.map((item: any, index: number) => {
    if (item.type === "separator") {
      return {
        type: "separator",
        name: item.name,
        description: item.description || undefined,
        translations: item.translations ?? undefined,
      };
    }

    const price = item.price === "" ? undefined : item.price;
    const gross_price = item.gross_price === "" ? undefined : item.gross_price;
    const quantity = item.quantity === "" ? undefined : item.quantity;
    const isGrossPrice = priceModes[index] ?? false;
    const effectivePrice = price ?? gross_price;
    const priceFields =
      effectivePrice === undefined ? {} : isGrossPrice ? { gross_price: effectivePrice } : { price: effectivePrice };

    // Keep this list aligned with the strict CreateDocumentItemDto payload shape.
    // Saved catalog items can carry read-only fields such as `price_with_tax`,
    // which must not be forwarded when creating documents.
    const preparedItem = {
      type: item.type ?? undefined,
      item_id: item.item_id ?? undefined,
      save_item: item.save_item ?? undefined,
      name: item.name,
      description: item.description ?? undefined,
      translations: item.translations ?? undefined,
      unit: item.unit ?? undefined,
      e_invoicing: cleanItemEInvoicingPayload(item.e_invoicing),
      quantity,
      discounts: item.discounts,
      metadata: item.metadata ?? undefined,
      classification: item.classification ?? undefined,
      financial_category_id: item.financial_category_id ?? undefined,
      ...priceFields,
      taxes: item.taxes
        ?.map((tax: any) => {
          if (tax.tax_id) {
            return {
              tax_id: tax.tax_id,
              ...(tax.pt_exemption_code ? { pt_exemption_code: tax.pt_exemption_code } : {}),
              ...(tax.pt_exemption_reason ? { pt_exemption_reason: tax.pt_exemption_reason } : {}),
            };
          }
          return tax;
        })
        .filter((tax: any) => tax.tax_id || tax.rate !== undefined || tax.classification),
    };

    return Object.fromEntries(Object.entries(preparedItem).filter(([, value]) => value !== undefined));
  });
}

export function buildDocumentBasePayload(
  nextValues: Record<string, any>,
  options: Pick<PrepareDocumentOptions, "documentType" | "secondaryDate"> & { includeCalculationMode?: boolean },
): Record<string, any> {
  const {
    number: _number,
    calculation_mode,
    business_unit_id,
    translations,
    note,
    payment_terms,
    reference,
    signature,
    tax_clause,
    footer,
    pt: _pt,
    ...restValues
  } = nextValues;

  const payload: Record<string, any> = {
    ...restValues,
    date: normalizeDateOnlyInput(nextValues.date),
  };

  if (options.includeCalculationMode !== false && calculation_mode !== undefined) {
    payload.calculation_mode = calculation_mode;
  }

  if (business_unit_id !== undefined) {
    payload.business_unit_id = business_unit_id || null;
  }

  if (translations && Object.keys(translations).length > 0) {
    payload.translations = translations;
  }

  for (const [key, value] of Object.entries({
    note,
    payment_terms: options.documentType !== "advance_invoice" ? payment_terms : undefined,
    reference,
    signature,
    tax_clause,
    footer,
  })) {
    const normalized = normalizeClearableFormTextField(value);
    if (normalized !== undefined) {
      payload[key] = normalized;
    }
  }

  if ((options.documentType === "invoice" || options.documentType === "advance_invoice") && options.secondaryDate) {
    payload.date_due = normalizeDateOnlyInput(options.secondaryDate);
  } else if (options.documentType === "estimate" && options.secondaryDate) {
    payload.date_valid_till = normalizeDateOnlyInput(options.secondaryDate);
  }

  if (options.documentType === "invoice" || options.documentType === "credit_note") {
    if (nextValues.date_service) {
      payload.date_service = normalizeDateOnlyInput(nextValues.date_service);
    }
    if (nextValues.date_service_to) {
      payload.date_service_to = normalizeDateOnlyInput(nextValues.date_service_to);
    }
  }

  return payload;
}

function normalizeComparablePayloadValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const normalizedArray = value
      .map(normalizeComparablePayloadValue)
      .filter((nestedValue) => nestedValue !== undefined);
    return normalizedArray.length > 0 ? normalizedArray : undefined;
  }

  if (value === "") {
    return undefined;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const nestedValue = (value as Record<string, unknown>)[key];
    const normalizedNestedValue = normalizeComparablePayloadValue(nestedValue);
    if (normalizedNestedValue === undefined) continue;
    normalized[key] = normalizedNestedValue;
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function omitUnchangedUpdatePayloadFields(
  payload: Record<string, unknown>,
  baselinePayload: Record<string, unknown>,
): void {
  for (const key of Object.keys(payload)) {
    if (
      JSON.stringify(normalizeComparablePayloadValue(payload[key])) ===
      JSON.stringify(normalizeComparablePayloadValue(baselinePayload[key]))
    ) {
      delete payload[key];
    }
  }
}

/**
 * Prepares document form data for API submission.
 * Handles customer data transformation and payment data for all document types.
 *
 * This is a shared utility for invoices, estimates, and credit notes.
 *
 * @example
 * ```ts
 * // For invoice
 * const payload = prepareDocumentSubmission(values, {
 *   originalCustomer,
 *   wasCustomerFormShown: showCustomerForm,
 *   markAsPaid: values.markAsPaid,
 *   paymentType: values.paymentType,
 *   documentType: "invoice",
 *   secondaryDate: values.date_due,
 * });
 *
 * // For estimate
 * const payload = prepareDocumentSubmission(values, {
 *   originalCustomer,
 *   documentType: "estimate",
 *   secondaryDate: values.date_valid_till,
 * });
 * ```
 */
export function prepareDocumentSubmission<T extends BaseDocumentValues>(
  values: T,
  options: PrepareDocumentOptions,
): any {
  const nextValues: any = {
    ...values,
    customer: values.customer ? { ...values.customer } : values.customer,
    items: values.items
      ? values.items.map((item: any) => ({ ...item, taxes: item?.taxes ? [...item.taxes] : item?.taxes }))
      : values.items,
  };
  prepareDocumentCustomerData(nextValues, options);
  cleanupEmptyCustomerId(nextValues);
  nextValues.items = prepareDocumentItems(nextValues.items, options.priceModes ?? {});
  const payload: any = buildDocumentBasePayload(nextValues, options);

  // Handle markAsPaid for invoices and credit notes
  if (options.documentType !== "estimate" && options.markAsPaid) {
    const serializedPayments =
      options.payments?.map((payment) => ({
        ...payment,
        date: payload.date ?? undefined,
      })) ??
      options.paymentTypes?.map((type: string) => ({
        type,
        date: payload.date ?? undefined,
      })) ??
      [];

    if (serializedPayments.length > 0) {
      payload.payments = serializedPayments;
    }
  }

  // Remove UI-only fields from payload
  delete payload.markAsPaid;
  delete payload.paymentTypes;

  // Add draft flag if requested
  if (options.isDraft) {
    payload.is_draft = true;
  }

  for (const field of CLEARABLE_TEXT_FIELDS) {
    if (payload[field] === undefined || payload[field] === null) {
      delete payload[field];
    }
  }

  return payload;
}
