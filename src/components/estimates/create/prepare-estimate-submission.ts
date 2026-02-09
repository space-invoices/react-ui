import type { CreateEstimateRequest } from "@spaceinvoices/js-sdk";
import type { CreateEstimateSchema } from "@/ui/generated/schemas";
import { prepareDocumentSubmission } from "../../documents/create/prepare-document-submission";
import type { CustomerData } from "../../documents/create/use-document-customer-form";

/** Map of item index to gross price mode */
type PriceModesMap = Record<number, boolean>;

type PrepareOptions = {
  originalCustomer: CustomerData | null;
  /** Map of item index to gross price mode (collected from component state) */
  priceModes?: PriceModesMap;
  /** Title type: "estimate" or "quote" */
  titleType?: "estimate" | "quote";
  /** Whether to save as draft (skips numbering) */
  isDraft?: boolean;
};

/**
 * Prepares estimate form data for API submission
 * Handles customer data transformation (no payment data for estimates)
 */
export function prepareEstimateSubmission(
  values: CreateEstimateSchema,
  options: PrepareOptions,
): CreateEstimateRequest {
  const baseSubmission = prepareDocumentSubmission(values, {
    originalCustomer: options.originalCustomer,
    documentType: "estimate",
    secondaryDate: values.date_valid_till ?? undefined,
    priceModes: options.priceModes,
    isDraft: options.isDraft,
  }) as CreateEstimateRequest;

  return {
    ...baseSubmission,
    title_type: options.titleType,
  };
}
