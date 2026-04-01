import type { CreateInvoiceRequest } from "@spaceinvoices/js-sdk";
import type { CreateInvoiceSchema } from "@/ui/generated/schemas";
import { normalizePtDocumentInput, type PtDocumentInputForm } from "@/ui/lib/pt-document-input";
import {
  buildDocumentBasePayload,
  cleanupEmptyCustomerId,
  normalizeClearableFormTextField,
  prepareDocumentCustomerData,
  prepareDocumentItems,
  prepareDocumentSubmission,
} from "../../documents/create/prepare-document-submission";

type FursData = {
  business_premise_name?: string;
  electronic_device_name?: string;
  skip?: boolean;
  operator_tax_number?: string;
  operator_label?: string;
};

type FinaData = {
  business_premise_name?: string;
  electronic_device_name?: string;
  payment_type?: string;
  operator_oib?: string;
  operator_label?: string;
};

type EslogData = {
  validation_enabled?: boolean;
};

/** Map of item index to gross price mode */
type PriceModesMap = Record<number, boolean>;

type PrepareOptions = {
  originalCustomer: any;
  wasCustomerFormShown?: boolean;
  markAsPaid?: boolean;
  paymentTypes?: string[];
  payments?: Array<{ type: string; amount?: number }>;
  /** FURS fiscalization data (for Slovenia) */
  furs?: FursData;
  /** FINA fiscalization data (for Croatia) */
  fina?: FinaData;
  /** e-SLOG validation data (for Slovenia) */
  eslog?: EslogData;
  /** Map of item index to gross price mode (collected from component state) */
  priceModes?: PriceModesMap;
  /** Whether to save as draft (skips numbering and fiscalization) */
  isDraft?: boolean;
};

/**
 * Prepares invoice form data for API submission
 * Handles customer data transformation, payment data, and FURS fiscalization
 */
export function prepareInvoiceSubmission(
  values: CreateInvoiceSchema & { pt?: PtDocumentInputForm | null },
  options: PrepareOptions,
): CreateInvoiceRequest {
  const payload = prepareDocumentSubmission(values, {
    originalCustomer: options.originalCustomer,
    wasCustomerFormShown: options.wasCustomerFormShown,
    markAsPaid: options.markAsPaid,
    paymentTypes: options.paymentTypes,
    payments: options.payments,
    documentType: "invoice",
    secondaryDate: values.date_due ?? undefined,
    priceModes: options.priceModes,
    isDraft: options.isDraft,
  }) as CreateInvoiceRequest;

  // Add FURS data if provided
  if (options.furs) {
    if (options.furs.skip) {
      // Skip fiscalization - only send skip flag
      (payload as any).furs = { skip: true };
    } else if (options.furs.business_premise_name && options.furs.electronic_device_name) {
      // Full FURS fiscalization
      (payload as any).furs = {
        business_premise_name: options.furs.business_premise_name,
        electronic_device_name: options.furs.electronic_device_name,
        ...(options.furs.operator_tax_number ? { operator_tax_number: options.furs.operator_tax_number } : {}),
        ...(options.furs.operator_label ? { operator_label: options.furs.operator_label } : {}),
      };
    }
  }

  // Add FINA data if provided (FINA can't be skipped - all invoices must be fiscalized)
  if (options.fina?.business_premise_name && options.fina.electronic_device_name) {
    (payload as any).fina = {
      business_premise_name: options.fina.business_premise_name,
      electronic_device_name: options.fina.electronic_device_name,
      ...(options.fina.payment_type && { payment_type: options.fina.payment_type }),
      ...(options.fina.operator_oib ? { operator_oib: options.fina.operator_oib } : {}),
      ...(options.fina.operator_label ? { operator_label: options.fina.operator_label } : {}),
    };
  }

  // Add e-SLOG data if provided
  if (options.eslog !== undefined) {
    (payload as any).eslog = {
      validation_enabled: options.eslog.validation_enabled,
    };
  }
  const pt = normalizePtDocumentInput(values.pt);
  if (pt) {
    (payload as any).pt = pt;
  }
  return payload;
}

export function prepareInvoiceUpdateSubmission(
  values: CreateInvoiceSchema & { pt?: PtDocumentInputForm | null },
  options: Pick<PrepareOptions, "originalCustomer" | "wasCustomerFormShown" | "priceModes" | "eslog">,
): Record<string, unknown> {
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

  const payload = buildDocumentBasePayload(nextValues, {
    documentType: "invoice",
    secondaryDate: values.date_due ?? undefined,
  });

  if (Array.isArray(nextValues.linked_documents)) {
    payload.linked_documents = nextValues.linked_documents;
  } else if (nextValues.linked_documents === null) {
    payload.linked_documents = [];
  }

  if (nextValues.force_linked_documents !== undefined) {
    payload.force_linked_documents = nextValues.force_linked_documents;
  }

  if (options.eslog !== undefined) {
    payload.eslog = {
      validation_enabled: options.eslog.validation_enabled,
    };
  }

  for (const key of ["note", "payment_terms", "reference", "signature", "tax_clause", "footer"] as const) {
    const normalized = normalizeClearableFormTextField((values as any)[key]);
    if (normalized !== undefined) {
      payload[key] = normalized;
    }
  }

  return payload;
}
