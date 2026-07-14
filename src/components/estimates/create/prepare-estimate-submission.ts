import type { CreateEstimate } from "@spaceinvoices/js-sdk";
import type { CreateEstimateSchema } from "@/ui/generated/schemas";
import { buildDocumentValidationPayload, type DocumentValidationOptions } from "@/ui/lib/document-validation-payload";
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
  /** Title type: "estimate" or "proforma_invoice" */
  titleType?: "estimate" | "proforma_invoice";
  /** Whether to save as draft (skips numbering) */
  isDraft?: boolean;
  /** e-SLOG validation data (for Slovenia) */
  eslog?: DocumentValidationOptions;
};

/**
 * Prepares estimate form data for API submission
 * Handles customer data transformation (no payment data for estimates)
 */
export function prepareEstimateSubmission(
  values: CreateEstimateSchema & { pt?: PtDocumentInputForm | null },
  options: PrepareOptions,
): CreateEstimate {
  const pt = normalizePtDocumentInput(values.pt);
  const baseSubmission = prepareDocumentSubmission(values, {
    originalCustomer: options.originalCustomer,
    documentType: "estimate",
    secondaryDate: values.date_valid_till ?? undefined,
    priceModes: options.priceModes,
    isDraft: options.isDraft,
  }) as CreateEstimate;

  return {
    ...baseSubmission,
    title_type: options.titleType,
    ...(pt ? { pt } : {}),
    ...(options.eslog !== undefined
      ? {
          eslog: buildDocumentValidationPayload(options.eslog),
        }
      : {}),
  };
}

export function prepareEstimateUpdateSubmission(
  values: CreateEstimateSchema & { pt?: PtDocumentInputForm | null },
  options: Pick<PrepareOptions, "originalCustomer" | "priceModes" | "titleType" | "eslog">,
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
      includeCalculationMode: false,
    }),
    ...(options.titleType ? { title_type: options.titleType } : {}),
    ...(options.eslog !== undefined ? { eslog: buildDocumentValidationPayload(options.eslog) } : {}),
  };
}
