import type { CreateCreditNoteRequest } from "@spaceinvoices/js-sdk";
import { assignDocumentValidationPayload } from "@/ui/lib/document-validation-payload";
import { normalizePtDocumentInput } from "@/ui/lib/pt-document-input";
import {
  buildDocumentBasePayload,
  cleanupEmptyCustomerId,
  prepareDocumentCustomerData,
  prepareDocumentItems,
  prepareDocumentSubmission,
} from "../../documents/create/prepare-document-submission";

type PrepareOptions = {
  originalCustomer: any;
  wasCustomerFormShown?: boolean;
  markAsPaid?: boolean;
  paymentTypes?: string[];
  payments?: Array<{ type: string; amount?: number }>;
  priceModes?: Record<number, boolean>;
  isDraft?: boolean;
  eslog?: {
    validation_enabled?: boolean;
    validation_required?: boolean;
  };
  ujp?: {
    validation_enabled?: boolean;
    validation_required?: boolean;
  };
  germanEInvoicing?: {
    xrechnung?: {
      validation_enabled?: boolean;
      validation_required?: boolean;
    };
    zugferd?: {
      validation_enabled?: boolean;
      validation_required?: boolean;
    };
  };
};

export function prepareCreditNoteSubmission(values: any, options: PrepareOptions): CreateCreditNoteRequest {
  const payload = prepareDocumentSubmission(values, {
    originalCustomer: options.originalCustomer,
    wasCustomerFormShown: options.wasCustomerFormShown,
    markAsPaid: options.markAsPaid,
    paymentTypes: options.paymentTypes,
    payments: options.payments,
    documentType: "credit_note",
    priceModes: options.priceModes,
    isDraft: options.isDraft,
  }) as CreateCreditNoteRequest;

  const pt = normalizePtDocumentInput(values.pt);
  if (pt) {
    (payload as any).pt = pt;
  }
  assignDocumentValidationPayload(payload, "eslog", options.eslog);
  assignDocumentValidationPayload(payload, "ujp", options.ujp);
  if (options.germanEInvoicing !== undefined) {
    if (options.germanEInvoicing.xrechnung) {
      (payload as any).xrechnung = options.germanEInvoicing.xrechnung;
    }
    if (options.germanEInvoicing.zugferd) {
      (payload as any).zugferd = options.germanEInvoicing.zugferd;
    }
  }
  return payload;
}

export function prepareCreditNoteUpdateSubmission(
  values: any,
  options: Pick<PrepareOptions, "originalCustomer" | "wasCustomerFormShown" | "priceModes" | "eslog" | "ujp">,
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
    documentType: "credit_note",
    includeCalculationMode: false,
  });

  const pt = normalizePtDocumentInput(values.pt);
  if (pt) {
    payload.pt = pt;
  }
  assignDocumentValidationPayload(payload, "eslog", options.eslog);
  assignDocumentValidationPayload(payload, "ujp", options.ujp);

  return payload;
}
