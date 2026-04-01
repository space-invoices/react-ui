import type { CreateEstimateRequest } from "@spaceinvoices/js-sdk";
import type { CreateEstimateSchema } from "@/ui/generated/schemas";
import { normalizePtDocumentInput, type PtDocumentInputForm } from "@/ui/lib/pt-document-input";
import {
  buildDocumentBasePayload,
  cleanupEmptyCustomerId,
  prepareDocumentCustomerData,
  prepareDocumentItems,
  prepareDocumentSubmission,
} from "../../documents/create/prepare-document-submission";
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
  values: CreateEstimateSchema & { pt?: PtDocumentInputForm | null },
  options: PrepareOptions,
): CreateEstimateRequest {
  const pt = normalizePtDocumentInput(values.pt);
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
    ...(pt ? { pt } : {}),
  };
}

export function prepareEstimateUpdateSubmission(
  values: CreateEstimateSchema & { pt?: PtDocumentInputForm | null },
  options: Pick<PrepareOptions, "originalCustomer" | "priceModes" | "titleType">,
): Record<string, unknown> {
  const nextValues: any = {
    ...values,
    customer: values.customer ? { ...values.customer } : values.customer,
    items: values.items
      ? values.items.map((item: any) => ({ ...item, taxes: item?.taxes ? [...item.taxes] : item?.taxes }))
      : values.items,
  };

  prepareDocumentCustomerData(nextValues, {
    originalCustomer: options.originalCustomer,
    wasCustomerFormShown: true,
  });
  cleanupEmptyCustomerId(nextValues);
  nextValues.items = prepareDocumentItems(nextValues.items, options.priceModes ?? {});

  return {
    ...buildDocumentBasePayload(nextValues, {
      documentType: "estimate",
      secondaryDate: values.date_valid_till ?? undefined,
    }),
    ...(options.titleType ? { title_type: options.titleType } : {}),
  };
}
