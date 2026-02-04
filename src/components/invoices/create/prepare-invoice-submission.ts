import type { CreateInvoiceRequest } from "@spaceinvoices/js-sdk";
import type { CreateInvoiceSchema } from "@/ui/generated/schemas";
import { prepareDocumentSubmission } from "../../documents/create/prepare-document-submission";

type FursData = {
  business_premise_name?: string;
  electronic_device_name?: string;
  skip?: boolean;
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
  paymentType?: string;
  /** FURS fiscalization data (for Slovenia) */
  furs?: FursData;
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
export function prepareInvoiceSubmission(values: CreateInvoiceSchema, options: PrepareOptions): CreateInvoiceRequest {
  const payload = prepareDocumentSubmission(values, {
    originalCustomer: options.originalCustomer,
    wasCustomerFormShown: options.wasCustomerFormShown,
    markAsPaid: options.markAsPaid,
    paymentType: options.paymentType,
    documentType: "invoice",
    secondaryDate: values.date_due,
    priceModes: options.priceModes,
    isDraft: options.isDraft,
  }) as CreateInvoiceRequest;

  // Add service date fields if provided
  if ((values as any).date_service) {
    (payload as any).date_service = new Date((values as any).date_service);
  }
  if ((values as any).date_service_to) {
    (payload as any).date_service_to = new Date((values as any).date_service_to);
  }

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

  // Add e-SLOG data if provided
  if (options.eslog !== undefined) {
    (payload as any).eslog = {
      validation_enabled: options.eslog.validation_enabled,
    };
  }

  return payload;
}
