import type { CreateAdvanceInvoiceRequest } from "@spaceinvoices/js-sdk";
import type { CreateAdvanceInvoiceSchema } from "@/ui/generated/schemas";
import { prepareDocumentSubmission } from "../../documents/create/prepare-document-submission";

type FursData = {
  business_premise_name?: string;
  electronic_device_name?: string;
  skip?: boolean;
};

type FinaData = {
  premise_id?: string;
  device_id?: string;
  payment_type?: string;
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
 * Prepares advance invoice form data for API submission
 * Handles customer data transformation, payment data, and FURS fiscalization
 */
export function prepareAdvanceInvoiceSubmission(
  values: CreateAdvanceInvoiceSchema,
  options: PrepareOptions,
): CreateAdvanceInvoiceRequest {
  const payload = prepareDocumentSubmission(values as any, {
    originalCustomer: options.originalCustomer,
    wasCustomerFormShown: options.wasCustomerFormShown,
    markAsPaid: options.markAsPaid,
    paymentTypes: options.paymentTypes,
    documentType: "advance_invoice",
    secondaryDate: values.date_due ?? undefined,
    priceModes: options.priceModes,
    isDraft: options.isDraft,
  }) as CreateAdvanceInvoiceRequest;

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
      };
    }
  }

  // Add FINA data if provided (FINA can't be skipped - all invoices must be fiscalized)
  if (options.fina?.premise_id && options.fina.device_id) {
    (payload as any).fina = {
      premise_id: options.fina.premise_id,
      device_id: options.fina.device_id,
      ...(options.fina.payment_type && { payment_type: options.fina.payment_type }),
    };
  }

  // Add e-SLOG data if provided
  if (options.eslog !== undefined) {
    (payload as any).eslog = {
      validation_enabled: options.eslog.validation_enabled,
    };
  }

  return payload;
}
