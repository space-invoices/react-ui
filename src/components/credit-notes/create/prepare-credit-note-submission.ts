import type { CreateCreditNoteRequest } from "@spaceinvoices/js-sdk";
import { normalizePtDocumentInput } from "@/ui/lib/pt-document-input";
import { prepareDocumentSubmission } from "../../documents/create/prepare-document-submission";

type PrepareOptions = {
  originalCustomer: any;
  wasCustomerFormShown?: boolean;
  markAsPaid?: boolean;
  paymentTypes?: string[];
  payments?: Array<{ type: string; amount?: number }>;
  priceModes?: Record<number, boolean>;
  isDraft?: boolean;
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
  return payload;
}
