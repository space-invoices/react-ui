import type { CreateDeliveryNoteRequest } from "@spaceinvoices/js-sdk";
import type { CreateDeliveryNoteSchema } from "@/ui/generated/schemas";
import { prepareDocumentSubmission } from "../../documents/create/prepare-document-submission";
import type { CustomerData } from "../../documents/create/use-document-customer-form";

/** Map of item index to gross price mode */
type PriceModesMap = Record<number, boolean>;

type PrepareOptions = {
  originalCustomer: CustomerData | null;
  /** Map of item index to gross price mode (collected from component state) */
  priceModes?: PriceModesMap;
  /** Whether to save as draft (skips numbering) */
  isDraft?: boolean;
  /** Whether to hide prices on the delivery note */
  hidePrices?: boolean;
};

/**
 * Prepares delivery note form data for API submission
 * Handles customer data transformation (no payment data for delivery notes)
 */
export function prepareDeliveryNoteSubmission(
  values: CreateDeliveryNoteSchema,
  options: PrepareOptions,
): CreateDeliveryNoteRequest {
  const baseSubmission = prepareDocumentSubmission(values, {
    originalCustomer: options.originalCustomer,
    documentType: "delivery_note",
    priceModes: options.priceModes,
    isDraft: options.isDraft,
  }) as CreateDeliveryNoteRequest;

  return {
    ...baseSubmission,
    ...(options.hidePrices !== undefined && { hide_prices: options.hidePrices }),
  };
}
